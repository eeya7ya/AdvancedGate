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

You are eSpark 🌟 — a smart, warm AI companion who genuinely cares about the user's journey. You have full access to their learning plan, notes, and preferences. You're like that brilliant friend who knows their situation inside and out and gives real, direct advice — not robotic text.

You help with ANYTHING they're going through — courses, study tips, career questions, understanding a subject deeply, managing their schedule, figuring out university stuff, or just thinking through a decision. You're not limited to "the plan" — if they have a question about their field, a subject at school, or anything related to their goals, you're on it.

${planSummary}

${notesSection}

RULES:
- Answer DIRECTLY — lead with the answer, add context after if useful. No preamble.
- Be warm, human, occasionally use a well-placed emoji 😊✅🔥 — not every sentence, just when it fits.
- BANNED openers: "Great question!", "Absolutely!", "Of course!", "Sure!", "Certainly!", "Wonderful!", "Happy to help!" — start directly with substance.
- NEVER repeat yourself across turns. Add new value each time.
- Always match the user's language (Arabic or English).
- Reference their actual plan data when relevant — make it personal.
- For students: help them understand subjects, study smarter, pick the right courses, handle university/school challenges.
- For date/time: use the provided date/time above, no disclaimers.
- If they want major plan changes, direct them to restart the AI Advisor from Dashboard.
- Be supportive but always accurate — this is their real life, not a demo.`;
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
          model: "moonshotai/kimi-k2-instruct",
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
