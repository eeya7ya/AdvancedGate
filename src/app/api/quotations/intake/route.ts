// External intake endpoint for quotations, called server-to-server by
// Pricing-Sheet (and potentially other upstream pricing tools). Auth is
// a shared API key rather than a user session — there is no logged-in
// user when Pricing-Sheet makes the call.

import { NextResponse } from "next/server";
import { createQuotationFromIntake } from "@/lib/db";

function isAuthorized(req: Request): boolean {
  const expected = process.env.ADVANCEDGATE_INTAKE_API_KEY;
  if (!expected || expected.length === 0) {
    // Refuse to accept intakes when no key is configured — fail closed so
    // a misconfigured deploy doesn't silently accept unauthenticated data.
    return false;
  }
  const provided =
    req.headers.get("x-api-key") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  return provided === expected;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as {
    source?: string;
    sourceProjectId?: number | null;
    sourceProjectName?: string | null;
    sourceManufacturerName?: string | null;
    currency?: string;
    notes?: string | null;
    lineItems?: Array<{
      itemModel?: string;
      quantity?: number;
      priceAfterTax?: number;
    }>;
  };

  if (!Array.isArray(b.lineItems) || b.lineItems.length === 0) {
    return NextResponse.json(
      { error: "lineItems is required and must contain at least one item" },
      { status: 400 },
    );
  }

  const cleanedLines = b.lineItems.map((li) => ({
    itemModel: String(li.itemModel ?? "").slice(0, 500),
    quantity: Number.isFinite(li.quantity) ? Math.max(0, Math.trunc(Number(li.quantity))) : 1,
    priceAfterTax: Number.isFinite(li.priceAfterTax) ? Number(li.priceAfterTax) : 0,
  }));

  const quotationId = await createQuotationFromIntake({
    source: b.source ?? "pricing-sheet",
    sourceProjectId: b.sourceProjectId ?? null,
    sourceProjectName: b.sourceProjectName ?? null,
    sourceManufacturerName: b.sourceManufacturerName ?? null,
    currency: b.currency ?? "JOD",
    notes: b.notes ?? null,
    lineItems: cleanedLines,
  });

  if (!quotationId) {
    return NextResponse.json(
      { error: "Failed to create quotation" },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { quotationId, status: "waiting_to_assign" },
    { status: 201 },
  );
}
