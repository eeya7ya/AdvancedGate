import { NextResponse } from "next/server";
import { auth } from "~/auth";
import { resetUserBudget } from "@/lib/db";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await resetUserBudget(session.user.id);
  return NextResponse.json({ ok: true });
}
