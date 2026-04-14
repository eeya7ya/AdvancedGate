"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, UserPlus, FileText } from "lucide-react";
import type { Quotation, Client, QuotationStatus } from "@/types";

interface Props {
  initialQuotation: Quotation;
  clients: Client[];
}

export function QuotationDetailClient({ initialQuotation, clients: initialClients }: Props) {
  const router = useRouter();
  const [quotation, setQuotation] = useState<Quotation>(initialQuotation);
  const [clients, setClients] = useState<Client[]>(initialClients);

  const [clientId, setClientId] = useState<number | "new" | "none">(
    quotation.clientId ?? (quotation.clientNameSnapshot ? "new" : "none"),
  );
  const [newClientName, setNewClientName] = useState(quotation.clientNameSnapshot ?? "");
  const [notes, setNotes] = useState(quotation.notes ?? "");
  const [status, setStatus] = useState<QuotationStatus>(quotation.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = quotation.lineItems.reduce(
    (sum, li) => sum + li.priceAfterTax * li.quantity,
    0,
  );

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      let resolvedClientId: number | null = null;
      let resolvedClientSnapshot: string | null = null;

      if (clientId === "new" && newClientName.trim()) {
        // Create the client first, then attach.
        const res = await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newClientName.trim() }),
        });
        if (!res.ok) {
          setError("Failed to create client");
          setSaving(false);
          return;
        }
        const { id } = await res.json() as { id: number };
        resolvedClientId = id;
        // Refresh the local clients list so the <select> reflects the new row.
        const list = await fetch("/api/clients").then((r) => r.json());
        setClients(list.clients ?? []);
      } else if (typeof clientId === "number") {
        resolvedClientId = clientId;
      } else {
        resolvedClientSnapshot = null; // leave unassigned
      }

      const res = await fetch(`/api/quotations/${quotation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: resolvedClientId,
          clientNameSnapshot: resolvedClientSnapshot,
          notes: notes.trim() || null,
          status,
        }),
      });
      if (!res.ok) {
        setError("Failed to save changes");
        setSaving(false);
        return;
      }
      const data = await res.json() as { quotation: Quotation };
      setQuotation(data.quotation);
      setStatus(data.quotation.status);
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Unexpected error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href="/quotations"
        className="inline-flex items-center gap-1.5 text-xs font-medium"
        style={{ color: "rgba(255,255,255,0.5)" }}
      >
        <ArrowLeft size={14} />
        Back to Quotations
      </Link>

      {/* Header */}
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
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold truncate" style={{ color: "var(--text-primary)" }}>
            Quotation #{quotation.id}
          </h1>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {quotation.sourceProjectName ?? "Untitled"}
            {quotation.sourceManufacturerName && ` · ${quotation.sourceManufacturerName}`}
            {" · "}from {quotation.source}
          </p>
        </div>
      </div>

      {/* Line items (read-only: came from Pricing-Sheet) */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Models & Pricing
          </h2>
          <span className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>
            read-only · from Pricing-Sheet
          </span>
        </div>
        <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="px-4 py-2 grid grid-cols-[1fr_70px_110px_110px] gap-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>
            <span>Model</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Price (after tax)</span>
            <span className="text-right">Line total</span>
          </div>
          {quotation.lineItems.map((li) => (
            <div
              key={li.id}
              className="px-4 py-3 grid grid-cols-[1fr_70px_110px_110px] gap-3 text-sm"
              style={{ color: "var(--text-primary)" }}
            >
              <span className="truncate">{li.itemModel || "—"}</span>
              <span className="text-right">{li.quantity}</span>
              <span className="text-right">
                {li.priceAfterTax.toFixed(2)} {li.currency}
              </span>
              <span className="text-right font-semibold">
                {(li.priceAfterTax * li.quantity).toFixed(2)}
              </span>
            </div>
          ))}
          <div className="px-4 py-3 grid grid-cols-[1fr_70px_110px_110px] gap-3 text-sm font-bold" style={{ background: "rgba(249,115,22,0.06)" }}>
            <span style={{ color: "rgba(255,255,255,0.6)" }}>Total</span>
            <span />
            <span />
            <span className="text-right" style={{ color: "#f97316" }}>
              {total.toFixed(2)} {quotation.currency}
            </span>
          </div>
        </div>
      </div>

      {/* Assignment form */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div className="flex items-center gap-2">
          <UserPlus size={16} style={{ color: "#f97316" }} />
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Assign & Finalise
          </h2>
        </div>

        {/* Client picker */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>
            Client
          </label>
          <select
            value={String(clientId)}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "none") setClientId("none");
              else if (v === "new") setClientId("new");
              else setClientId(parseInt(v, 10));
            }}
            className="w-full rounded-xl px-3 py-2.5 text-sm"
            style={{
              background: "rgba(0,0,0,0.3)",
              color: "var(--text-primary)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <option value="none">— Not yet assigned —</option>
            <option value="new">+ Create new client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{c.company ? ` (${c.company})` : ""}
              </option>
            ))}
          </select>
          {clientId === "new" && (
            <input
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              placeholder="New client name"
              className="w-full rounded-xl px-3 py-2.5 text-sm mt-2"
              style={{
                background: "rgba(0,0,0,0.3)",
                color: "var(--text-primary)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            />
          )}
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>
            Notes (other parameters)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Delivery terms, validity, payment terms, etc."
            className="w-full rounded-xl px-3 py-2.5 text-sm"
            style={{
              background: "rgba(0,0,0,0.3)",
              color: "var(--text-primary)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          />
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as QuotationStatus)}
            className="w-full rounded-xl px-3 py-2.5 text-sm"
            style={{
              background: "rgba(0,0,0,0.3)",
              color: "var(--text-primary)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <option value="waiting_to_assign">Waiting to Assign</option>
            <option value="assigned">Assigned</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
          <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>
            Picking a client automatically moves a <em>Waiting to Assign</em> quotation to <em>Assigned</em>.
          </p>
        </div>

        {error && (
          <div className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171" }}>
            {error}
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #f97316, #fb923c)",
              boxShadow: "0 0 16px rgba(249,115,22,0.25)",
            }}
          >
            <Save size={14} />
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
