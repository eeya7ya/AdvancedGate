import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "~/auth";

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Whisper model variants available on Groq:
//   whisper-large-v3       — highest accuracy, multilingual
//   whisper-large-v3-turbo — faster, slightly lower quality (still very good)
type WhisperModel = "whisper-large-v3" | "whisper-large-v3-turbo";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = form.get("audio");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "audio file is required" }, { status: 400 });
  }

  const fast = form.get("fast") === "1" || form.get("fast") === "true";
  const model: WhisperModel = fast ? "whisper-large-v3-turbo" : "whisper-large-v3";

  const languageRaw = form.get("language");
  const language = typeof languageRaw === "string" && languageRaw.length > 0 ? languageRaw : undefined;

  const promptRaw = form.get("prompt");
  const prompt = typeof promptRaw === "string" && promptRaw.length > 0 ? promptRaw : undefined;

  try {
    const transcription = await client.audio.transcriptions.create({
      file,
      model,
      language,
      prompt,
      response_format: "verbose_json",
      temperature: 0,
    });

    return NextResponse.json({
      model,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      text: (transcription as any).text ?? "",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      language: (transcription as any).language ?? language ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      duration: (transcription as any).duration ?? null,
    });
  } catch (err) {
    console.error("[stt] Groq Whisper error:", err);
    return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
  }
}
