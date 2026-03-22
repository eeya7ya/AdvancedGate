import { auth } from "~/auth";
import { getUserStats } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json(null, { status: 401 });
  const stats = await getUserStats(session.user.id);
  return NextResponse.json(stats);
}
