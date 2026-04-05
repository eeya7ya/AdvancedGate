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
  const { topic, dayTask, courseTitle, language } = body as {
    topic: string;
    dayTask: string;
    courseTitle?: string;
    language?: "ar" | "en";
  };

  if (!topic) {
    return NextResponse.json({ error: "topic is required" }, { status: 400 });
  }

  const isArabic = language === "ar";

  const systemPrompt = isArabic
    ? `أنت مولّد أسئلة تعليمية متخصص. مهمتك توليد 5 أسئلة اختيار من متعدد (4 خيارات لكل سؤال) حول الموضوع المحدد.

قواعد صارمة:
- الأسئلة يجب أن تكون عملية ومفيدة فعلاً للمتعلم — ليس مجرد حفظ تعاريف
- كل سؤال يجب أن يختبر فهماً حقيقياً أو تطبيقاً عملياً
- الخيارات الخاطئة يجب أن تكون معقولة (لا خيارات سخيفة واضحة)
- الشرح يجب أن يُعلّم المتعلم لماذا الإجابة صحيحة وما الذي يجب تذكره
- اللغة: عربية فصحى واضحة
- أعد JSON فقط، بدون أي نص قبله أو بعده

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
    : `You are a specialized educational quiz generator. Your task is to generate exactly 5 multiple-choice questions (4 options each) about the given topic.

Strict rules:
- Questions must be genuinely useful to the learner — not just definition recall
- Each question should test real understanding or practical application
- Wrong options must be plausible (no obviously silly distractors)
- Explanations must teach the learner WHY the answer is correct and what to remember
- Return ONLY valid JSON — no text before or after, no markdown fences

Required JSON format:
{
  "topic": "Topic title",
  "questions": [
    {
      "id": 1,
      "question": "The question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Clear explanation of why this is correct and what to remember"
    }
  ]
}`;

  const userPrompt = isArabic
    ? `الموضوع: ${topic}
المهمة اليومية: ${dayTask}
${courseTitle ? `الدورة: ${courseTitle}` : ""}

أنشئ 5 أسئلة اختيار من متعدد تساعد المتعلم على ترسيخ فهمه لهذا الموضوع.`
    : `Topic: ${topic}
Today's task: ${dayTask}
${courseTitle ? `Course: ${courseTitle}` : ""}

Generate 5 multiple-choice questions that help the learner solidify their understanding of this topic.`;

  try {
    const completion = await client.chat.completions.create({
      model: "moonshotai/kimi-k2-instruct",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 2048,
      temperature: 0.7,
    });

    let raw = completion.choices[0]?.message?.content ?? "";

    // Strip markdown fences if present
    raw = raw.trim();
    if (raw.startsWith("```")) {
      raw = raw.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
    }

    const parsed: QuizResponse = JSON.parse(raw);

    // Validate structure
    if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      throw new Error("Invalid quiz response structure");
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("[Quiz API] Error:", err);
    return NextResponse.json(
      { error: "Failed to generate quiz" },
      { status: 500 },
    );
  }
}
