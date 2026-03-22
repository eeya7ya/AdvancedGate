"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarCheck, CheckCircle2, Clock, ChevronLeft, ChevronRight,
  RefreshCw, Loader2, AlertTriangle, Circle, CalendarDays,
  BookOpen, Layers, RotateCcw,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ScheduleTask {
  title: string;
  subtitle?: string;
  platform?: string;
  instructor?: string;
  hours: number;
  phase: string;
  level?: string;
}

export interface ScheduleDay {
  dayNumber: number;
  date: string; // "YYYY-MM-DD"
  tasks: ScheduleTask[];
  totalHours: number;
  status: "pending" | "completed" | "delayed";
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getTodayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function addDaysToDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function getMondayOfWeek(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

function formatDate(dateStr: string): { weekday: string; day: string; month: string } {
  const d = new Date(dateStr + "T00:00:00");
  return {
    weekday: d.toLocaleDateString("en-GB", { weekday: "short" }),
    day: d.toLocaleDateString("en-GB", { day: "numeric" }),
    month: d.toLocaleDateString("en-GB", { month: "short" }),
  };
}

function formatWeekRange(weekStart: string): string {
  const end = addDaysToDate(weekStart, 6);
  const s = new Date(weekStart + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const sStr = s.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const eStr = e.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return `${sStr} – ${eStr}`;
}

function parseDailyHours(duration: string): number {
  const matches = duration.match(/(\d+(?:\.\d+)?)/g);
  if (!matches) return 2;
  const nums = matches.map(Number);
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateSchedule(plan: any, startDate: string): ScheduleDay[] {
  const dailyHours = parseDailyHours(plan.schedule?.daily?.duration ?? "2 hours");
  const days: ScheduleDay[] = [];
  const courses = plan.courseRecommendations ?? [];

  if (courses.length > 0) {
    let dayOffset = 0;
    const queue = courses.map((c: any) => ({
      course: c,
      remainingHours: c.estimatedHours as number,
      sessionNum: 0,
      totalSessions: Math.ceil(c.estimatedHours / dailyHours),
    }));

    for (const cp of queue) {
      while (cp.remainingHours > 0) {
        const sessionHours = Math.min(dailyHours, cp.remainingHours);
        cp.sessionNum++;
        cp.remainingHours = Math.round((cp.remainingHours - sessionHours) * 10) / 10;
        const h = Math.round(sessionHours * 10) / 10;

        days.push({
          dayNumber: dayOffset + 1,
          date: addDaysToDate(startDate, dayOffset),
          tasks: [{
            title: cp.course.title,
            subtitle: cp.totalSessions > 1 ? `Session ${cp.sessionNum}/${cp.totalSessions}` : undefined,
            platform: cp.course.platform,
            instructor: cp.course.instructor,
            hours: h,
            phase: cp.course.phase,
            level: cp.course.level,
          }],
          totalHours: h,
          status: "pending",
        });
        dayOffset++;
      }
    }
  } else {
    const slices = plan.timeAllocation ?? [];
    for (let d = 0; d < 60; d++) {
      const tasks = slices
        .map((s: any) => ({
          title: s.subject,
          hours: Math.round((s.hours / 7) * 10) / 10,
          phase: "General Study",
        }))
        .filter((t: any) => t.hours >= 0.25);
      const totalHours = Math.round(tasks.reduce((sum: number, t: any) => sum + t.hours, 0) * 10) / 10;
      days.push({
        dayNumber: d + 1,
        date: addDaysToDate(startDate, d),
        tasks,
        totalHours,
        status: "pending",
      });
    }
  }

  return days;
}

// ─── Status config ───────────────────────────────────────────────────────────

const STATUS = {
  pending:   { color: "#00d4a1", bg: "rgba(0,212,161,0.1)",  border: "rgba(0,212,161,0.3)",  label: "Pending",   Icon: Circle },
  completed: { color: "#4ade80", bg: "rgba(74,222,128,0.1)", border: "rgba(74,222,128,0.3)", label: "Completed", Icon: CheckCircle2 },
  delayed:   { color: "#f5a623", bg: "rgba(245,166,35,0.1)", border: "rgba(245,166,35,0.3)", label: "Delayed",   Icon: AlertTriangle },
} as const;

// ─── Day Card ────────────────────────────────────────────────────────────────

function DayCard({
  day,
  isToday,
  onAction,
  actionLoading,
}: {
  day: ScheduleDay | null;
  dateStr: string;
  isToday: boolean;
  onAction: (dayNumber: number, action: "complete" | "delay") => void;
  actionLoading: number | null;
}) {
  if (!day) return null;

  const st = STATUS[day.status];
  const StatusIcon = st.Icon;
  const today = isToday;
  const borderColor = today ? "#4f9eff" : st.color;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${today ? "rgba(79,158,255,0.35)" : "var(--border-subtle)"}`,
        boxShadow: today ? "0 0 20px rgba(79,158,255,0.12)" : undefined,
        borderLeft: `3px solid ${borderColor}`,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center gap-2">
          {(() => {
            const { weekday, day: d, month } = formatDate(day.date);
            return (
              <>
                <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                  {weekday}, {d} {month}
                </span>
                <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                  Day {day.dayNumber}
                </span>
              </>
            );
          })()}
          {today && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(79,158,255,0.15)", color: "#4f9eff", border: "1px solid rgba(79,158,255,0.35)" }}
            >
              Today
            </span>
          )}
        </div>
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
          style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}
        >
          <StatusIcon size={11} />
          {st.label}
        </div>
      </div>

      {/* Tasks */}
      <div className="flex-1 px-4 py-3 space-y-3">
        {day.tasks.map((task, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-snug" style={{ color: "var(--text-primary)" }}>
                  {task.title}
                </p>
                {task.subtitle && (
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{task.subtitle}</p>
                )}
              </div>
              <span
                className="flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-lg"
                style={{ background: "rgba(0,212,161,0.1)", color: "#00d4a1" }}
              >
                {task.hours}h
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {task.platform && (
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1"
                  style={{ background: "rgba(167,139,250,0.1)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.2)" }}
                >
                  <BookOpen size={9} />
                  {task.platform}
                </span>
              )}
              {task.phase && (
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded-md flex items-center gap-1"
                  style={{ background: "rgba(34,211,238,0.08)", color: "#22d3ee", border: "1px solid rgba(34,211,238,0.15)" }}
                >
                  <Layers size={9} />
                  {task.phase}
                </span>
              )}
              {task.level && (
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded-md"
                  style={{ background: "var(--bg-base)", color: "var(--text-muted)" }}
                >
                  {task.level}
                </span>
              )}
            </div>

            {task.instructor && (
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                by {task.instructor}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      {(day.status === "pending" || day.status === "delayed") && (
        <div
          className="flex gap-2 px-4 py-3"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          <button
            onClick={() => onAction(day.dayNumber, "complete")}
            disabled={actionLoading === day.dayNumber}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: "rgba(74,222,128,0.12)",
              color: "#4ade80",
              border: "1px solid rgba(74,222,128,0.3)",
              opacity: actionLoading === day.dayNumber ? 0.6 : 1,
            }}
          >
            {actionLoading === day.dayNumber ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <CheckCircle2 size={12} />
            )}
            Complete
          </button>
          {day.status === "pending" && (
            <button
              onClick={() => onAction(day.dayNumber, "delay")}
              disabled={actionLoading === day.dayNumber}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: "rgba(245,166,35,0.1)",
                color: "#f5a623",
                border: "1px solid rgba(245,166,35,0.25)",
                opacity: actionLoading === day.dayNumber ? 0.6 : 1,
              }}
            >
              <Clock size={12} />
              Delay
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ScheduleClient({
  plan,
  savedSchedule,
  startDate,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plan: any;
  savedSchedule: ScheduleDay[] | null;
  startDate: string | null;
}) {
  const [days, setDays] = useState<ScheduleDay[]>(savedSchedule ?? []);
  const [generating, setGenerating] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [showFullList, setShowFullList] = useState(false);
  const todayRef = useRef<HTMLDivElement>(null);

  const today = getTodayStr();

  // Auto-generate on first load if no saved schedule
  useEffect(() => {
    if (!savedSchedule) {
      handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll to today's week on load
  useEffect(() => {
    if (days.length > 0) {
      const todayDay = days.find((d) => d.date === today);
      if (todayDay) {
        // Find which week offset today falls in
        const monday = getMondayOfWeek(today);
        const planStart = getMondayOfWeek(startDate ?? today);
        const diff = Math.round(
          (new Date(monday + "T00:00:00").getTime() - new Date(planStart + "T00:00:00").getTime())
          / (7 * 24 * 60 * 60 * 1000)
        );
        setWeekOffset(diff);
      }
    }
  }, [days.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/user/schedule", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setDays(data.schedule ?? []);
      }
    } finally {
      setGenerating(false);
    }
  }, []);

  const handleAction = useCallback(async (dayNumber: number, action: "complete" | "delay") => {
    setActionLoading(dayNumber);
    try {
      const res = await fetch("/api/user/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, dayNumber }),
      });
      if (res.ok) {
        const data = await res.json();
        setDays(data.schedule ?? []);
      }
    } finally {
      setActionLoading(null);
    }
  }, []);

  // Stats
  const total = days.length;
  const completed = days.filter((d) => d.status === "completed").length;
  const delayed = days.filter((d) => d.status === "delayed").length;
  const remaining = days.filter((d) => d.status === "pending").length;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Week view
  const planMonday = getMondayOfWeek(startDate ?? today);
  const weekStart = addDaysToDate(planMonday, weekOffset * 7);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDaysToDate(weekStart, i));
  const dayMap = new Map(days.map((d) => [d.date, d]));

  // Group full schedule by week
  const weeks: ScheduleDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  if (generating && days.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #00d4a1, #22d3ee)", boxShadow: "0 0 32px rgba(0,212,161,0.3)" }}
        >
          <Loader2 size={28} className="text-white animate-spin" />
        </div>
        <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
          Building your personalised schedule…
        </p>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Distributing your courses across study days
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold flex items-center gap-2"
            style={{ color: "var(--text-primary)" }}
          >
            <CalendarCheck size={22} style={{ color: "#00d4a1" }} />
            Study Schedule
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            Day-by-day plan based on your AI-generated roadmap
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: "rgba(0,212,161,0.1)",
            color: "#00d4a1",
            border: "1px solid rgba(0,212,161,0.25)",
            opacity: generating ? 0.7 : 1,
          }}
        >
          {generating ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
          Regenerate
        </button>
      </div>

      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" ref={todayRef}>
        {[
          { label: "Total Days", value: total, color: "#22d3ee", Icon: CalendarDays },
          { label: "Completed", value: completed, color: "#4ade80", Icon: CheckCircle2 },
          { label: "Delayed", value: delayed, color: "#f5a623", Icon: AlertTriangle },
          { label: "Remaining", value: remaining, color: "#00d4a1", Icon: Circle },
        ].map(({ label, value, color, Icon }) => (
          <div
            key={label}
            className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${color}15` }}
            >
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none" style={{ color: "var(--text-primary)" }}>{value}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Progress Bar ── */}
      {total > 0 && (
        <div
          className="rounded-2xl p-4"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Overall Progress
            </span>
            <span className="text-sm font-bold" style={{ color: "#4ade80" }}>
              {progressPct}%
            </span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--bg-base)" }}>
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              style={{ background: "linear-gradient(90deg, #00d4a1, #4ade80)" }}
            />
          </div>
          <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
            {completed} of {total} days completed
            {delayed > 0 && ` · ${delayed} delayed`}
          </p>
        </div>
      )}

      {/* ── Week Navigator ── */}
      {days.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
        >
          {/* Week header */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: "1px solid var(--border-subtle)" }}
          >
            <button
              onClick={() => setWeekOffset((w) => w - 1)}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
              style={{ background: "var(--bg-base)", color: "var(--text-secondary)" }}
            >
              <ChevronLeft size={16} />
            </button>
            <div className="text-center">
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                {formatWeekRange(weekStart)}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Week {weekOffset + 1}
              </p>
            </div>
            <button
              onClick={() => setWeekOffset((w) => w + 1)}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
              style={{ background: "var(--bg-base)", color: "var(--text-secondary)" }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day grid */}
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
            {weekDates.map((dateStr) => {
              const day = dayMap.get(dateStr) ?? null;
              const isToday = dateStr === today;

              if (!day) {
                const { weekday, day: d, month } = formatDate(dateStr);
                return (
                  <div
                    key={dateStr}
                    className="rounded-2xl p-3 flex flex-col items-center justify-center min-h-[120px]"
                    style={{
                      background: isToday ? "rgba(79,158,255,0.05)" : "var(--bg-base)",
                      border: `1px dashed ${isToday ? "rgba(79,158,255,0.3)" : "var(--border-subtle)"}`,
                      opacity: 0.5,
                    }}
                  >
                    <p className="text-xs font-bold" style={{ color: isToday ? "#4f9eff" : "var(--text-muted)" }}>
                      {weekday}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{d} {month}</p>
                    <p className="text-[10px] mt-2" style={{ color: "var(--text-muted)" }}>No task</p>
                  </div>
                );
              }

              return (
                <DayCard
                  key={dateStr}
                  day={day}
                  dateStr={dateStr}
                  isToday={isToday}
                  onAction={handleAction}
                  actionLoading={actionLoading}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ── Full Schedule Toggle ── */}
      {days.length > 0 && (
        <div>
          <button
            onClick={() => setShowFullList((v) => !v)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)",
            }}
          >
            <CalendarDays size={15} />
            {showFullList ? "Hide" : "View"} Full Schedule ({total} days)
          </button>

          <AnimatePresence>
            {showFullList && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mt-4 space-y-6"
              >
                {weeks.map((week, wi) => (
                  <div key={wi}>
                    <p
                      className="text-xs font-bold uppercase tracking-widest mb-3 px-1"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Week {wi + 1} &mdash; {formatWeekRange(week[0].date)}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {week.map((day) => (
                        <DayCard
                          key={day.dayNumber}
                          day={day}
                          dateStr={day.date}
                          isToday={day.date === today}
                          onAction={handleAction}
                          actionLoading={actionLoading}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Empty state ── */}
      {!generating && days.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center">
          <CalendarCheck size={40} style={{ color: "var(--text-muted)" }} />
          <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            No schedule yet
          </p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Click Regenerate to build your day-by-day study plan.
          </p>
        </div>
      )}
    </div>
  );
}
