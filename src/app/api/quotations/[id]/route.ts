import { auth } from "~/auth";
import { NextResponse } from "next/server";
import {
  getQuotation,
  updateQuotation,
  deleteQuotation,
} from "@/lib/db";
import type { QuotationStatus } from "@/types";

const VALID_STATUSES: QuotationStatus[] = [
  "waiting_to_assign",
  "assigned",
  "sent",
  "accepted",
  "rejected",
];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const quotation = await getQuotation(parseInt(id, 10));
  if (!quotation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ quotation });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json() as {
    clientId?: number | null;
    clientNameSnapshot?: string | null;
    responsibleUserId?: string | null;
    notes?: string | null;
    status?: QuotationStatus;
  };

  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const ok = await updateQuotation(parseInt(id, 10), {
    clientId: body.clientId ?? null,
    clientNameSnapshot: body.clientNameSnapshot ?? null,
    responsibleUserId: body.responsibleUserId ?? null,
    notes: body.notes ?? null,
    status: body.status,
  });
  if (!ok) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
  const updated = await getQuotation(parseInt(id, 10));
  return NextResponse.json({ quotation: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const ok = await deleteQuotation(parseInt(id, 10));
  return NextResponse.json({ ok });
}
