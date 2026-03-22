"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Target, Clock, ArrowRight, ChevronRight, Zap, Brain,
  Map, Bell, BellOff, Mail, RotateCcw, CheckCircle, Loader2,
  CalendarDays, TrendingUp, Globe, BookOpen, AlertTriangle,
  Printer, Flag, Layers,
} from "lucide-react";

/* ── Types ────────────────────────────────────────────────── */
interface Priority    { topic: string; score: number; description: string; color: string }
interface TimeSlice   { subject: string; percentage: number; color: string; hours: number }
interface TopicLink   { from: string; to: string; bridge: string }

interface MarketInsights {
  localDemand: string;
  globalDemand: string;
  salaryRange: string;
  notice?: string;
  recommendation: string;
}

interface CourseRecommendation {
  title: string;
  platform: string;
  instructor: string;
  estimatedHours: number;
  level: string;
  focus: string;
  phase: string;
}

interface ScheduleData {
  daily: { duration: string; structure: string[] };
  weekly: { pattern: string; weeklyGoal: string };
  printableTargets: { daily: string; weekly: string; monthly: string };
}

interface RoadmapPhase {
  phase: string;
  duration: string;
  goal: string;
  milestones: string[];
  skills: string[];
  resources: string[];
  outcome: string;
}

interface LearningPlan {
  profile: { name: string; country?: string; targetMarket?: string; workStyle?: string; summary: string };
  marketInsights?: MarketInsights;
  todaysFocus: { topic: string; reason: string; duration: string; action: string };
  priorities: Priority[];
  timeAllocation: TimeSlice[];
  courseRecommendations?: CourseRecommendation[];
  schedule?: ScheduleData;
  roadmap?: RoadmapPhase[];
  topicConnections: TopicLink[];
  nextSteps: string[];
}

/* ── Weekly Schedule Generator ────────────────────────────── */
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function buildSchedule(slices: TimeSlice[]) {
  // Distribute hours across 7 days proportionally, favouring weekdays
  const dayWeights = [1.2, 1.2, 1.2, 1.2, 1.2, 0.8, 0.8];
  const totalWeight = dayWeights.reduce((a, b) => a + b, 0);

  return DAYS.map((day, di) => {
    const dayFraction = dayWeights[di] / totalWeight;
    const blocks = slices
      .map((s) => ({
        subject: s.subject,
        color: s.color,
        minutes: Math.round(s.hours * 60 * dayFraction),
      }))
      .filter((b) => b.minutes >= 10);
    return { day, blocks };
  });
}

/* ── Sub-components ────────────────────────────────────────── */
function SectionCard({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="rounded-2xl p-6"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
    >
      {children}
    </motion.div>
  );
}

function SectionTitle({ icon: Icon, label, color }: { icon: React.ElementType; label: string; color: string }) {
  return (
    <h3 className="text-sm font-bold mb-5 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
      <Icon size={15} style={{ color }} />
      {label}
    </h3>
  );
}

