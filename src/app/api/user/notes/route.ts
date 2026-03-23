import { auth } from "~/auth";
import { getUserNotes, addUserNote, updateUserNote, deleteUserNote } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notes = await getUserNotes(session.user.id);
  return NextResponse.json(notes);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { note, category } = body;
  if (!note) return NextResponse.json({ error: "Missing note" }, { status: 400 });

  const id = await addUserNote(session.user.id, note, category ?? "general");
  if (!id) return NextResponse.json({ error: "Failed to save note" }, { status: 500 });
  return NextResponse.json({ id });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, note } = body;
  if (!id || !note) return NextResponse.json({ error: "Missing id or note" }, { status: 400 });

  const ok = await updateUserNote(session.user.id, id, note);
  return NextResponse.json({ ok });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const ok = await deleteUserNote(session.user.id, id);
  return NextResponse.json({ ok });
}
