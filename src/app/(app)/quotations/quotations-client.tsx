"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileText, ArrowRight, PackageOpen, Clock, CheckCircle2, Send, XCircle, ThumbsUp } from "lucide-react";
import type { Quotation, Client, QuotationStatus } from "@/types";

interface Props {
  initialQuotations: Quotation[];
  initialClients: Client[];
}

const STATUS_TABS: { key: QuotationStatus | "all"; en: string; icon: React.ElementType }[] = [
  { key: "waiting_to_assign", en: "Waiting to Assign", icon: Clock },
  { key: "assigned",          en: "Assigned",          icon: CheckCircle2 },
  { key: "sent",              en: "Sent",              icon: Send },
  { key: "accepted",          en: "Accepted",          icon: ThumbsUp },
  { key: "rejected",          en: "Rejected",          icon: XCircle },
  { key: "all",               en: "All",               icon: PackageOpen },
];

export function QuotationsClient({ initialQuotations, initialClients }: Props) {
  const [quotations] = useState<Quotation[]>(initialQuotations);
  const [tab, setTab] = useState<QuotationStatus | "all">("waiting_to_assign");

  const filtered = useMemo(
    () => (tab === "all" ? quotations : quotations.filter((q) => q.status === tab)),
    [quotations, tab],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: quotations.length };
    for (const q of quotations) c[q.status] = (c[q.status] ?? 0) + 1;
    return c;
  }, [quotations]);

  const clientsById = useMemo(() => {
    const map = new Map<number, Client>();
    for (const c of initialClients) map.set(c.id, c);
    return map;
  }, [initialClients]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, #f97316, #fb923c)",
            boxShadow: "0 0 24px rgba(249,115,22,0.3)",
          }}
        >
          <FileText size={20} className="text-white" strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Quotations
          </h1>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Priced offers sent from Pricing-Sheet. Assign a client to move them forward.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((t) => {
          const active = tab === t.key;
          const count = counts[t.key] ?? 0;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
              style={
                active
                  ? {
                      background: "rgba(249,115,22,0.15)",
                      color: "#f97316",
                      border: "1px solid rgba(249,115,22,0.35)",
                    }
                  : {
                      background: "rgba(255,255,255,0.04)",
                      color: "rgba(255,255,255,0.6)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }
              }
            >
              <Icon size={14} />
              {t.en}
              <span
                className="text-[10px] font-bold px-1.5 rounded-md"
                style={{
                  background: active ? "rgba(249,115,22,0.2)" : "rgba(255,255,255,0.06)",
                  color: active ? "#f97316" : "rgba(255,255,255,0.5)",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 rounded-2xl text-center"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px dashed rgba(255,255,255,0.1)",
          }}
        >
          <PackageOpen size={32} className="mb-3" style={{ color: "rgba(255,255,255,0.3)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            No quotations in this state.
          </p>
          <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
            New quotations arrive here automatically when sent from Pricing-Sheet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => (
            <QuotationCard key={q.id} q={q} client={q.clientId ? clientsById.get(q.clientId) : undefined} />
          ))}
        </div>
      )}
    </div>
  );
}

function QuotationCard({ q, client }: { q: Quotation; client?: Client }) {
  const total = q.lineItems.reduce(
    (sum, li) => sum + li.priceAfterTax * li.quantity,
    0,
  );
  const clientLabel = client?.name ?? q.clientNameSnapshot ?? "— unassigned —";
  const statusBadge = statusMeta(q.status);

  return (
    <Link
      href={`/quotations/${q.id}`}
      className="block rounded-2xl p-4 transition-all hover:translate-x-0.5"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider"
              style={{ background: statusBadge.bg, color: statusBadge.fg }}
            >
              {statusBadge.label}
            </span>
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              #{q.id} · {q.source}
            </span>
          </div>
          <h3 className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
            {q.sourceProjectName ?? "Untitled project"}
            {q.sourceManufacturerName && (
              <span className="font-normal" style={{ color: "rgba(255,255,255,0.4)" }}>
                {" "}· {q.sourceManufacturerName}
              </span>
            )}
          </h3>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
            Client: <span style={{ color: client || q.clientNameSnapshot ? "rgba(255,255,255,0.75)" : "rgba(249,115,22,0.8)" }}>{clientLabel}</span>
            {" · "}
            {q.lineItems.length} model{q.lineItems.length === 1 ? "" : "s"}
            {" · "}
            Total: <span style={{ color: "rgba(255,255,255,0.75)" }}>{total.toFixed(2)} {q.currency}</span>
          </p>
        </div>
        <ArrowRight size={16} style={{ color: "rgba(255,255,255,0.3)" }} />
      </div>
    </Link>
  );
}

function statusMeta(status: QuotationStatus): { label: string; bg: string; fg: string } {
  switch (status) {
    case "waiting_to_assign":
      return { label: "Waiting to assign", bg: "rgba(249,115,22,0.18)", fg: "#f97316" };
    case "assigned":
      return { label: "Assigned", bg: "rgba(34,197,94,0.18)", fg: "#4ade80" };
    case "sent":
      return { label: "Sent", bg: "rgba(59,130,246,0.18)", fg: "#60a5fa" };
    case "accepted":
      return { label: "Accepted", bg: "rgba(16,185,129,0.18)", fg: "#34d399" };
    case "rejected":
      return { label: "Rejected", bg: "rgba(239,68,68,0.18)", fg: "#f87171" };
  }
}
