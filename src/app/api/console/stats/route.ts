import { NextResponse } from "next/server";
import { auth } from "~/auth";
import { getConsoleStats } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stats = await getConsoleStats();
  return NextResponse.json(stats);
}
