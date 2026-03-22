import { NextRequest, NextResponse } from "next/server";
import { auth } from "~/auth";
import { getUserSchedule, upsertUserSchedule, getUserRoadmap } from "@/lib/db";

// ─── Types (shared with client) ───────────────────────────────────────────────

interface ScheduleTask {
  title: string;
  subtitle?: string;
  platform?: string;
  instructor?: string;
  hours: number;
  phase: string;
  level?: string;
}

interface ScheduleDay {
  dayNumber: number;
  date: string;
  tasks: ScheduleTask[];
  totalHours: number;
  status: "pending" | "completed" | "delayed";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDailyHours(duration: string): number {
  const matches = duration.match(/(\d+(?:\.\d+)?)/g);
  if (!matches) return 2;
  const nums = matches.map(Number);
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function addDaysToDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateSchedule(plan: any, startDate: string): ScheduleDay[] {
  const dailyHours = parseDailyHours(
    plan.schedule?.daily?.duration ?? "2 hours"
  );
  const days: ScheduleDay[] = [];
  const courses = plan.courseRecommendations ?? [];

  if (courses.length > 0) {
    let dayOffset = 0;
    const queue = courses.map((c: any) => ({
      course: c,
      remainingHours: c.estimatedHours as number,
      sessionNum: 0,
      totalSessions: Math.ceil(c.estimatedHours / dailyHours),
    }));

    for (const cp of queue) {
      while (cp.remainingHours > 0) {
        const sessionHours = Math.min(dailyHours, cp.remainingHours);
        cp.sessionNum++;
        cp.remainingHours =
          Math.round((cp.remainingHours - sessionHours) * 10) / 10;
        const h = Math.round(sessionHours * 10) / 10;

        days.push({
          dayNumber: dayOffset + 1,
          date: addDaysToDate(startDate, dayOffset),
          tasks: [
            {
              title: cp.course.title,
              subtitle:
                cp.totalSessions > 1
                  ? `Session ${cp.sessionNum}/${cp.totalSessions}`
                  : undefined,
              platform: cp.course.platform,
              instructor: cp.course.instructor,
              hours: h,
              phase: cp.course.phase,
              level: cp.course.level,
            },
          ],
          totalHours: h,
          status: "pending",
        });
        dayOffset++;
      }
    }
  } else {
    const slices = plan.timeAllocation ?? [];
    for (let d = 0; d < 60; d++) {
      const tasks = slices
        .map((s: any) => ({
          title: s.subject,
          hours: Math.round((s.hours / 7) * 10) / 10,
          phase: "General Study",
        }))
        .filter((t: any) => t.hours >= 0.25);
      const totalHours = Math.round(
        tasks.reduce((sum: number, t: any) => sum + t.hours, 0) * 10
      ) / 10;
      days.push({
        dayNumber: d + 1,
        date: addDaysToDate(startDate, d),
        tasks,
        totalHours,
        status: "pending",
      });
    }
  }

  return days;
}

// ─── GET: return saved schedule ───────────────────────────────────────────────

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getUserSchedule(session.user.id);
  if (!data) {
    return NextResponse.json({ schedule: null, startDate: null });
  }

  return NextResponse.json({
    schedule: data.scheduleJson,
    startDate: data.startDate,
  });
}

// ─── POST: generate & save schedule ──────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Accept optional startDate from body; default to today
  let startDate: string;
  try {
    const body = await req.json().catch(() => ({}));
    startDate = (body as { startDate?: string }).startDate ?? new Date().toISOString().split("T")[0];
  } catch {
    startDate = new Date().toISOString().split("T")[0];
  }

  const roadmapData = await getUserRoadmap(session.user.id);
  if (!roadmapData?.planJson) {
    return NextResponse.json(
      { error: "No roadmap found. Generate a roadmap first." },
      { status: 404 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const schedule = generateSchedule(roadmapData.planJson as any, startDate);
  const ok = await upsertUserSchedule(session.user.id, schedule, startDate);

  if (!ok) {
    return NextResponse.json(
      { error: "Failed to save schedule." },
      { status: 500 }
    );
  }

  return NextResponse.json({ schedule, startDate });
}

// ─── PATCH: update a day's status ────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let action: string;
  let dayNumber: number;
  try {
    const body = await req.json();
    action = body.action;
    dayNumber = body.dayNumber;
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  if (!action || !dayNumber) {
    return NextResponse.json(
      { error: "Missing action or dayNumber." },
      { status: 400 }
    );
  }

  const data = await getUserSchedule(session.user.id);
  if (!data) {
    return NextResponse.json({ error: "No schedule found." }, { status: 404 });
  }

  const schedule = data.scheduleJson as ScheduleDay[];

  if (action === "complete") {
    const idx = schedule.findIndex((d) => d.dayNumber === dayNumber);
    if (idx === -1) {
      return NextResponse.json({ error: "Day not found." }, { status: 404 });
    }
    schedule[idx].status = "completed";
  } else if (action === "delay") {
    const idx = schedule.findIndex((d) => d.dayNumber === dayNumber);
    if (idx === -1) {
      return NextResponse.json({ error: "Day not found." }, { status: 404 });
    }
    schedule[idx].status = "delayed";
    // Push all subsequent pending days forward by 1 day
    for (let i = idx + 1; i < schedule.length; i++) {
      if (schedule[i].status === "pending") {
        schedule[i].date = addDaysToDate(schedule[i].date, 1);
      }
    }
  } else {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  const ok = await upsertUserSchedule(session.user.id, schedule, data.startDate);
  if (!ok) {
    return NextResponse.json(
      { error: "Failed to save schedule." },
      { status: 500 }
    );
  }

  return NextResponse.json({ schedule, startDate: data.startDate });
}
