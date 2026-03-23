import { auth } from "~/auth";
import { getScheduleTracking, upsertScheduleTask } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("start");
  const endDate = searchParams.get("end");

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "Missing start/end date" }, { status: 400 });
  }

  const tracking = await getScheduleTracking(session.user.id, startDate, endDate);
  return NextResponse.json(tracking);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { taskDate, taskKey, completed } = body;

  if (!taskDate || !taskKey || typeof completed !== "boolean") {
    return NextResponse.json({ error: "Missing taskDate, taskKey, or completed" }, { status: 400 });
  }

  const ok = await upsertScheduleTask(session.user.id, taskDate, taskKey, completed);
  return NextResponse.json({ ok });
}
