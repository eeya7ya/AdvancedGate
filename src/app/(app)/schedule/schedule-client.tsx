"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  CalendarDays, ChevronLeft, ChevronRight, CheckCircle2,
  Clock, RefreshCw, AlertTriangle, BookOpen, LayoutGrid, List,
} from "lucide-react";

/* ── Types ─────────────────────────────────────────────────── */
interface RoadmapPhase {
  phase: string;
  duration: string;
  goal: string;
  milestones: string[];
  skills: string[];
  resources: string[];
  outcome: string;
}

interface ScheduleData {
  daily: { duration: string; structure: string[] };
  weekly: { pattern: string; weeklyGoal: string };
  printableTargets: { daily: string; weekly: string; monthly: string };
}

interface TimeSlice {
  subject: string;
  percentage: number;
  color: string;
  hours: number;
}

interface LearningPlan {
  profile: { name: string };
  roadmap?: RoadmapPhase[];
  schedule?: ScheduleData;
  timeAllocation: TimeSlice[];
}

interface DayEntry {
  date: Date;
  weekIndex: number; // 0-based week number
  dayOfWeek: number; // 0=Mon, 6=Sun
  phase: RoadmapPhase | null;
  phaseIndex: number;
  dayInPhase: number; // 1-based day within phase
  phaseTotalDays: number;
  task: string;
}

/* ── Duration parser ────────────────────────────────────────── */
function parseDurationDays(duration: string): number {
  const d = duration.toLowerCase().trim();

  // "month 1-2", "month 1–2", "months 1-3" → count = end - start + 1 months
  const monthRange = d.match(/month[s]?\s*(\d+)\s*[-–]\s*(\d+)/i);
  if (monthRange) {
    const months = parseInt(monthRange[2]) - parseInt(monthRange[1]) + 1;
    return months * 30;
  }

  // "2 months", "3 months"
  const nMonths = d.match(/(\d+)\s*month/);
  if (nMonths) return parseInt(nMonths[1]) * 30;

  // "week 1-4", "week 1–2"
  const weekRange = d.match(/week[s]?\s*(\d+)\s*[-–]\s*(\d+)/i);
  if (weekRange) {
    const weeks = parseInt(weekRange[2]) - parseInt(weekRange[1]) + 1;
    return weeks * 7;
  }

  // "4 weeks", "2 weeks"
  const nWeeks = d.match(/(\d+)\s*week/);
  if (nWeeks) return parseInt(nWeeks[1]) * 7;

  // "30 days", "60 days"
  const nDays = d.match(/(\d+)\s*day/);
  if (nDays) return parseInt(nDays[1]);

  // Default: 30 days per phase
  return 30;
}

/* ── Build day-by-day schedule ──────────────────────────────── */
function buildDaySchedule(
  phases: RoadmapPhase[],
  createdAt: Date,
  dailyTask: string,
): DayEntry[] {
  const entries: DayEntry[] = [];
  let cursor = new Date(createdAt);
  cursor.setHours(0, 0, 0, 0);

  phases.forEach((phase, phaseIndex) => {
    const totalDays = parseDurationDays(phase.duration);
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(cursor);
      const totalElapsed = entries.length;
      const weekIndex = Math.floor(totalElapsed / 7);
      const dayOfWeek = totalElapsed % 7; // 0=Mon..6=Sun in schedule order

      entries.push({
        date,
        weekIndex,
        dayOfWeek,
        phase,
        phaseIndex,
        dayInPhase: day,
        phaseTotalDays: totalDays,
        task: day === 1 ? phase.goal : dailyTask,
      });

      cursor.setDate(cursor.getDate() + 1);
    }
  });

  return entries;
}

