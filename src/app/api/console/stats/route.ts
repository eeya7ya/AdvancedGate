import { NextResponse } from "next/server";
import { auth } from "~/auth";
import { getConsoleStats } from "@/lib/db";
import { isAdmin } from "@/lib/admin";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdmin(session.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const stats = await getConsoleStats();
  return NextResponse.json(stats);
}
