import { auth } from "~/auth";
import { sql, getUserRoadmap, upsertUserRoadmap, updateRoadmapEmailSettings, ensureTables, deleteUserRoadmap } from "@/lib/db";
import { NextResponse } from "next/server";

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

  // Ensure tables exist and the user row is present before saving the roadmap.
  // This prevents the FK constraint from failing silently when the users table
  // doesn't yet have a row for this session's user (e.g. fresh DB or ID mismatch).
  try {
    await ensureTables();
    await sql`
      INSERT INTO users (id, name, email, image)
      VALUES (
        ${session.user.id},
        ${session.user.name ?? null},
        ${session.user.email ?? null},
        ${session.user.image ?? null}
      )
      ON CONFLICT DO NOTHING
    `;
  } catch (err) {
    console.error("[roadmap POST] user upsert error:", err);
  }

  const ok = await upsertUserRoadmap(session.user.id, plan);
  if (!ok) {
    return NextResponse.json({ error: "Failed to save roadmap" }, { status: 500 });
  }
  return NextResponse.json({ ok });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ok = await deleteUserRoadmap(session.user.id);
  if (!ok) return NextResponse.json({ error: "Failed to delete roadmap" }, { status: 500 });
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
