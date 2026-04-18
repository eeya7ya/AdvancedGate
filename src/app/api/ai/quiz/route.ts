import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "~/auth";

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

export interface QuizQuestion {
  id: number;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
}

export interface QuizResponse {
  topic: string;
  questions: QuizQuestion[];
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { topic, dayTask, courseTitle, lectureNotes, language } = body as {
    topic: string;
    dayTask: string;
    courseTitle?: string;
    lectureNotes?: string;
    language?: "ar" | "en";
  };

  if (!topic) {
    return NextResponse.json({ error: "topic is required" }, { status: 400 });
  }

  const isArabic = language === "ar";

  const systemPrompt = isArabic
    ? `أنت مولّد أسئلة تعليمية متخصص. مهمتك توليد بالضبط 5 أسئلة اختيار من متعدد (4 خيارات لكل سؤال) حول الموضوع المحدد.

قواعد صارمة:
- الأسئلة يجب أن تكون عملية ومفيدة فعلاً للمتعلم — ليس مجرد حفظ تعاريف
- كل سؤال يجب أن يختبر فهماً حقيقياً أو تطبيقاً عملياً
- الخيارات الخاطئة يجب أن تكون معقولة (لا خيارات سخيفة واضحة)
- الشرح يجب أن يُعلّم المتعلم لماذا الإجابة صحيحة وما الذي يجب تذكره
- اللغة: عربية فصحى واضحة
- إذا قدم المتعلم ملاحظات من المحاضرة، استخدمها لتوليد أسئلة أكثر دقة وتخصصاً
- أعد JSON فقط بدون أي نص قبله أو بعده

JSON المطلوب:
{
  "topic": "عنوان الموضوع بالعربية",
  "questions": [
    {
      "id": 1,
      "question": "نص السؤال؟",
      "options": ["الخيار أ", "الخيار ب", "الخيار ج", "الخيار د"],
      "correctIndex": 0,
      "explanation": "شرح واضح لماذا هذه الإجابة صحيحة وما الذي يجب معرفته"
    }
  ]
}`
    : `You are a specialized educational quiz generator. Generate exactly 5 multiple-choice questions (4 options each) about the given topic.

Rules:
- Questions must test real understanding or practical application — not just definition recall
- Wrong options must be plausible (no obviously silly distractors)
- Explanations must teach WHY the answer is correct and what to remember
- If the learner provided lecture notes, use them to generate precise, targeted questions that reflect exactly what they studied
- Return ONLY valid JSON — no text before or after, no markdown fences

Required JSON:
{
  "topic": "Topic title",
  "questions": [
    {
      "id": 1,
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Why this is correct and what to remember"
    }
  ]
}`;

  const userPrompt = isArabic
    ? `الموضوع: ${topic}
المهمة اليومية: ${dayTask}
${courseTitle ? `الدورة: ${courseTitle}` : ""}
${lectureNotes ? `\nملاحظات المتعلم من المحاضرة:\n${lectureNotes}` : ""}

أنشئ 5 أسئلة اختيار من متعدد تساعد المتعلم على ترسيخ فهمه.`
    : `Topic: ${topic}
Today's task: ${dayTask}
${courseTitle ? `Course: ${courseTitle}` : ""}
${lectureNotes ? `\nLearner's notes from this lecture:\n${lectureNotes}` : ""}

Generate 5 multiple-choice questions to reinforce the learner's understanding.`;

  try {
    // qwen/qwen3-32b has native reasoning. reasoning_format:"hidden" keeps
    // the <think> content out of `content` so the JSON parser sees clean JSON.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const message = await (client.chat.completions.create as any)({
      model: "qwen/qwen3-32b",
      max_tokens: 2048,
      reasoning_effort: "default",
      reasoning_format: "hidden",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userPrompt   },
      ],
    });

    let raw = (message.choices[0]?.message?.content ?? "") as string;

    // Strip markdown fences if present
    raw = raw.trim();
    if (raw.startsWith("```")) {
      raw = raw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
    }

    const parsed: QuizResponse = JSON.parse(raw);

    if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      throw new Error("Invalid quiz response structure");
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("[Quiz API] Error:", err);
    return NextResponse.json({ error: "Failed to generate quiz" }, { status: 500 });
  }
}
