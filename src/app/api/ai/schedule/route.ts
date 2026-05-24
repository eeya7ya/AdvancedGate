import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { auth } from "~/auth";
import { getUserRoadmap, upsertUserRoadmap, addUserApiCost } from "@/lib/db";

const client = new Anthropic();
const MODEL = "claude-haiku-4-5";
const HAIKU_IN = 1.0 / 1_000_000;
const HAIKU_OUT = 5.0 / 1_000_000;

// Generating only the schedule (no other plan fields) keeps the output small,
// so this finishes comfortably inside the 60s limit.
export const maxDuration = 60;

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

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resp = await (client.messages.create as any)({
      model: MODEL,
      max_tokens: 4096,
      system: [
        { type: "text", text: SCHEDULE_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: context }],
    });

    let raw = (resp.content ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((b: any) => b.type === "text")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((b: any) => b.text ?? "")
      .join("")
      .trim();
    if (raw.startsWith("```")) {
      raw = raw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error("[schedule] failed to parse model output");
      return NextResponse.json({ error: "Failed to parse schedule" }, { status: 500 });
    }
    const weeklySchedule = Array.isArray(parsed) ? parsed : parsed.weeklySchedule;
    if (!Array.isArray(weeklySchedule) || weeklySchedule.length === 0) {
      return NextResponse.json({ error: "Empty schedule" }, { status: 500 });
    }

    const usage = resp.usage ?? {};
    const cost = (usage.input_tokens ?? 0) * HAIKU_IN + (usage.output_tokens ?? 0) * HAIKU_OUT;
    if (cost > 0) void addUserApiCost(userId, cost);

    const ok = await upsertUserRoadmap(userId, { ...plan, weeklySchedule });
    if (!ok) {
      return NextResponse.json({ error: "Failed to save schedule" }, { status: 500 });
    }

    console.log(`[schedule] generated ${weeklySchedule.length} weeks for ${userId} → $${cost.toFixed(4)}`);
    return NextResponse.json({ ok: true, weeks: weeklySchedule.length });
  } catch (err) {
    console.error("[schedule] generation error:", err);
    return NextResponse.json({ error: "Schedule generation failed" }, { status: 500 });
  }
}
