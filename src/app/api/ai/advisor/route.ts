import Groq from "groq-sdk";
import { NextRequest } from "next/server";
import { auth } from "~/auth";
import { getUserRoadmap, getUserNotes } from "@/lib/db";
import { getTimezoneForCountry, getLocalizedDateTime } from "@/lib/timezone";

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

function buildSystemPrompt(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plan: any,
  notes: Array<{ note: string; category: string }>,
): string {
  const planSummary = plan
    ? `
USER'S SAVED LEARNING PLAN:
- Name: ${plan.profile?.name ?? "Unknown"}
- Country: ${plan.profile?.country ?? "Unknown"}
- Target Market: ${plan.profile?.targetMarket ?? "Unknown"}
- Work Style: ${plan.profile?.workStyle ?? "Unknown"}
- Summary: ${plan.profile?.summary ?? ""}
- Today's Focus: ${plan.todaysFocus?.topic ?? "Not set"}
- Priorities: ${(plan.priorities ?? []).map((p: { topic: string }) => p.topic).join(", ")}
- Time Allocation: ${(plan.timeAllocation ?? []).map((t: { subject: string; hours: number }) => `${t.subject}: ${t.hours}h/week`).join(", ")}
- Courses: ${(plan.courseRecommendations ?? []).map((c: { title: string; platform: string }) => `${c.title} (${c.platform})`).join(", ")}
- Roadmap Phases: ${(plan.roadmap ?? []).map((r: { phase: string; duration: string }) => `${r.phase} (${r.duration})`).join(", ")}
- Next Steps: ${(plan.nextSteps ?? []).join("; ")}
`
    : "USER HAS NO SAVED LEARNING PLAN YET. Encourage them to start an AI Advisor session from the dashboard.";

  const notesSection =
    notes.length > 0
      ? `
USER'S SAVED NOTES & PREFERENCES:
${notes.map((n) => `- [${n.category}] ${n.note}`).join("\n")}
`
      : "USER HAS NO SAVED NOTES YET.";

  const userCountry = plan?.profile?.country ?? "";
  const tz = getTimezoneForCountry(userCountry);
  const now = getLocalizedDateTime(tz);

  return `CURRENT DATE & TIME (${tz}): ${now}
IMPORTANT: You have been provided the current date and time above. NEVER say you don't know the date/time or that you lack real-time access — use the date and time provided confidently in all responses.

You are eSpark AI Chat — a focused, context-aware learning assistant. You have full access to the user's learning plan, saved notes, and preferences. Your job is to help them with questions about:

1. Their specific courses, schedule, and learning path
2. Technical questions related to their field of study
3. University/institution-specific information
4. Modifying their schedule or study approach
5. Career guidance specific to their goals

${planSummary}

${notesSection}

RULES:
- ALWAYS answer DIRECTLY. Give the answer FIRST, then add brief context only if needed. For factual questions (time, date, conversions, definitions): answer in ONE sentence. No preamble, no "Great question!", no multi-paragraph explanation.
- Be warm but BRIEF — friendly does not mean verbose. Short, accurate, human.
- NEVER use filler openers. BANNED phrases: "Great question!", "That's a great point!", "Absolutely!", "Of course!", "Sure!", "Certainly!", "Great!", "Awesome!", "Wonderful!", "No problem!", "Happy to help!", "Of course!" — start every reply directly with the answer or a relevant sentence.
- NEVER repeat yourself across turns. Each reply must add new information or a different angle. Do not restate what you said in a previous message.
- Always respond in the same language the user writes in (Arabic or English)
- Be specific and reference their actual plan data when relevant
- If they ask to change something about their plan, explain what they should do (restart the AI Advisor session from Dashboard for major changes, or use notes for minor preferences)
- If they ask about courses in their field, use their plan context for relevant recommendations
- Never make up data — if you don't know something specific about a university or course, say so
- You are the ongoing chat assistant. For major plan changes, direct them to restart from Dashboard
- For date/time questions: use the current date and timezone provided above. State the answer directly, no disclaimers about "real-time access"
- This is someone's real learning journey — be supportive but always prioritize being helpful and accurate over being wordy`;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  let messages: Array<{ role: "user" | "assistant"; content: string }>;
  try {
    const body = await req.json();
    messages = body.messages;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response("Messages required", { status: 400 });
  }

  const [roadmapData, notes] = await Promise.all([
    getUserRoadmap(session.user.id),
    getUserNotes(session.user.id),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plan = roadmapData?.planJson as any ?? null;
  const systemPrompt = buildSystemPrompt(plan, notes);

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = await client.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          max_tokens: 4096,
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          stream: true,
        });

        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) controller.enqueue(encoder.encode(text));
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
