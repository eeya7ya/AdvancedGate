import { auth } from "~/auth";
import { getUserRoadmap, upsertUserRoadmap } from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * Reset the scheduleGenerated flag so the user goes back to the
 * course-selection step without losing their AI plan.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roadmapData = await getUserRoadmap(session.user.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plan = roadmapData?.planJson as any;
  if (!plan) return NextResponse.json({ error: "No plan found" }, { status: 404 });

  const updatedPlan = {
    ...plan,
    scheduleGenerated: false,
  };

  const ok = await upsertUserRoadmap(session.user.id, updatedPlan);
  return NextResponse.json({ ok });
}
