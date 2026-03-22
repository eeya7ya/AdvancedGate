import { NextRequest, NextResponse } from "next/server";
import { auth } from "~/auth";
import { logVisit } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();

  const body = await req.json().catch(() => ({}));
  const page: string = typeof body.page === "string" ? body.page : "/";
  const referrer: string | undefined = typeof body.referrer === "string" ? body.referrer : undefined;

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    undefined;
  const userAgent = req.headers.get("user-agent") ?? undefined;

  await logVisit({
    userId: session?.user?.id ?? undefined,
    page,
    ip,
    userAgent,
    referrer,
  });

  return NextResponse.json({ ok: true });
}
