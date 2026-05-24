import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { auth } from "~/auth";
import { getUserRoadmap, upsertUserRoadmap, addUserApiCost } from "@/lib/db";

const client = new Anthropic();
const MODEL = "claude-haiku-4-5";
const HAIKU_IN = 1.0 / 1_000_000;
const HAIKU_OUT = 5.0 / 1_000_000;

// Generating only the schedule (no other plan fields) keeps the output small,
// but claim the full 300s window (Fluid Compute) so a slow week never 504s.
export const maxDuration = 300;

const SCHEDULE_SYSTEM_PROMPT = `You build a detailed, day-by-day weekly study schedule for a learner, based on the learning plan context provided. Output ONLY a JSON array (no prose, no markdown fences) of EXACTLY 4 week objects covering the first month.

Each week object:
{
  "week": 1,
  "month": 1,
  "theme": "3-5 word focus for the week (e.g. 'Foundations & Setup')",
  "certification": "Target certification/milestone for this week if applicable, else empty string",
  "days": [ 7 day objects, dayNumber 1..7 ]
}

Each day object:
{
  "dayNumber": 1,
  "label": "2-4 word label (e.g. 'Install & Explore')",
  "task": "Specific, actionable task for the day — concrete enough to start immediately. Reference a real course from the COURSES list when relevant.",
  "type": "study | practice | review | rest",
  "hasQuiz": false,
  "quizTopic": "Specific topic for quiz questions when hasQuiz is true, else empty string",
  "courseRef": "Exact course title from the COURSES list, or empty string",
  "courseUrl": "Exact URL copied from the COURSES list for that course, or empty string",
  "duration": "Xh (e.g. '2h'); '0h' for rest days"
}

RULES:
- Exactly 4 weeks, each with exactly 7 days (dayNumber 1-7).
- Day 6 is typically a Review day, day 7 a Rest day ("0h").
- NEVER set hasQuiz:true on day 1 of a week (no knowledge yet). Set hasQuiz:true on days 3-5 after study sessions; always include a specific quizTopic when hasQuiz is true.
- courseRef/courseUrl MUST match a real course from the COURSES list exactly (copy the URL character-for-character). Use empty strings for review/rest days.
- Week themes should progress logically and align with the learner's phase-1 milestones.
- Match the learner's language (Arabic or English) for all human-readable text (label, task, theme, quizTopic). JSON keys and "type" values stay in English.
- Output ONLY the JSON array — nothing before or after.`;

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const roadmap = await getUserRoadmap(userId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plan = roadmap?.planJson as any;
  if (!plan || plan.type !== "LEARNING_PLAN") {
    return NextResponse.json({ error: "No learning plan found" }, { status: 400 });
  }

  // Compact context — just what the schedule needs, so the call stays small.
  const courses = (plan.courseRecommendations ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((c: any) => `- ${c.title} (${c.platform ?? ""})${c.url ? ` | ${c.url}` : ""}`)
    .join("\n");
  const phase1 = (plan.roadmap ?? [])[0] ?? {};
  const context = `LEARNER: ${plan.profile?.name ?? "Learner"} — ${plan.profile?.summary ?? ""}
TARGET: ${plan.todaysFocus?.topic ?? ""}
TIME PER WEEK: ${(plan.timeAllocation ?? []).map((t: { subject: string; hours: number }) => `${t.subject} ${t.hours}h`).join(", ")}
PHASE 1: ${phase1.phase ?? ""} — ${phase1.goal ?? ""}
PHASE 1 MILESTONES: ${(phase1.milestones ?? []).join("; ")}
COURSES:
${courses || "(none listed)"}

Generate the 4-week schedule now.`;

  // Extract a JSON array from model output that may be wrapped in prose or
  // markdown fences. Returns the parsed value, or null if it can't be parsed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function extractSchedule(raw: string): any[] | null {
    let text = raw.trim();
    if (text.startsWith("```")) {
      text = text.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
    }
    // Prefer the outermost [...] array; fall back to a {weeklySchedule:[...]} object.
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    const candidates: string[] = [];
    if (start !== -1 && end > start) candidates.push(text.slice(start, end + 1));
    candidates.push(text);
    for (const c of candidates) {
      try {
        const parsed = JSON.parse(c);
        const arr = Array.isArray(parsed) ? parsed : parsed?.weeklySchedule;
        if (Array.isArray(arr) && arr.length > 0) return arr;
      } catch {
        // try next candidate
      }
    }
    return null;
  }

  // One Haiku call → parsed schedule. Generous token budget so a full
  // 4-week × 7-day plan (verbose, often Arabic) never truncates mid-JSON,
  // which was the main cause of "generated nothing" failures.
  async function attempt(): Promise<{ schedule: unknown[] | null; cost: number; truncated: boolean }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resp = await (client.messages.create as any)({
      model: MODEL,
      max_tokens: 8192,
      system: [
        { type: "text", text: SCHEDULE_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: context }],
    });
    const raw = (resp.content ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((b: any) => b.type === "text")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((b: any) => b.text ?? "")
      .join("")
      .trim();
    const usage = resp.usage ?? {};
    const cost = (usage.input_tokens ?? 0) * HAIKU_IN + (usage.output_tokens ?? 0) * HAIKU_OUT;
    return { schedule: extractSchedule(raw), cost, truncated: resp.stop_reason === "max_tokens" };
  }

  try {
    let totalCost = 0;
    let weeklySchedule: unknown[] | null = null;
    // Up to 2 attempts — a transient bad/truncated response shouldn't strand
    // the learner. Each attempt logs whether it hit the token ceiling.
    for (let i = 0; i < 2 && !weeklySchedule; i++) {
      const { schedule, cost, truncated } = await attempt();
      totalCost += cost;
      if (truncated) console.error(`[schedule] attempt ${i + 1} hit max_tokens (truncated output)`);
      if (schedule) weeklySchedule = schedule;
      else console.error(`[schedule] attempt ${i + 1} produced no parseable schedule`);
    }

    if (totalCost > 0) void addUserApiCost(userId, totalCost);

    if (!weeklySchedule) {
      return NextResponse.json({ error: "Failed to parse schedule" }, { status: 502 });
    }

    const ok = await upsertUserRoadmap(userId, { ...plan, weeklySchedule });
    if (!ok) {
      return NextResponse.json({ error: "Failed to save schedule" }, { status: 500 });
    }

    console.log(`[schedule] generated ${weeklySchedule.length} weeks for ${userId} → $${totalCost.toFixed(4)}`);
    return NextResponse.json({ ok: true, weeks: weeklySchedule.length });
  } catch (err) {
    console.error("[schedule] generation error:", err);
    return NextResponse.json({ error: "Schedule generation failed" }, { status: 500 });
  }
}
