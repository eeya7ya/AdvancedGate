import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "~/auth";
import { subjects } from "@/lib/data";
import { getUserApiSpent, addUserApiCost } from "@/lib/db";

// Per-user budget cap in USD
const USER_BUDGET_USD = 0.70;

// Claude Sonnet 4.6 pricing
const COST_PER_INPUT_TOKEN  = 3  / 1_000_000; // $3 / MTok
const COST_PER_OUTPUT_TOKEN = 15 / 1_000_000; // $15 / MTok

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface CourseSearchResult {
  courseId: string;
  subjectId: string;
  title: string;
  subject: string;
  level: string;
  duration: string;
  tags: string[];
  comingSoon: boolean;
  matchReason: string;
}

export interface CourseSearchResponse {
  results: CourseSearchResult[];
  summary: string;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let query: string;
  try {
    const body = await req.json();
    query = (body.query ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  // Build flat course catalog for Claude context
  const catalog = subjects.flatMap((subject) =>
    subject.courses.map((course) => ({
      courseId: course.id,
      subjectId: subject.id,
      title: course.title,
      subject: subject.title,
      level: course.level,
      duration: course.duration,
      lessons: course.lessons,
      tags: course.tags,
      description: course.description,
      comingSoon: course.comingSoon ?? false,
    }))
  );

  const systemPrompt = `Course search assistant for eSpark engineering platform. Given a JSON catalog and a user query, find matching courses using semantic understanding (intent, implied skill level, conceptual relevance — not just keywords). Respond ONLY with valid JSON: {"results":[{"courseId":"...","matchReason":"1-2 sentences why it matches"}],"summary":"1 sentence"} — rank by relevance, omit non-matches, no text outside JSON.`;

  const userMessage = `Catalog:${JSON.stringify(catalog)}\nQuery:"${query}"`;

  // Per-user budget guard
  const userId = session.user.id!;
  const spent = await getUserApiSpent(userId);
  if (spent >= USER_BUDGET_USD) {
    console.warn(`[course-search] user ${userId} budget exhausted ($${spent.toFixed(4)} / $${USER_BUDGET_USD})`);
    return NextResponse.json({ error: "Search budget exhausted" }, { status: 429 });
  }

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      messages: [{ role: "user", content: userMessage }],
      system: systemPrompt,
    });

    // Track cost against this user's budget
    const cost =
      (message.usage?.input_tokens ?? 0)  * COST_PER_INPUT_TOKEN +
      (message.usage?.output_tokens ?? 0) * COST_PER_OUTPUT_TOKEN;
    if (cost > 0) await addUserApiCost(userId, cost);

    const rawText =
      message.content[0]?.type === "text" ? message.content[0].text : "";

    let parsed: { results: { courseId: string; matchReason: string }[]; summary: string };
    try {
      parsed = JSON.parse(rawText);
    } catch {
      console.error("[course-search] Failed to parse Claude response:", rawText);
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    // Hydrate results with full course data from the catalog
    const hydrated: CourseSearchResult[] = parsed.results
      .flatMap(({ courseId, matchReason }) => {
        const entry = catalog.find((c) => c.courseId === courseId);
        if (!entry) return [];
        return [{
          courseId: entry.courseId,
          subjectId: entry.subjectId,
          title: entry.title,
          subject: entry.subject,
          level: entry.level,
          duration: entry.duration,
          tags: entry.tags,
          comingSoon: entry.comingSoon,
          matchReason,
        } satisfies CourseSearchResult];
      });

    return NextResponse.json({ results: hydrated, summary: parsed.summary } satisfies CourseSearchResponse);
  } catch (err) {
    console.error("[course-search] Anthropic API error:", err);
    return NextResponse.json({ error: "AI search failed" }, { status: 500 });
  }
}
