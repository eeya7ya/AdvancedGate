import { auth } from "~/auth";
import { NextResponse } from "next/server";
import { listClients, createClient } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const clients = await listClients();
  return NextResponse.json({ clients });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json() as {
    name?: string;
    company?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  };
  const name = (body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const id = await createClient({
    name,
    company: body.company ?? null,
    email: body.email ?? null,
    phone: body.phone ?? null,
    address: body.address ?? null,
  });
  if (!id) {
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
  return NextResponse.json({ id }, { status: 201 });
}