function PriorityBars({ priorities }: { priorities: Priority[] }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 300); return () => clearTimeout(t); }, []);

  return (
    <SectionCard delay={0.2}>
      <SectionTitle icon={Target} label="Learning Priorities" color="var(--brand-teal)" />
      <div className="space-y-4">
        {priorities.map((p) => (
          <div key={p.topic}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{p.topic}</span>
              <span className="text-xs font-bold" style={{ color: p.color }}>{p.score}%</span>
            </div>
            <div className="relative h-2.5 rounded-full overflow-hidden" style={{ background: "var(--bg-base)" }}>
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: animated ? `${p.score}%` : "0%",
                  background: `linear-gradient(90deg, ${p.color}cc, ${p.color})`,
                  boxShadow: `0 0 8px ${p.color}66`,
                }}
              />
            </div>
            <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>{p.description}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function DonutChart({ slices }: { slices: TimeSlice[] }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 500); return () => clearTimeout(t); }, []);

  const r = 70, cx = 100, cy = 100, strokeWidth = 22;
  const circumference = 2 * Math.PI * r;
  const totalHours = slices.reduce((s, x) => s + x.hours, 0);
  const cumulatives = slices.map((_, i) => slices.slice(0, i).reduce((sum, x) => sum + x.percentage, 0));

  return (
    <SectionCard delay={0.3}>
      <SectionTitle icon={Clock} label="Weekly Time Allocation" color="#22d3ee" />
      <div className="flex items-center gap-6">
        <div className="relative flex-shrink-0">
          <svg width="200" height="200" viewBox="0 0 200 200">
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-base)" strokeWidth={strokeWidth} />
            {slices.map((s, i) => {
              const segLen = (s.percentage / 100) * circumference;
              const rotation = -90 + (cumulatives[i] / 100) * 360;
              return (
                <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${animated ? segLen : 0} ${circumference - (animated ? segLen : 0)}`}
                  transform={`rotate(${rotation} ${cx} ${cy})`}
                  strokeLinecap="butt"
                  style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)" }}
                />
              );
            })}
            <text x={cx} y={cy - 8} textAnchor="middle" fill="var(--text-primary)" fontSize="22" fontWeight="700">{totalHours}h</text>
            <text x={cx} y={cy + 12} textAnchor="middle" fill="var(--text-muted)" fontSize="11">per week</text>
          </svg>
        </div>
        <div className="flex-1 space-y-3 min-w-0">
          {slices.map((s) => (
            <div key={s.subject} className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color, boxShadow: `0 0 6px ${s.color}88` }} />
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{s.subject}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{s.hours}h/wk · {s.percentage}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function WeeklySchedule({ slices }: { slices: TimeSlice[] }) {
  const schedule = buildSchedule(slices);

  return (
    <SectionCard delay={0.4}>
      <SectionTitle icon={CalendarDays} label="Suggested Weekly Schedule" color="#a78bfa" />
      <div className="grid grid-cols-7 gap-1.5">
        {schedule.map(({ day, blocks }) => (
          <div key={day} className="flex flex-col gap-1">
            <p className="text-[10px] font-bold text-center mb-1" style={{ color: "var(--text-muted)" }}>{day}</p>
            {blocks.length === 0 ? (
              <div className="h-16 rounded-xl" style={{ background: "var(--bg-base)", border: "1px dashed var(--border-subtle)" }} />
            ) : (
              blocks.map((b, i) => (
                <div
                  key={i}
                  className="rounded-xl flex flex-col items-center justify-center px-1 py-2 text-center"
                  style={{
                    background: `${b.color}18`,
                    border: `1px solid ${b.color}33`,
                    minHeight: `${Math.max(40, b.minutes / 1.5)}px`,
                  }}
                >
                  <p className="text-[9px] font-bold leading-tight truncate w-full text-center" style={{ color: b.color }}>
                    {b.subject.split(" ").slice(0, 2).join(" ")}
                  </p>
                  <p className="text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {b.minutes >= 60 ? `${Math.round(b.minutes / 60 * 10) / 10}h` : `${b.minutes}m`}
                  </p>
                </div>
              ))
            )}
          </div>
        ))}
      </div>
      <p className="text-[11px] mt-4" style={{ color: "var(--text-muted)" }}>
        Schedule auto-generated from your weekly time allocation. Adjust via your AI Advisor.
      </p>
    </SectionCard>
  );
}

function TopicConnections({ links }: { links: TopicLink[] }) {
  return (
    <SectionCard delay={0.5}>
      <SectionTitle icon={Zap} label="Topic Connections" color="#a78bfa" />
      <div className="space-y-3">
        {links.map((link, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }}
            className="flex items-start gap-3 p-4 rounded-xl"
            style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)" }}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap flex-shrink-0"
                style={{ background: "rgba(0,212,161,0.12)", color: "#00d4a1" }}>{link.from}</span>
              <ChevronRight size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
              <p className="text-xs flex-1 min-w-0" style={{ color: "var(--text-secondary)" }}>{link.bridge}</p>
              <ChevronRight size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap flex-shrink-0"
                style={{ background: "rgba(34,211,238,0.12)", color: "#22d3ee" }}>{link.to}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </SectionCard>
  );
}

/* ── Market Insights ───────────────────────────────────────── */
function MarketInsightsSection({ insights }: { insights: MarketInsights }) {
  return (
    <SectionCard delay={0.35}>
      <SectionTitle icon={Globe} label="Market Intelligence" color="#22d3ee" />
      {insights.notice && (
        <div className="flex items-start gap-3 mb-5 px-4 py-3 rounded-xl"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
          <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" style={{ color: "#f59e0b" }} />
          <p className="text-sm leading-relaxed" style={{ color: "#fbbf24" }}>{insights.notice}</p>
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div className="rounded-xl p-4" style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)" }}>
          <p className="text-xs font-bold mb-1.5" style={{ color: "#00d4a1" }}>Local Demand</p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{insights.localDemand}</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)" }}>
          <p className="text-xs font-bold mb-1.5" style={{ color: "#22d3ee" }}>Global Demand</p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{insights.globalDemand}</p>
        </div>
      </div>
      <div className="rounded-xl p-4 mb-4" style={{ background: "rgba(0,212,161,0.06)", border: "1px solid rgba(0,212,161,0.18)" }}>
        <p className="text-xs font-bold mb-1" style={{ color: "#00d4a1" }}>Expected Income Range</p>
        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{insights.salaryRange}</p>
      </div>
      <div className="rounded-xl p-4" style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)" }}>
        <p className="text-xs font-bold mb-1.5" style={{ color: "#a78bfa" }}>Strategic Recommendation</p>
        <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{insights.recommendation}</p>
      </div>
    </SectionCard>
  );
}

/* ── Course Recommendations ────────────────────────────────── */
function CourseRecommendationsSection({ courses }: { courses: CourseRecommendation[] }) {
  const levelColor: Record<string, string> = {
    Beginner: "#00d4a1",
    "Beginner to Intermediate": "#22d3ee",
    Intermediate: "#a78bfa",
    "Intermediate to Advanced": "#f59e0b",
    Advanced: "#f87171",
  };

  return (
    <SectionCard delay={0.4}>
      <SectionTitle icon={BookOpen} label="Recommended Courses" color="#a78bfa" />
      <div className="space-y-4">
        {courses.map((c, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.08, duration: 0.35 }}
            className="rounded-xl p-4"
            style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)" }}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <p className="text-sm font-bold leading-snug" style={{ color: "var(--text-primary)" }}>{c.title}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {c.platform} · {c.instructor}
                </p>
              </div>
              <span
                className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-lg"
                style={{ background: `${levelColor[c.level] ?? "#00d4a1"}18`, color: levelColor[c.level] ?? "#00d4a1" }}
              >
                {c.level}
              </span>
            </div>
            <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--text-secondary)" }}>{c.focus}</p>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md"
                style={{ background: "rgba(34,211,238,0.1)", color: "#22d3ee" }}>
                <Clock size={9} />
                {c.estimatedHours}h
              </span>
              <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md"
                style={{ background: "rgba(0,212,161,0.1)", color: "#00d4a1" }}>
                <Flag size={9} />
                {c.phase}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </SectionCard>
  );
}

/* ── Roadmap Phases ────────────────────────────────────────── */
function RoadmapPhasesSection({ phases }: { phases: RoadmapPhase[] }) {
  const phaseColors = ["#00d4a1", "#22d3ee", "#a78bfa", "#f59e0b", "#f87171", "#34d399", "#60a5fa", "#e879f9"];

  return (
    <SectionCard delay={0.45}>
      <SectionTitle icon={Layers} label="Your Roadmap" color="#00d4a1" />
      <div className="relative">
        {/* vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5" style={{ background: "var(--border-subtle)" }} />
        <div className="space-y-6">
          {phases.map((phase, i) => {
            const color = phaseColors[i % phaseColors.length];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 + i * 0.1, duration: 0.4 }}
                className="relative pl-12"
              >
                {/* dot */}
                <div
                  className="absolute left-2 top-1.5 w-4 h-4 rounded-full border-2 border-[var(--bg-base)] z-10"
                  style={{ background: color, boxShadow: `0 0 8px ${color}88`, transform: "translateX(-50%)" }}
                />
                <div className="rounded-xl p-5" style={{ background: "var(--bg-base)", border: `1px solid ${color}33` }}>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg"
                      style={{ background: `${color}18`, color }}>
                      {phase.phase}
                    </span>
                    <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{phase.duration}</span>
                  </div>
                  <p className="text-sm font-semibold mb-2 leading-snug" style={{ color: "var(--text-primary)" }}>{phase.goal}</p>
                  <div className="grid sm:grid-cols-2 gap-3 mt-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color }}>Milestones</p>
                      <ul className="space-y-1">
                        {phase.milestones.map((m, j) => (
                          <li key={j} className="flex items-start gap-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                            <CheckCircle size={10} className="flex-shrink-0 mt-0.5" style={{ color }} />
                            {m}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "#a78bfa" }}>Skills</p>
                      <div className="flex flex-wrap gap-1">
                        {phase.skills.map((s, j) => (
                          <span key={j} className="text-[10px] px-2 py-0.5 rounded-md font-medium"
                            style={{ background: "rgba(167,139,250,0.1)", color: "#a78bfa" }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs mt-3 pt-3 leading-relaxed italic"
                    style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border-subtle)" }}>
                    {phase.outcome}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </SectionCard>
  );
}

/* ── Printable Schedule ────────────────────────────────────── */
function PrintableScheduleSection({ schedule }: { schedule: ScheduleData }) {
  return (
    <SectionCard delay={0.5}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Printer size={15} style={{ color: "#22d3ee" }} />
          Your Study Schedule
        </h3>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80 print:hidden"
          style={{ background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.2)", color: "#22d3ee" }}
        >
          <Printer size={11} />
          Print
        </button>
      </div>

      {/* Daily structure */}
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "#00d4a1" }}>
          Daily Routine · {schedule.daily.duration}
        </p>
        <div className="space-y-2">
          {schedule.daily.structure.map((item, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl px-4 py-3"
              style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)" }}>
              <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5"
                style={{ background: "rgba(0,212,161,0.15)", color: "#00d4a1" }}>
                {i + 1}
              </span>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{item}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly pattern */}
      <div className="mb-5 rounded-xl px-4 py-3"
        style={{ background: "rgba(34,211,238,0.06)", border: "1px solid rgba(34,211,238,0.18)" }}>
        <p className="text-xs font-bold mb-1" style={{ color: "#22d3ee" }}>Weekly Pattern</p>
        <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{schedule.weekly.pattern}</p>
        <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{schedule.weekly.weeklyGoal}</p>
      </div>

      {/* Printable targets */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "#a78bfa" }}>Printable Targets</p>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { label: "Daily", value: schedule.printableTargets.daily, color: "#00d4a1" },
            { label: "Weekly", value: schedule.printableTargets.weekly, color: "#22d3ee" },
            { label: "Monthly", value: schedule.printableTargets.monthly, color: "#a78bfa" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl p-4"
              style={{ background: "var(--bg-base)", border: `1px solid ${color}33` }}>
              <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color }}>{label} Target</p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{value}</p>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function EmailReminders({
  initialEnabled,
  initialEmail,
}: {
  initialEnabled: boolean;
  initialEmail: string;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [email, setEmail] = useState(initialEmail);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async (newEnabled: boolean, newEmail: string) => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/user/roadmap", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailRemindersEnabled: newEnabled, reminderEmail: newEmail }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    save(next, email);
  };

  return (
    <SectionCard delay={0.65}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          {enabled ? <Bell size={15} style={{ color: "#00d4a1" }} /> : <BellOff size={15} style={{ color: "var(--text-muted)" }} />}
          <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Email Reminders</h3>
        </div>
        <button
          onClick={toggle}
          disabled={saving}
          className="relative w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0"
          style={{ background: enabled ? "linear-gradient(135deg,#00d4a1,#22d3ee)" : "var(--bg-base)", border: "1px solid var(--border-medium)" }}
        >
          <span
            className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300"
            style={{ left: enabled ? "calc(100% - 22px)" : "2px" }}
          />
        </button>
      </div>
      <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
        Receive weekly progress check-ins and motivational nudges to keep you on track toward your goal.
      </p>
      {enabled && (
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)" }}>
            <Mail size={13} style={{ color: "var(--text-muted)" }} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: "var(--text-primary)" }}
            />
          </div>
          <button
            onClick={() => save(enabled, email)}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white transition-all disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#00d4a1,#22d3ee)" }}
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <CheckCircle size={13} /> : "Save"}
          </button>
        </div>
      )}
    </SectionCard>
  );
}

/* ── Main Client Component ─────────────────────────────────── */
export function RoadmapClient({
  plan,
  initialEmailEnabled,
  initialReminderEmail,
}: {
  plan: LearningPlan;
  initialEmailEnabled: boolean;
  initialReminderEmail: string;
}) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>
            <Map size={10} className="inline mr-1" />
            My Roadmap
          </p>
          <h1 className="text-2xl lg:text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
            {plan.profile.name}&apos;s Action Plan
          </h1>
        </div>
        <Link
          href="/dashboard"
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all hover:opacity-80"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}
        >
          <RotateCcw size={12} />
          Modify Plan
        </Link>
      </motion.div>

      {/* Summary card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="relative overflow-hidden rounded-2xl p-6"
        style={{
          background: "linear-gradient(135deg, rgba(0,212,161,0.08) 0%, rgba(34,211,238,0.06) 100%)",
          border: "1px solid rgba(0,212,161,0.2)",
        }}
      >
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(circle, #00d4a1, #22d3ee)" }} />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-semibold mb-3"
            style={{ background: "rgba(0,212,161,0.12)", color: "#00d4a1" }}>
            <Brain size={11} />
            Your Personalized Action Plan
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {plan.profile.summary}
          </p>
        </div>
      </motion.div>

      {/* Today's Focus */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl p-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
            style={{ background: "rgba(0,212,161,0.12)", color: "#00d4a1" }}>
            <Target size={11} />
            Today&apos;s Focus
          </div>
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
          {plan.todaysFocus.topic}
        </h2>
        <p className="text-sm mb-3 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {plan.todaysFocus.reason}
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{ background: "rgba(0,212,161,0.1)", border: "1px solid rgba(0,212,161,0.2)", color: "#00d4a1" }}>
            <Clock size={11} />
            {plan.todaysFocus.duration}
          </div>
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{plan.todaysFocus.action}</p>
        </div>
      </motion.div>

      {/* Market Insights */}
      {plan.marketInsights && <MarketInsightsSection insights={plan.marketInsights} />}

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-5">
        <PriorityBars priorities={plan.priorities} />
        <DonutChart slices={plan.timeAllocation} />
      </div>

      {/* Course Recommendations */}
      {plan.courseRecommendations && plan.courseRecommendations.length > 0 && (
        <CourseRecommendationsSection courses={plan.courseRecommendations} />
      )}

      {/* Roadmap Phases */}
      {plan.roadmap && plan.roadmap.length > 0 && (
        <RoadmapPhasesSection phases={plan.roadmap} />
      )}

      {/* Printable Schedule */}
      {plan.schedule && <PrintableScheduleSection schedule={plan.schedule} />}

      {/* Weekly auto-schedule */}
      <WeeklySchedule slices={plan.timeAllocation} />

      {/* Topic connections */}
      <TopicConnections links={plan.topicConnections} />

      {/* Next Steps */}
      <SectionCard delay={0.6}>
        <SectionTitle icon={TrendingUp} label="Your Next Steps" color="var(--brand-teal)" />
        <ol className="space-y-3">
          {plan.nextSteps.map((step: string, i: number) => (
            <li key={i} className="flex items-start gap-3">
              <span
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  background: "linear-gradient(135deg, #00d4a1, #22d3ee)",
                  color: "#0a1628",
                  boxShadow: "0 0 10px rgba(0,212,161,0.4)",
                  minWidth: "28px",
                }}
              >
                {i + 1}
              </span>
              <p className="text-sm pt-0.5 leading-relaxed" style={{ color: "var(--text-secondary)" }}>{step}</p>
            </li>
          ))}
        </ol>
      </SectionCard>

      {/* Email reminders */}
      <EmailReminders initialEnabled={initialEmailEnabled} initialEmail={initialReminderEmail} />

      {/* Modify plan CTA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="flex items-center justify-center gap-4 py-4"
      >
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Your situation changed?</p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: "linear-gradient(135deg, #00d4a1, #22d3ee)", boxShadow: "0 0 20px rgba(0,212,161,0.3)" }}
        >
          <RotateCcw size={14} />
          Update My Roadmap
          <ArrowRight size={14} />
        </Link>
      </motion.div>
    </div>
  );
}
