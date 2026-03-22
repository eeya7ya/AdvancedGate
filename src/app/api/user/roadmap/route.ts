import { auth } from "~/auth";
import { getUserRoadmap, upsertUserRoadmap, updateRoadmapEmailSettings } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roadmap = await getUserRoadmap(session.user.id);
  return NextResponse.json(roadmap ?? null);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { plan } = body;
  if (!plan) return NextResponse.json({ error: "Missing plan" }, { status: 400 });

  const ok = await upsertUserRoadmap(session.user.id, plan);
  return NextResponse.json({ ok });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { emailRemindersEnabled, reminderEmail } = body;

  const ok = await updateRoadmapEmailSettings(
    session.user.id,
    !!emailRemindersEnabled,
    reminderEmail ?? null,
  );
  return NextResponse.json({ ok });
}
