import { auth } from "~/auth";
import { NextResponse } from "next/server";
import { listQuotations } from "@/lib/db";
import type { QuotationStatus } from "@/types";

const VALID_STATUSES: QuotationStatus[] = [
  "waiting_to_assign",
  "assigned",
  "sent",
  "accepted",
  "rejected",
];

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const rawStatus = searchParams.get("status");
  const status = rawStatus && VALID_STATUSES.includes(rawStatus as QuotationStatus)
    ? (rawStatus as QuotationStatus)
    : undefined;

  const quotations = await listQuotations(status);
  return NextResponse.json({ quotations });
}
