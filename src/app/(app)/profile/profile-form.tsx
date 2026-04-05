"use client";

import { useState } from "react";
import type { UserProfile } from "@/types";
import { CheckCircle, Loader2 } from "lucide-react";

interface ProfileFormProps {
  profile: UserProfile | null;
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [form, setForm] = useState({
    name:         profile?.name         ?? "",
    jobTitle:     profile?.jobTitle     ?? "",
    organization: profile?.organization ?? "",
    location:     profile?.location     ?? "",
    phone:        profile?.phone        ?? "",
    bio:          profile?.bio          ?? "",
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setSaved(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSaved(true);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full px-4 py-3 rounded-xl bg-[#080400] border border-[rgba(255,255,255,0.07)] text-[#f1f5f9] text-sm placeholder:text-[#334155] focus:outline-none focus:border-[rgba(249,115,22,0.4)] focus:ring-1 focus:ring-[rgba(249,115,22,0.2)] transition-all";

  const labelClass = "block text-[#64748b] text-xs font-semibold uppercase tracking-wider mb-2";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-6 rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#0d0700] space-y-5">
        <h2 className="text-sm font-bold text-[#f1f5f9] border-b border-[rgba(255,255,255,0.05)] pb-4">
          Personal Information
        </h2>

        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Full Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Your full name"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="+1 555 000 0000"
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Job Title</label>
            <input
              name="jobTitle"
              value={form.jobTitle}
              onChange={handleChange}
              placeholder="e.g. Power Systems Engineer"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Organization</label>
            <input
              name="organization"
              value={form.organization}
              onChange={handleChange}
              placeholder="Company or university"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Location</label>
          <input
            name="location"
            value={form.location}
            onChange={handleChange}
            placeholder="City, Country"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Bio</label>
          <textarea
            name="bio"
            value={form.bio}
            onChange={handleChange}
            rows={3}
            placeholder="Brief professional summary..."
            className={`${inputClass} resize-none`}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {saved && !error && (
          <span className="flex items-center gap-1.5 text-[#4ade80] text-sm font-medium">
            <CheckCircle size={15} />
            Saved successfully
          </span>
        )}
        {!error && !saved && <span />}

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#f97316] hover:bg-[#ea580c] disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all hover:shadow-[0_0_20px_rgba(249,115,22,0.35)]"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
