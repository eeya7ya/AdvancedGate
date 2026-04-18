import Groq from "groq-sdk";
import { NextRequest } from "next/server";
import { auth } from "~/auth";

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Three open-weight chat tiers from Groq's allowed list — pick by cost/latency
// vs. quality trade-off. Default is the fastest one.
const TIER_MODEL: Record<string, string> = {
  instant:  "llama-3.1-8b-instant",                        // fastest, cheapest
  versatile:"llama-3.3-70b-versatile",                     // best-quality Llama
  scout:    "meta-llama/llama-4-scout-17b-16e-instruct",   // newest Llama 4
};

type Message = { role: "system" | "user" | "assistant"; content: string };

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  let messages: Message[];
  let tier: keyof typeof TIER_MODEL;
  let stream: boolean;
  try {
    const body = await req.json();
    messages = Array.isArray(body.messages) ? body.messages : [];
    const rawTier = typeof body.tier === "string" ? body.tier : "instant";
    tier = (Object.prototype.hasOwnProperty.call(TIER_MODEL, rawTier) ? rawTier : "instant") as keyof typeof TIER_MODEL;
    stream = body.stream !== false;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (messages.length === 0) {
    return new Response("messages required", { status: 400 });
  }

  const model = TIER_MODEL[tier];
  const encoder = new TextEncoder();

  if (!stream) {
    try {
      const completion = await client.chat.completions.create({
        model,
        max_tokens: 1024,
        messages,
      });
      return Response.json({
        model,
        content: completion.choices[0]?.message?.content ?? "",
      });
    } catch (err) {
      console.error("[fast-chat] Groq error:", err);
      return new Response("Chat failed", { status: 500 });
    }
  }

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const s = await client.chat.completions.create({
          model,
          max_tokens: 1024,
          messages,
          stream: true,
        });
        for await (const chunk of s) {
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
      "X-Model": model,
    },
  });
}
