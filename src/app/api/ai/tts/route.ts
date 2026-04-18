import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "~/auth";

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Canopy Labs Orpheus variants hosted on Groq:
//   canopylabs/orpheus-v1-english        — English voice
//   canopylabs/orpheus-arabic-saudi      — Arabic (Saudi) voice
type OrpheusModel = "canopylabs/orpheus-v1-english" | "canopylabs/orpheus-arabic-saudi";

function pickModel(language: string | undefined): OrpheusModel {
  if (!language) return "canopylabs/orpheus-v1-english";
  const lang = language.toLowerCase();
  if (lang.startsWith("ar")) return "canopylabs/orpheus-arabic-saudi";
  return "canopylabs/orpheus-v1-english";
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let text: string;
  let language: string | undefined;
  let voice: string | undefined;
  let format: "mp3" | "wav" | "flac";
  try {
    const body = await req.json();
    text     = (body.text ?? "").toString().trim();
    language = typeof body.language === "string" ? body.language : undefined;
    voice    = typeof body.voice    === "string" ? body.voice    : undefined;
    format   = (["mp3", "wav", "flac"].includes(body.format) ? body.format : "mp3") as "mp3" | "wav" | "flac";
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }
  if (text.length > 4000) {
    return NextResponse.json({ error: "text too long (max 4000 chars)" }, { status: 400 });
  }

  const model = pickModel(language);
  // Orpheus ships with multiple named voices; fall back to a sensible default per language.
  const defaultVoice = model === "canopylabs/orpheus-arabic-saudi" ? "amira" : "alex";
  const selectedVoice = voice || defaultVoice;

  try {
    const response = await client.audio.speech.create({
      model,
      voice: selectedVoice,
      input: text,
      response_format: format,
    });

    const audio = await response.arrayBuffer();
    const mime =
      format === "wav"  ? "audio/wav"  :
      format === "flac" ? "audio/flac" : "audio/mpeg";

    return new Response(audio, {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "no-store",
        "X-Model": model,
        "X-Voice": selectedVoice,
      },
    });
  } catch (err) {
    console.error("[tts] Groq Orpheus error:", err);
    return NextResponse.json({ error: "Speech synthesis failed" }, { status: 500 });
  }
}
