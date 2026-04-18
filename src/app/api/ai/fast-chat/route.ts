import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { auth } from "~/auth";

const client = new Anthropic();

const MODEL = "claude-haiku-4-5";

type Role = "user" | "assistant";
type Message = { role: "system" | Role; content: string };

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  let messages: Message[];
  let stream: boolean;
  try {
    const body = await req.json();
    messages = Array.isArray(body.messages) ? body.messages : [];
    stream = body.stream !== false;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (messages.length === 0) {
    return new Response("messages required", { status: 400 });
  }

  // Anthropic Messages API keeps `system` separate from the messages array.
  const systemText = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const chatMessages = messages
    .filter((m): m is { role: Role; content: string } => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role, content: m.content }));

  const encoder = new TextEncoder();

  if (!stream) {
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        ...(systemText ? { system: systemText } : {}),
        messages: chatMessages,
      });
      const text = response.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("");
      return Response.json({ model: MODEL, content: text });
    } catch (err) {
      console.error("[fast-chat] Claude error:", err);
      return new Response("Chat failed", { status: 500 });
    }
  }

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const s = client.messages.stream({
          model: MODEL,
          max_tokens: 1024,
          ...(systemText ? { system: systemText } : {}),
          messages: chatMessages,
        });
        for await (const event of s) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const text = event.delta.text;
            if (text) controller.enqueue(encoder.encode(text));
          }
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
      "X-Model": MODEL,
    },
  });
}
