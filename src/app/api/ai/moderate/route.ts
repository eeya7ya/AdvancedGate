import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "~/auth";

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Three-stage moderation pipeline using Groq's allowed safety models:
 *
 *   1. meta-llama/llama-prompt-guard-2-22m   — fast prompt-injection classifier
 *   2. meta-llama/llama-prompt-guard-2-86m   — deeper prompt-injection classifier
 *   3. openai/gpt-oss-safeguard-20b          — content safety (harmful content policy)
 *
 * Stage 1 runs first (cheap). If it flags, we short-circuit. Otherwise stage 2
 * provides a second opinion. Stage 3 always runs to catch unsafe *content*
 * (violence, hate, self-harm, etc.) that isn't prompt injection.
 */

type GuardVerdict = {
  model: string;
  flagged: boolean;
  label: string;
  raw: string;
};

async function runGuard(model: string, text: string): Promise<GuardVerdict> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resp = await (client.chat.completions.create as any)({
    model,
    max_tokens: 16,
    temperature: 0,
    messages: [
      { role: "user", content: text },
    ],
  });
  const raw = ((resp.choices?.[0]?.message?.content ?? "") as string).trim();
  // Prompt-guard models return one of: BENIGN | INJECTION | JAILBREAK
  const label = raw.toUpperCase().split(/\s+/)[0] || "UNKNOWN";
  const flagged = label === "INJECTION" || label === "JAILBREAK";
  return { model, flagged, label, raw };
}

async function runSafeguard(text: string): Promise<GuardVerdict> {
  const model = "openai/gpt-oss-safeguard-20b";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resp = await (client.chat.completions.create as any)({
    model,
    max_tokens: 64,
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "You are a content safety classifier. Classify the user message against these policies: " +
          "violence, sexual, hate, self-harm, illegal. Reply with ONE line in the exact format: " +
          "VERDICT=<SAFE|UNSAFE> CATEGORY=<none|violence|sexual|hate|self-harm|illegal>.",
      },
      { role: "user", content: text },
    ],
  });
  const raw = ((resp.choices?.[0]?.message?.content ?? "") as string).trim();
  const verdictMatch  = raw.match(/VERDICT=(SAFE|UNSAFE)/i);
  const categoryMatch = raw.match(/CATEGORY=([a-z-]+)/i);
  const flagged = (verdictMatch?.[1]?.toUpperCase() === "UNSAFE");
  const label = flagged ? (categoryMatch?.[1]?.toLowerCase() ?? "unsafe") : "safe";
  return { model, flagged, label, raw };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let text: string;
  let mode: "fast" | "full";
  try {
    const body = await req.json();
    text = (body.text ?? "").toString();
    mode = body.mode === "fast" ? "fast" : "full";
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!text.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }
  if (text.length > 8000) {
    return NextResponse.json({ error: "text too long (max 8000 chars)" }, { status: 400 });
  }

  try {
    // Stage 1: fast prompt-guard (22M)
    const stage1 = await runGuard("meta-llama/llama-prompt-guard-2-22m", text);

    // Fast mode: stop after stage 1 unless it flagged (then run safeguard for category)
    if (mode === "fast" && !stage1.flagged) {
      return NextResponse.json({
        flagged: false,
        verdicts: [stage1],
      });
    }

    // Stage 2 + 3: deeper prompt-guard + content safeguard in parallel
    const [stage2, stage3] = await Promise.all([
      runGuard("meta-llama/llama-prompt-guard-2-86m", text),
      runSafeguard(text),
    ]);

    const verdicts = [stage1, stage2, stage3];
    const flagged  = verdicts.some((v) => v.flagged);

    return NextResponse.json({ flagged, verdicts });
  } catch (err) {
    console.error("[moderate] Groq safety error:", err);
    return NextResponse.json({ error: "Moderation failed" }, { status: 500 });
  }
}
