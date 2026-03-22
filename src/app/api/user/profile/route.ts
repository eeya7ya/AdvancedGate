import { auth } from "~/auth";
import { getUserProfile, updateUserProfile } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json(null, { status: 401 });
  const profile = await getUserProfile(session.user.id);
  return NextResponse.json(profile);
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json(null, { status: 401 });
  const body = await req.json();
  const ok = await updateUserProfile(session.user.id, {
    name: body.name,
    jobTitle: body.jobTitle,
    organization: body.organization,
    location: body.location,
    bio: body.bio,
    phone: body.phone,
  });
  return NextResponse.json({ ok });
}
