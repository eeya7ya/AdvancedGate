"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import type { UserProfile } from "@/types";
import {
  CheckCircle, Loader2, Brain, Target, ChevronDown, ChevronUp,
  MapPin, Briefcase, Building2, Phone, FileText, Sparkles, Map,
} from "lucide-react";

interface Priority { topic: string; score: number; color: string }

interface ProfileClientProps {
  profile: UserProfile | null;
  sessionUser: { name: string | null; email: string; image: string | null };
  aiSummary: string | null;
  aiPriorities: Priority[];
}

export function ProfileClient({ profile, sessionUser, aiSummary, aiPriorities }: ProfileClientProps) {
  const [editOpen, setEditOpen] = useState(false);
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

  const displayName = profile?.name ?? sessionUser.name ?? "Engineer";
  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

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
    "w-full px-4 py-3 rounded-xl text-sm placeholder:text-[#334155] focus:outline-none transition-all"  ;
  const inputStyle = {
    background: "var(--bg-base)",
    border: "1px solid var(--border-subtle)",
    color: "var(--text-primary)",
  };
  const inputFocusStyle = { borderColor: "rgba(249,115,22,0.4)", boxShadow: "0 0 0 2px rgba(249,115,22,0.1)" };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pt-2">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>Account</p>
        <h1 className="text-2xl lg:text-3xl font-bold" style={{ color: "var(--text-primary)" }}>Your Profile</h1>
      </div>

      {/* Avatar + Identity card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-5 p-6 rounded-2xl"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
      >
        <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center text-white text-xl font-bold"
          style={{ background: "linear-gradient(135deg, #f97316, #fb923c)" }}>
          {sessionUser.image ? (
            <Image src={sessionUser.image} alt={displayName} width={64} height={64} className="object-cover w-full h-full" />
          ) : (
            initials
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-lg leading-tight truncate" style={{ color: "var(--text-primary)" }}>{displayName}</p>
          <p className="text-sm mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{sessionUser.email}</p>
          {(profile?.jobTitle || profile?.organization) && (
            <p className="text-sm mt-1 truncate" style={{ color: "var(--text-secondary)" }}>
              {profile.jobTitle}{profile.organization ? ` · ${profile.organization}` : ""}
            </p>
          )}
        </div>
      </motion.div>

      {/* AI Summary (if plan exists) */}
      {aiSummary && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-2xl p-6"
          style={{
            background: "linear-gradient(135deg, rgba(249,115,22,0.08) 0%, rgba(251,146,60,0.06) 100%)",
            border: "1px solid rgba(249,115,22,0.2)",
          }}
        >
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none"
            style={{ background: "radial-gradient(circle, #f97316, #fb923c)" }} />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                style={{ background: "rgba(249,115,22,0.12)", color: "#f97316" }}>
                <Sparkles size={11} />
                AI-Generated Summary
              </div>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{aiSummary}</p>
          </div>
        </motion.div>
      )}

      {/* AI Priorities */}
      {aiPriorities.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl p-6"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
        >
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Target size={14} style={{ color: "var(--brand-teal)" }} />
            Learning Priorities
          </h3>
          <div className="space-y-3">
            {aiPriorities.map((p: Priority) => (
              <div key={p.topic}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{p.topic}</span>
                  <span className="text-xs font-bold" style={{ color: p.color }}>{p.score}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-base)" }}>
                  <div className="h-full rounded-full" style={{ width: `${p.score}%`, background: `linear-gradient(90deg, ${p.color}cc, ${p.color})` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            <Link href="/roadmap" className="inline-flex items-center gap-1.5 text-xs font-semibold transition-all hover:opacity-80"
              style={{ color: "#f97316" }}>
              <Map size={12} />
              View Full Roadmap
            </Link>
          </div>
        </motion.div>
      )}

      {/* Info summary (non-editable display) */}
      {(profile?.location || profile?.bio) && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl p-6 space-y-3"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
        >
          <h3 className="text-sm font-bold mb-4" style={{ color: "var(--text-primary)" }}>About</h3>
          {profile.location && (
            <div className="flex items-center gap-2.5">
              <MapPin size={14} style={{ color: "var(--text-muted)" }} />
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{profile.location}</span>
            </div>
          )}
          {profile.jobTitle && (
            <div className="flex items-center gap-2.5">
              <Briefcase size={14} style={{ color: "var(--text-muted)" }} />
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{profile.jobTitle}</span>
            </div>
          )}
          {profile.organization && (
            <div className="flex items-center gap-2.5">
              <Building2 size={14} style={{ color: "var(--text-muted)" }} />
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{profile.organization}</span>
            </div>
          )}
          {profile.phone && (
            <div className="flex items-center gap-2.5">
              <Phone size={14} style={{ color: "var(--text-muted)" }} />
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{profile.phone}</span>
            </div>
          )}
          {profile.bio && (
            <div className="flex items-start gap-2.5 pt-1">
              <FileText size={14} style={{ color: "var(--text-muted)", marginTop: 2 }} />
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{profile.bio}</p>
            </div>
          )}
        </motion.div>
      )}

      {/* No AI plan CTA */}
      {!aiSummary && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-4 p-5 rounded-2xl"
          style={{ background: "var(--bg-card)", border: "1px dashed var(--border-medium)" }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#f97316,#fb923c)" }}>
            <Brain size={18} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>No AI profile yet</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Start an AI session to generate your personalized summary and learning plan.</p>
          </div>
          <Link href="/dashboard" className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold text-white"
            style={{ background: "linear-gradient(135deg,#f97316,#fb923c)" }}>
            Start Now
          </Link>
        </motion.div>
      )}

      {/* Collapsible edit form */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <button
          onClick={() => setEditOpen((o) => !o)}
          className="w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
        >
          <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Edit Personal Information</span>
          {editOpen ? <ChevronUp size={16} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={16} style={{ color: "var(--text-muted)" }} />}
        </button>

        <AnimatePresence>
          {editOpen && (
            <motion.form
              key="edit-form"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleSubmit}
              className="overflow-hidden"
            >
              <div className="mt-2 p-6 rounded-2xl space-y-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Full Name</label>
                    <input name="name" value={form.name} onChange={handleChange} placeholder="Your full name"
                      className={inputClass} style={inputStyle}
                      onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
                      onBlur={(e) => Object.assign(e.target.style, inputStyle)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Phone</label>
                    <input name="phone" value={form.phone} onChange={handleChange} placeholder="+1 555 000 0000"
                      className={inputClass} style={inputStyle}
                      onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
                      onBlur={(e) => Object.assign(e.target.style, inputStyle)} />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Job Title</label>
                    <input name="jobTitle" value={form.jobTitle} onChange={handleChange} placeholder="e.g. Power Systems Engineer"
                      className={inputClass} style={inputStyle}
                      onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
                      onBlur={(e) => Object.assign(e.target.style, inputStyle)} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Organization</label>
                    <input name="organization" value={form.organization} onChange={handleChange} placeholder="Company or university"
                      className={inputClass} style={inputStyle}
                      onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
                      onBlur={(e) => Object.assign(e.target.style, inputStyle)} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Location</label>
                  <input name="location" value={form.location} onChange={handleChange} placeholder="City, Country"
                    className={inputClass} style={inputStyle}
                    onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
                    onBlur={(e) => Object.assign(e.target.style, inputStyle)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Bio</label>
                  <textarea name="bio" value={form.bio} onChange={handleChange} rows={3} placeholder="Brief professional summary..."
                    className={`${inputClass} resize-none`} style={inputStyle}
                    onFocus={(e) => Object.assign(e.target.style, inputFocusStyle)}
                    onBlur={(e) => Object.assign(e.target.style, inputStyle)} />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    {saved && !error && (
                      <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: "#4ade80" }}>
                        <CheckCircle size={15} />
                        Saved successfully
                      </span>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg, #f97316, #fb923c)", boxShadow: "0 0 20px rgba(249,115,22,0.25)" }}
                  >
                    {saving && <Loader2 size={14} className="animate-spin" />}
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
