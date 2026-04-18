import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "~/auth";
import { subjects } from "@/lib/data";
import { getUserApiSpent, addUserApiCost } from "@/lib/db";

// Per-user budget cap in USD
const USER_BUDGET_USD = 0.70;

// Groq openai/gpt-oss-120b pricing
const COST_PER_INPUT_TOKEN  = 0.15 / 1_000_000; // $0.15 / MTok
const COST_PER_OUTPUT_TOKEN = 0.75 / 1_000_000; // $0.75 / MTok

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

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

export interface OfficialResource {
  name: string;
  url: string;
  description: string;
  why: string;
}

export interface CourseSearchResponse {
  results: CourseSearchResult[];
  officialResources: OfficialResource[];
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

  const systemPrompt = `Course search assistant for eSpark engineering platform covering Power Engineering, Networking, and Software Development. Given a JSON catalog and a user query:

1. Find up to 4 official external resources directly relevant to the query. Only include genuinely official sources: IEEE (ieee.org), NFPA (nfpa.org), EPRI (epri.com) for power engineering; Cisco DevNet (developer.cisco.com), CompTIA (comptia.org), IETF/RFC (rfc-editor.org) for networking; MDN Web Docs (developer.mozilla.org), Python.org, nodejs.org, or specific official framework docs for software. Rank by relevance to the query. Include 1–4 resources max, omit if none are relevant.

2. Find matching courses from the catalog using semantic understanding (intent, implied skill level, conceptual relevance — not just keywords).

Respond ONLY with valid JSON (no text outside):
{"officialResources":[{"name":"...","url":"https://...","description":"brief description of the site","why":"1 sentence why it matches this query"}],"results":[{"courseId":"...","matchReason":"1-2 sentences why it matches"}],"summary":"1 sentence"}

Omit non-matching courses. officialResources may be an empty array if nothing is relevant.`;

  const userMessage = `Catalog:${JSON.stringify(catalog)}\nQuery:"${query}"`;

  // Per-user budget guard
  const userId = session.user.id!;
  const spent = await getUserApiSpent(userId);
  if (spent >= USER_BUDGET_USD) {
    console.warn(`[course-search] user ${userId} budget exhausted ($${spent.toFixed(4)} / $${USER_BUDGET_USD})`);
    return NextResponse.json({ error: "Search budget exhausted" }, { status: 429 });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const completion = await (client.chat.completions.create as any)({
      model: "openai/gpt-oss-120b",
      max_tokens: 1500,
      reasoning_effort: "medium",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userMessage },
      ],
    });

    // Track cost against this user's budget
    const cost =
      (completion.usage?.prompt_tokens     ?? 0) * COST_PER_INPUT_TOKEN +
      (completion.usage?.completion_tokens ?? 0) * COST_PER_OUTPUT_TOKEN;
    if (cost > 0) await addUserApiCost(userId, cost);

    let rawText = (completion.choices[0]?.message?.content ?? "").trim();
    // Strip markdown fences if the model wrapped its JSON
    if (rawText.startsWith("```")) {
      rawText = rawText.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
    }

    let parsed: { officialResources?: OfficialResource[]; results: { courseId: string; matchReason: string }[]; summary: string };
    try {
      parsed = JSON.parse(rawText);
    } catch {
      console.error("[course-search] Failed to parse Groq response:", rawText);
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

    return NextResponse.json({
      officialResources: parsed.officialResources ?? [],
      results: hydrated,
      summary: parsed.summary,
    } satisfies CourseSearchResponse);
  } catch (err) {
    console.error("[course-search] Groq API error:", err);
    return NextResponse.json({ error: "AI search failed" }, { status: 500 });
  }
}
