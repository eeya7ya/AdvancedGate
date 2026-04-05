import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "~/auth";
import { getUserRoadmap, upsertUserRoadmap } from "@/lib/db";

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

interface SelectedCourse {
  title: string;
  platform: string;
  estimatedHours: number;
  phase: string;
  focus: string;
  url: string;
  level?: string;
  instructor?: string;
}

function buildPrompt(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plan: any,
  courses: SelectedCourse[],
  studyHoursPerWeek: number,
): string {
  const phases = (plan.roadmap ?? [])
    .map((p: { phase: string; duration: string; goal: string; milestones: string[] }) =>
      `- ${p.phase} (${p.duration}): ${p.goal}\n  Milestones: ${p.milestones?.join("; ")}`,
    )
    .join("\n");

  const courseList = courses
    .map(
      (c, i) =>
        `${i + 1}. "${c.title}" on ${c.platform} — ${c.estimatedHours}h total, Phase: ${c.phase}, Focus: ${c.focus}${c.url ? `, URL: ${c.url}` : ""}`,
    )
    .join("\n");

  return `You are a learning schedule optimizer. Generate a realistic weekly study schedule.

USER PROFILE:
- Name: ${plan.profile?.name ?? "Learner"}
- Goal summary: ${plan.profile?.summary ?? ""}
- Available study hours per week: ${studyHoursPerWeek}h

SELECTED COURSES:
${courseList}

ROADMAP PHASES:
${phases}

Generate a JSON object with this EXACT structure (no extra fields, no markdown):
{
  "weeklyTasks": {
    "weekday": "Specific task for regular study days (Mon-Thu) — mention the course and exact activity",
    "practice": "Hands-on practice task for Friday — a concrete exercise or mini-project",
    "review": "Review task for Saturday — specific review activity and self-test method",
    "rest": "Short description for Sunday rest/prep (one sentence)"
  },
  "weeklyGoal": "One sentence describing the weekly learning goal",
  "studyTips": [
    "Actionable tip 1 specific to these courses",
    "Actionable tip 2"
  ]
}

Rules:
- Be SPECIFIC to the actual courses (mention course names and platforms)
- Keep each task under 120 characters
- weekday task: what to study each regular day
- practice task: a concrete hands-on activity
- review task: how to consolidate the week's learning
- Return ONLY the JSON, no explanation`;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let courses: SelectedCourse[], studyHoursPerWeek: number;
  try {
    const body = await req.json();
    courses = body.courses ?? [];
    studyHoursPerWeek = Number(body.studyHoursPerWeek) || 6;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!courses.length) {
    return NextResponse.json({ error: "No courses selected" }, { status: 400 });
  }

  const roadmapData = await getUserRoadmap(session.user.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plan = roadmapData?.planJson as any;
  if (!plan) return NextResponse.json({ error: "No plan found" }, { status: 404 });

  let weeklyTasks: Record<string, string> = {};
  let weeklyGoal = "";
  let studyTips: string[] = [];

  try {
    const completion = await client.chat.completions.create({
      model: "moonshotai/kimi-k2-instruct",
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: buildPrompt(plan, courses, studyHoursPerWeek),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    // Extract JSON from the response (strip any surrounding text)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      weeklyTasks = parsed.weeklyTasks ?? {};
      weeklyGoal = parsed.weeklyGoal ?? "";
      studyTips = parsed.studyTips ?? [];
    }
  } catch (err) {
    console.error("[generate-schedule] Groq error:", err);
    // Fall back to generic tasks derived from course names
    const firstCourse = courses[0];
    weeklyTasks = {
      weekday: `Study ${firstCourse?.title ?? "course"} — complete one module and take notes`,
      practice: `Practice exercises from ${firstCourse?.title ?? "your course"}`,
      review: "Review the week's material and summarise key concepts",
      rest: "Rest and prepare goals for next week",
    };
    weeklyGoal = `Progress through ${courses.map((c) => c.title).join(", ")}`;
  }

  // Mark selected courses in the plan's courseRecommendations
  const selectedTitles = new Set(courses.map((c) => c.title.toLowerCase()));
  const updatedRecommendations = (plan.courseRecommendations ?? []).map(
    (c: { title: string; selected?: boolean }) => ({
      ...c,
      selected: selectedTitles.has(c.title.toLowerCase()),
    }),
  );

  // Merge schedule data into plan and persist
  const updatedPlan = {
    ...plan,
    courseRecommendations: updatedRecommendations,
    scheduledCourses: courses,
    weeklyTasks,
    weeklyGoal,
    studyTips,
    studyHoursPerWeek,
    scheduleGenerated: true,
    scheduleGeneratedAt: new Date().toISOString().split("T")[0],
  };

  const ok = await upsertUserRoadmap(session.user.id, updatedPlan);
  if (!ok) return NextResponse.json({ error: "Failed to save schedule" }, { status: 500 });

  return NextResponse.json({ ok: true, weeklyTasks, weeklyGoal, studyTips });
}
