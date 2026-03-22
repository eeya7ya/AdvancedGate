import { createTables } from "@/lib/db";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

export async function GET() {
  await headers(); // opt into dynamic rendering (no prerender)
  try {
    await createTables();
    return NextResponse.json({ ok: true, message: "Tables created." });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
