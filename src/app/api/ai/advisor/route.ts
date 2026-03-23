import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { auth } from "~/auth";
import { getUserRoadmap, getUserNotes } from "@/lib/db";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
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

  return `You are eSpark AI Chat — a focused, context-aware learning assistant. You have full access to the user's learning plan, saved notes, and preferences. Your job is to help them with questions about:

1. Their specific courses, schedule, and learning path
2. Technical questions related to their field of study
3. University/institution-specific information
4. Modifying their schedule or study approach
5. Career guidance specific to their goals

${planSummary}

${notesSection}

RULES:
- Always respond in the same language the user writes in (Arabic or English)
- Be specific and reference their actual plan data when relevant
- Keep responses concise and actionable
- If they ask to change something about their plan, explain what they should do (they can restart the AI Advisor session for major changes, or adjust via notes for minor preferences)
- If they ask about courses in their field, use their plan context to give relevant recommendations
- Never make up data — if you don't know something specific about a university or course, say so
- You are NOT the planning AI. You are the ongoing chat assistant. For major plan changes, direct them to the AI Advisor (dashboard)
- Be warm, supportive, and encouraging — this is their life's learning journey`;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  let messages: Anthropic.MessageParam[];
  try {
    const body = await req.json();
    messages = body.messages;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response("Messages required", { status: 400 });
  }

  // Load user context
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
        const stream = client.messages.stream({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 4096,
          system: systemPrompt,
          messages,
        });

        stream.on("text", (text) => {
          controller.enqueue(encoder.encode(text));
        });

        await stream.finalMessage();
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