/* ── Helpers ────────────────────────────────────────────────── */
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtDate(d: Date) {
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}
function fmtDateFull(d: Date) {
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

const PHASE_COLORS = ["#00d4a1", "#22d3ee", "#a78bfa", "#f59e0b", "#f87171", "#34d399", "#60a5fa", "#fb923c"];

/* ── Main component ─────────────────────────────────────────── */
export function ScheduleClient({
  plan,
  createdAt,
}: {
  plan: LearningPlan;
  createdAt: string | null;
}) {
  const startDate = useMemo(() => {
    if (createdAt) {
      const d = new Date(createdAt);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  }, [createdAt]);

  const phases = plan.roadmap ?? [];
  const dailyTask = plan.schedule?.printableTargets?.daily ?? "Study your assigned topic for the day.";

  const allDays = useMemo(
    () => buildDaySchedule(phases, startDate, dailyTask),
    [phases, startDate, dailyTask],
  );

  const totalDays = allDays.length;
  const totalWeeks = Math.max(1, Math.ceil(totalDays / 7));

  // Today's position in the schedule
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const completedDays = useMemo(() => allDays.filter(d => d.date < today).length, [allDays, today]);
  const delayedDays = 0; // Could be implemented with user progress tracking
  const remainingDays = totalDays - completedDays;
  const progressPct = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

  const [currentWeek, setCurrentWeek] = useState(0); // 0-based, starts at Week 1
  const [showFullTable, setShowFullTable] = useState(false);

  const weekDays = useMemo(
    () => allDays.filter(d => d.weekIndex === currentWeek),
    [allDays, currentWeek],
  );

  // Full 7-slot week (pad missing days)
  const weekGrid = useMemo(() => {
    return DAY_LABELS.map((label, i) => {
      const entry = weekDays.find(d => d.dayOfWeek === i) ?? null;
      return { label, entry };
    });
  }, [weekDays]);

  const weekStart = weekDays[0]?.date;
  const weekEnd = weekDays[weekDays.length - 1]?.date;

  // Group all days by phase for the full table
  const phaseGroups = useMemo(() => {
    const groups: { phase: RoadmapPhase; color: string; days: DayEntry[] }[] = [];
    phases.forEach((phase, i) => {
      groups.push({
        phase,
        color: PHASE_COLORS[i % PHASE_COLORS.length],
        days: allDays.filter(d => d.phaseIndex === i),
      });
    });
    return groups;
  }, [phases, allDays]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4 flex-wrap"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>
            <CalendarDays size={10} className="inline mr-1" />
            Study Schedule
          </p>
          <h1 className="text-2xl lg:text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
            {plan.profile.name}&apos;s Schedule
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Day-by-day plan based on your AI-generated roadmap
          </p>
        </div>
        <Link
          href="/dashboard"
          className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #00d4a1, #22d3ee)" }}
        >
          <RefreshCw size={12} />
          Regenerate
        </Link>
      </motion.div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {[
          { label: "Total Days", value: totalDays, icon: CalendarDays, color: "#22d3ee" },
          { label: "Completed", value: completedDays, icon: CheckCircle2, color: "#00d4a1" },
          { label: "Delayed", value: delayedDays, icon: AlertTriangle, color: "#f59e0b" },
          { label: "Remaining", value: remainingDays, icon: Clock, color: "#a78bfa" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${color}18`, border: `1px solid ${color}30` }}
            >
              <Icon size={15} style={{ color }} />
            </div>
            <div>
              <p className="text-xl font-bold leading-none" style={{ color: "var(--text-primary)" }}>{value}</p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Progress bar */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl p-5"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Overall Progress</span>
          <span className="text-sm font-bold" style={{ color: "#00d4a1" }}>{progressPct}%</span>
        </div>
        <div className="relative h-2.5 rounded-full overflow-hidden" style={{ background: "var(--bg-base)" }}>
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
            style={{
              width: `${progressPct}%`,
              background: "linear-gradient(90deg, #00d4a1, #22d3ee)",
              boxShadow: "0 0 8px rgba(0,212,161,0.5)",
            }}
          />
        </div>
        <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
          {completedDays} of {totalDays} days completed
        </p>
      </motion.div>

      {/* Week navigator */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-2xl p-5"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
      >
        {/* Navigation bar */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentWeek(w => Math.max(0, w - 1))}
            disabled={currentWeek === 0}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
            style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)" }}
          >
            <ChevronLeft size={15} style={{ color: "var(--text-primary)" }} />
          </button>

          <div className="text-center">
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {weekStart && weekEnd
                ? `${fmtDate(weekStart)} – ${fmtDateFull(weekEnd)}`
                : "—"}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Week {currentWeek + 1}
            </p>
          </div>

          <button
            onClick={() => setCurrentWeek(w => Math.min(totalWeeks - 1, w + 1))}
            disabled={currentWeek >= totalWeeks - 1}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
            style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)" }}
          >
            <ChevronRight size={15} style={{ color: "var(--text-primary)" }} />
          </button>
        </div>

        {/* 7-day grid */}
        <div className="grid grid-cols-7 gap-2 overflow-x-auto">
          {weekGrid.map(({ label, entry }, i) => {
            const isToday = entry && entry.date.toDateString() === today.toDateString();
            const isPast = entry && entry.date < today;
            const phaseColor = entry ? PHASE_COLORS[entry.phaseIndex % PHASE_COLORS.length] : "var(--border-subtle)";

            return (
              <div
                key={i}
                className="flex flex-col rounded-xl overflow-hidden min-w-0"
                style={{
                  border: `1px solid ${isToday ? phaseColor : "var(--border-subtle)"}`,
                  background: isToday ? `${phaseColor}12` : "var(--bg-base)",
                  boxShadow: isToday ? `0 0 12px ${phaseColor}30` : undefined,
                }}
              >
                {/* Day header */}
                <div
                  className="px-2 py-1.5 text-center"
                  style={{
                    background: entry
                      ? (isToday ? `${phaseColor}25` : `${phaseColor}10`)
                      : "var(--bg-base)",
                    borderBottom: "1px solid var(--border-subtle)",
                  }}
                >
                  <p
                    className="text-[10px] font-bold uppercase tracking-wide"
                    style={{ color: entry ? phaseColor : "var(--text-muted)" }}
                  >
                    {label}
                  </p>
                  {entry && (
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {entry.date.getDate()} {MONTH_NAMES[entry.date.getMonth()]}
                    </p>
                  )}
                </div>

                {/* Day content */}
                <div className="p-2 flex-1 flex flex-col gap-1 min-h-[80px] justify-center items-center">
                  {entry ? (
                    <>
                      {isPast && (
                        <CheckCircle2 size={12} style={{ color: "#00d4a1" }} className="flex-shrink-0" />
                      )}
                      <p
                        className="text-[10px] font-semibold text-center leading-tight line-clamp-3"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {entry.phase?.phase ?? "Study"}
                      </p>
                      <p
                        className="text-[9px] text-center leading-tight"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Day {entry.dayInPhase}/{entry.phaseTotalDays}
                      </p>
                    </>
                  ) : (
                    <p className="text-[10px] text-center" style={{ color: "var(--text-muted)" }}>
                      No Data
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* View Full Schedule toggle */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <button
          onClick={() => setShowFullTable(v => !v)}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all hover:opacity-90"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-primary)",
          }}
        >
          {showFullTable ? <List size={14} /> : <LayoutGrid size={14} />}
          {showFullTable ? "Hide Full Schedule" : `View Full Schedule (${totalDays} days)`}
        </button>
      </motion.div>

      {/* Full schedule table */}
      {showFullTable && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl p-5 overflow-x-auto"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
        >
          <div className="flex items-center gap-2 mb-5">
            <BookOpen size={15} style={{ color: "#22d3ee" }} />
            <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Full Schedule</h3>
          </div>

          <div className="grid grid-cols-7 gap-2 min-w-[560px]">
            {/* Column headers */}
            {DAY_LABELS.map(day => (
              <div
                key={day}
                className="rounded-lg py-2 text-center"
                style={{
                  background: day === "Sat" || day === "Sun"
                    ? "rgba(167,139,250,0.1)"
                    : "rgba(34,211,238,0.08)",
                  border: `1px solid ${day === "Sat" || day === "Sun"
                    ? "rgba(167,139,250,0.25)"
                    : "rgba(34,211,238,0.2)"}`,
                }}
              >
                <p
                  className="text-xs font-bold"
                  style={{ color: day === "Sat" || day === "Sun" ? "#a78bfa" : "#22d3ee" }}
                >
                  {day}
                </p>
              </div>
            ))}

            {/* All weeks */}
            {Array.from({ length: totalWeeks }, (_, wi) => {
              const weekEntries = allDays.filter(d => d.weekIndex === wi);
              return DAY_LABELS.map((_, di) => {
                const entry = weekEntries.find(d => d.dayOfWeek === di);
                if (!entry) {
                  return (
                    <div
                      key={`${wi}-${di}-empty`}
                      className="rounded-xl flex items-center justify-center"
                      style={{
                        background: "var(--bg-base)",
                        border: "1px dashed var(--border-subtle)",
                        minHeight: "60px",
                      }}
                    >
                      <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>—</p>
                    </div>
                  );
                }

                const phaseColor = PHASE_COLORS[entry.phaseIndex % PHASE_COLORS.length];
                const isPast = entry.date < today;
                const isToday = entry.date.toDateString() === today.toDateString();
                // Card height proportional to phase position within total phases
                const phaseRatio = phases.length > 1
                  ? (entry.phaseTotalDays / Math.max(...phases.map(p => parseDurationDays(p.duration))))
                  : 1;
                const cardH = Math.max(72, Math.round(phaseRatio * 130));

                return (
                  <div
                    key={`${wi}-${di}`}
                    className="rounded-xl flex flex-col items-center justify-center px-1.5 text-center gap-1 overflow-hidden"
                    style={{
                      background: `${phaseColor}15`,
                      border: `1px solid ${isToday ? phaseColor : phaseColor + "40"}`,
                      height: `${cardH}px`,
                      boxShadow: isToday ? `0 0 10px ${phaseColor}40` : undefined,
                    }}
                  >
                    {isPast && <CheckCircle2 size={10} style={{ color: "#00d4a1" }} className="flex-shrink-0" />}
                    <p
                      className="text-[10px] font-bold leading-snug"
                      style={{ color: phaseColor }}
                    >
                      {entry.phase?.phase?.replace(/Phase \d+:\s*/i, "") ?? "Study"}
                    </p>
                    <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                      {fmtDate(entry.date)}
                    </p>
                  </div>
                );
              });
            })}
          </div>

          {/* Phase legend */}
          {phases.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-3">
              {phaseGroups.map(({ phase, color }) => (
                <div key={phase.phase} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{phase.phase}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Daily routine hint */}
      {plan.schedule && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-2xl p-5"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
        >
          <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "#00d4a1" }}>
            Daily Routine · {plan.schedule.daily.duration}
          </p>
          <div className="space-y-2">
            {plan.schedule.daily.structure.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl px-4 py-2.5"
                style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)" }}
              >
                <span
                  className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5"
                  style={{ background: "rgba(0,212,161,0.15)", color: "#00d4a1" }}
                >
                  {i + 1}
                </span>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{item}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
