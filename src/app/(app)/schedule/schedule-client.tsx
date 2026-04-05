"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/lib/language";
import {
  CalendarDays, Clock, Target, CheckCircle, Circle,
  AlertTriangle, Mail, ChevronLeft, ChevronRight,
  BookOpen, TrendingUp, Bell, BellOff, Info, RotateCcw,
} from "lucide-react";

/* ── Types ─────────────────────────────────────────── */
interface TrackingEntry {
  taskDate: string;
  taskKey: string;
  completed: boolean;
  completedAt: string | null;
}

interface CourseRec {
  title: string;
  platform: string;
  estimatedHours: number;
  level: string;
  focus: string;
  phase: string;
  url?: string;
  selected?: boolean;
}

interface RoadmapPhase {
  phase: string;
  duration: string;
  goal: string;
  milestones: string[];
  skills: string[];
  outcome: string;
}

interface TimeSlice {
  subject: string;
  percentage: number;
  color: string;
  hours: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Plan = any;

interface ScheduleClientProps {
  plan: Plan;
  initialTracking: TrackingEntry[];
  emailSettings: { emailRemindersEnabled: boolean; reminderEmail: string };
}

/* ── Helpers ────────────────────────────────────────── */
const MONTH_NAMES_EN = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const MONTH_NAMES_AR = [
  "يناير","فبراير","مارس","أبريل","مايو","يونيو",
  "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر",
];
const DAY_NAMES_EN = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const DAY_NAMES_AR = ["الأح","الاث","الثل","الأر","الخم","الجم","السب"];

function toDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

function parsePhaseMonths(duration: string): { start: number; end: number } {
  const m = duration.match(/Month\s*(\d+)[\s\-–]+(\d+)/i);
  if (m) return { start: parseInt(m[1]), end: parseInt(m[2]) };
  const s = duration.match(/Month\s*(\d+)/i);
  if (s) return { start: parseInt(s[1]), end: parseInt(s[1]) };
  return { start: 1, end: 1 };
}

function getPhaseForDay(roadmap: RoadmapPhase[], dayIndex: number): RoadmapPhase | null {
  // dayIndex = days since plan start (0-based)
  const monthNum = Math.floor(dayIndex / 30) + 1;
  for (const phase of roadmap) {
    const { start, end } = parsePhaseMonths(phase.duration);
    if (monthNum >= start && monthNum <= end) return phase;
  }
  // fallback: last phase
  return roadmap[roadmap.length - 1] ?? null;
}

function getSelectedCourses(courses: CourseRec[]): CourseRec[] {
  if (!courses || courses.length === 0) return [];
  const selected = courses.filter((c) => c.selected);
  // If no courses have been explicitly selected, fall back to all courses
  return selected.length > 0 ? selected : courses;
}

function getCourseForDay(courses: CourseRec[], dayIndex: number): CourseRec | null {
  if (!courses || courses.length === 0) return null;
  const monthNum = Math.floor(dayIndex / 30) + 1;
  // find course whose phase includes this month
  for (const c of courses) {
    const { start, end } = parsePhaseMonths(c.phase);
    if (monthNum >= start && monthNum <= end) return c;
  }
  return courses[courses.length - 1] ?? null;
}

interface WeeklyTasks {
  weekday?: string;
  practice?: string;
  review?: string;
  rest?: string;
}

function getDailyObjective(
  dayIndex: number,
  phase: RoadmapPhase | null,
  course: CourseRec | null,
  slices: TimeSlice[],
  isRTL: boolean,
  weeklyTasks?: WeeklyTasks,
): { title: string; subject: string; color: string; action: string } {
  const dayOfWeek = dayIndex % 7;
  const weekInPhase = Math.floor((dayIndex % 30) / 7);
  const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
  const isPracticeDay = dayOfWeek === 4; // 5th weekday = practice/deep-work
  const isRestDay = dayOfWeek === 6;
  const subjectIndex = dayIndex % slices.length;
  const slice = slices[subjectIndex] ?? slices[0];

  if (isRestDay && weeklyTasks?.rest) {
    return {
      title: isRTL ? "راحة واستعداد" : "Rest & Prep",
      subject: slice?.subject ?? "",
      color: "#a78bfa",
      action: weeklyTasks.rest,
    };
  }

  if (isWeekend) {
    return {
      title: isRTL ? "مراجعة وتعزيز" : "Review & Reinforce",
      subject: slice?.subject ?? "",
      color: "#a78bfa",
      action: weeklyTasks?.review ?? (isRTL ? "راجع ملاحظاتك وحل تمريناً" : "Review notes and solve a practice exercise"),
    };
  }

  if (course) {
    const milestone = phase?.milestones?.[weekInPhase % (phase.milestones.length || 1)] ?? "";
    const groqAction = isPracticeDay
      ? (weeklyTasks?.practice ?? null)
      : (weeklyTasks?.weekday ?? null);
    return {
      title: course.title,
      subject: course.platform,
      color: slice?.color ?? "#f97316",
      action: groqAction ?? milestone ?? course.focus ?? (isRTL ? "ادرس الوحدة التالية" : "Study the next module"),
    };
  }

  return {
    title: phase?.goal ?? (isRTL ? "تعلم يومي" : "Daily Learning"),
    subject: slice?.subject ?? "",
    color: slice?.color ?? "#f97316",
    action: weeklyTasks?.weekday ?? (isRTL ? "أكمل مهمة اليوم" : "Complete today's task"),
  };
}

/* ── Card ──────────────────────────────────────────── */
function Card({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className={`rounded-2xl p-5 ${className}`}
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
    >
      {children}
    </motion.div>
  );
}

/* ── Delay Banner ──────────────────────────────────── */
function DelayBanner({ missedDays, isRTL }: { missedDays: number; isRTL: boolean }) {
  if (missedDays === 0) return null;
  const delayWeeks = Math.ceil(missedDays / 5);
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 px-4 py-3 rounded-2xl"
      style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)" }}
    >
      <AlertTriangle size={16} style={{ color: "#f59e0b", flexShrink: 0, marginTop: 2 }} />
      <div>
        <p className="text-sm font-bold" style={{ color: "#f59e0b" }}>
          {isRTL
            ? `لديك ${missedDays} يوم متأخر — هذا سيؤخر خطتك بمقدار ~${delayWeeks} أسبوع`
            : `You have ${missedDays} missed day${missedDays > 1 ? "s" : ""} — this delays your plan by ~${delayWeeks} week${delayWeeks > 1 ? "s" : ""}`}
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          {isRTL
            ? "أكمل المهام الفائتة لإعادة التزامن مع الجدول. تأخير اليوم = تأخير في كل المراحل القادمة."
            : "Complete missed tasks to re-sync with your schedule. Each missed day delays all upcoming phases."}
        </p>
      </div>
    </motion.div>
  );
}

/* ── Monthly Calendar ──────────────────────────────── */
interface CalendarProps {
  year: number;
  month: number;
  planStartDate: Date;
  tracking: Map<string, boolean>;
  plan: Plan;
  onToggle: (dateKey: string, taskKey: string, completed: boolean) => void;
  isRTL: boolean;
  weeklyTasks?: WeeklyTasks;
}

function MonthlyCalendar({ year, month, planStartDate, tracking, plan, onToggle, isRTL, weeklyTasks }: CalendarProps) {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay(); // 0=Sun

  const days: Array<Date | null> = [
    ...Array(startPad).fill(null),
    ...Array.from({ length: lastDay.getDate() }, (_, i) => new Date(year, month, i + 1)),
  ];

  const dayNames = isRTL ? DAY_NAMES_AR : DAY_NAMES_EN;

  function getDayStatus(date: Date) {
    const key = toDateKey(date);
    const planDayIndex = Math.floor((date.getTime() - planStartDate.getTime()) / 86400000);
    if (planDayIndex < 0) return "before-plan";
    void `${key}-daily`; // taskKey for future use
    const done = tracking.get(key) ?? false;
    const isPast = date < today;
    const isToday = toDateKey(date) === toDateKey(today);
    return done ? "done" : isToday ? "today" : isPast ? "missed" : "upcoming";
  }

  const selectedDateKey = selectedDay ? toDateKey(selectedDay) : null;
  const selectedDayIndex = selectedDay
    ? Math.floor((selectedDay.getTime() - planStartDate.getTime()) / 86400000)
    : -1;

  const selectedObjective =
    selectedDay && selectedDayIndex >= 0
      ? getDailyObjective(
          selectedDayIndex,
          getPhaseForDay(plan.roadmap ?? [], selectedDayIndex),
          getCourseForDay(getSelectedCourses(plan.courseRecommendations ?? []), selectedDayIndex),
          plan.timeAllocation ?? [],
          isRTL,
          weeklyTasks,
        )
      : null;

  const selectedTaskKey = selectedDateKey ? `${selectedDateKey}-daily` : null;
  const selectedDone = selectedDateKey ? (tracking.get(selectedDateKey) ?? false) : false;

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((d) => (
          <div key={d} className="text-center text-[10px] font-bold py-1" style={{ color: "var(--text-muted)" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, i) => {
          if (!date) return <div key={`pad-${i}`} />;
          const status = getDayStatus(date);
          const isSelected = selectedDateKey === toDateKey(date);

          const bg =
            status === "done"    ? "rgba(249,115,22,0.15)" :
            status === "today"   ? "rgba(251,146,60,0.15)" :
            status === "missed"  ? "rgba(239,68,68,0.1)" :
            "var(--bg-base)";

          const border =
            status === "done"    ? "rgba(249,115,22,0.4)" :
            status === "today"   ? "rgba(251,146,60,0.5)" :
            status === "missed"  ? "rgba(239,68,68,0.3)" :
            "var(--border-subtle)";

          const textColor =
            status === "done"   ? "#f97316" :
            status === "today"  ? "#fb923c" :
            status === "missed" ? "#ef4444" :
            "var(--text-secondary)";

          return (
            <button
              key={toDateKey(date)}
              onClick={() => setSelectedDay(isSelected ? null : date)}
              className="relative aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-semibold transition-all hover:scale-105"
              style={{
                background: isSelected ? "rgba(249,115,22,0.25)" : bg,
                border: `1px solid ${isSelected ? "#f97316" : border}`,
                color: textColor,
                boxShadow: isSelected ? "0 0 10px rgba(249,115,22,0.3)" : undefined,
              }}
            >
              <span>{date.getDate()}</span>
              {status === "done" && (
                <span className="absolute bottom-0.5 w-1 h-1 rounded-full" style={{ background: "#f97316" }} />
              )}
              {status === "missed" && (
                <span className="absolute bottom-0.5 w-1 h-1 rounded-full" style={{ background: "#ef4444" }} />
              )}
              {status === "today" && (
                <span className="absolute bottom-0.5 w-1 h-1 rounded-full animate-pulse" style={{ background: "#fb923c" }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day detail */}
      <AnimatePresence>
        {selectedDay && selectedObjective && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className="mt-4 overflow-hidden"
          >
            <div
              className="p-4 rounded-2xl"
              style={{ background: `${selectedObjective.color}10`, border: `1px solid ${selectedObjective.color}35` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-lg"
                      style={{ background: `${selectedObjective.color}20`, color: selectedObjective.color }}
                    >
                      {selectedObjective.subject}
                    </span>
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                      {isRTL
                        ? `${selectedDay.getDate()} ${MONTH_NAMES_AR[selectedDay.getMonth()]}`
                        : `${MONTH_NAMES_EN[selectedDay.getMonth()]} ${selectedDay.getDate()}`}
                    </span>
                  </div>
                  <p className="text-sm font-bold leading-snug mb-1" style={{ color: "var(--text-primary)" }}>
                    {selectedObjective.title}
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {selectedObjective.action}
                  </p>
                </div>
                {/* Toggle completion */}
                {selectedTaskKey && (
                  <button
                    onClick={() => onToggle(selectedDateKey!, selectedTaskKey, !selectedDone)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80"
                    style={
                      selectedDone
                        ? { background: "rgba(249,115,22,0.15)", color: "#f97316", border: "1px solid rgba(249,115,22,0.3)" }
                        : { background: "var(--bg-base)", color: "var(--text-muted)", border: "1px solid var(--border-subtle)" }
                    }
                  >
                    {selectedDone
                      ? <><CheckCircle size={13} /> {isRTL ? "مكتمل" : "Done"}</>
                      : <><Circle size={13} /> {isRTL ? "إتمام" : "Mark Done"}</>}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Stats Row ─────────────────────────────────────── */
function StatsRow({ plan, tracking, planStartDate, isRTL }: {
  plan: Plan;
  tracking: Map<string, boolean>;
  planStartDate: Date;
  isRTL: boolean;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalDaysSinceStart = Math.max(0, Math.floor((today.getTime() - planStartDate.getTime()) / 86400000));
  const completedDays = Array.from(tracking.values()).filter(Boolean).length;
  const missedDays = Math.max(0, totalDaysSinceStart - completedDays);
  const completionRate = totalDaysSinceStart > 0 ? Math.round((completedDays / totalDaysSinceStart) * 100) : 0;

  // Current phase
  const currentPhase = getPhaseForDay(plan.roadmap ?? [], totalDaysSinceStart);
  const totalHours = Math.round((plan.timeAllocation ?? []).reduce((s: number, x: TimeSlice) => s + x.hours, 0) * 10) / 10;

  const stats = [
    {
      label: isRTL ? "أيام مكتملة" : "Days Completed",
      value: completedDays,
      color: "#f97316",
      icon: CheckCircle,
    },
    {
      label: isRTL ? "أيام متأخرة" : "Days Missed",
      value: missedDays,
      color: missedDays > 0 ? "#ef4444" : "#f97316",
      icon: AlertTriangle,
    },
    {
      label: isRTL ? "معدل الالتزام" : "Completion Rate",
      value: `${completionRate}%`,
      color: completionRate >= 70 ? "#f97316" : completionRate >= 40 ? "#f59e0b" : "#ef4444",
      icon: TrendingUp,
    },
    {
      label: isRTL ? "ساعات/أسبوع" : "Hours/Week",
      value: `${totalHours}h`,
      color: "#fb923c",
      icon: Clock,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map(({ label, value, color, icon: Icon }) => (
        <Card key={label} delay={0.05}>
          <div className="flex items-center gap-2 mb-2">
            <Icon size={14} style={{ color }} />
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
          </div>
          <p className="text-2xl font-bold" style={{ color }}>{value}</p>
          {label.includes("Phase") || currentPhase ? (
            <p className="text-[10px] mt-1 truncate" style={{ color: "var(--text-muted)" }}>
              {currentPhase?.phase ?? ""}
            </p>
          ) : null}
        </Card>
      ))}
    </div>
  );
}

/* ── Current Phase Card ────────────────────────────── */
function CurrentPhaseCard({ plan, planStartDate, isRTL }: { plan: Plan; planStartDate: Date; isRTL: boolean }) {
  const today = new Date();
  const dayIndex = Math.floor((today.getTime() - planStartDate.getTime()) / 86400000);
  const phase = getPhaseForDay(plan.roadmap ?? [], Math.max(0, dayIndex));
  const course = getCourseForDay(getSelectedCourses(plan.courseRecommendations ?? []), Math.max(0, dayIndex));

  if (!phase) return null;

  return (
    <Card delay={0.1}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(249,115,22,0.15)" }}>
          <Target size={14} style={{ color: "#f97316" }} />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "#f97316" }}>
            {isRTL ? "مرحلتك الحالية" : "Current Phase"}
          </p>
          <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{phase.phase}</p>
        </div>
        <span className="ms-auto text-xs px-2 py-1 rounded-lg" style={{ background: "rgba(251,146,60,0.1)", color: "#fb923c" }}>
          {phase.duration}
        </span>
      </div>

      <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text-secondary)" }}>{phase.goal}</p>

      {/* Milestones */}
      <div className="space-y-2 mb-4">
        {phase.milestones?.map((m: string, i: number) => (
          <div key={i} className="flex items-start gap-2">
            <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#f97316" }} />
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{m}</p>
          </div>
        ))}
      </div>

      {/* Active Course */}
      {course && (
        <div className="p-3 rounded-xl" style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)" }}>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen size={12} style={{ color: "#a78bfa" }} />
            <p className="text-[10px] font-bold uppercase" style={{ color: "#a78bfa" }}>
              {isRTL ? "الدورة النشطة" : "Active Course"}
            </p>
          </div>
          <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{course.title}</p>
          <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{course.platform} · {course.estimatedHours}h</p>
          {course.url && (
            <a
              href={course.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all hover:opacity-80"
              style={{ background: "linear-gradient(135deg,#f97316,#fb923c)", color: "#0f0600" }}
            >
              {isRTL ? "افتح الدورة" : "Open Course"}
            </a>
          )}
        </div>
      )}
    </Card>
  );
}

/* ── Email Settings ────────────────────────────────── */
function EmailSettings({
  emailSettings,
  isRTL,
}: {
  emailSettings: { emailRemindersEnabled: boolean; reminderEmail: string };
  isRTL: boolean;
}) {
  const [enabled, setEnabled] = useState(emailSettings.emailRemindersEnabled);
  const [email, setEmail] = useState(emailSettings.reminderEmail ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    await fetch("/api/user/roadmap", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailRemindersEnabled: enabled, reminderEmail: email }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <Card delay={0.2}>
      <div className="flex items-center gap-2 mb-4">
        <Mail size={14} style={{ color: "#fb923c" }} />
        <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
          {isRTL ? "تذكيرات البريد الإلكتروني" : "Email Reminders"}
        </h3>
      </div>

      <div className="flex items-center justify-between mb-4 p-3 rounded-xl" style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)" }}>
        <div className="flex items-center gap-2">
          {enabled ? <Bell size={14} style={{ color: "#f97316" }} /> : <BellOff size={14} style={{ color: "var(--text-muted)" }} />}
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {isRTL ? "تفعيل التذكيرات" : "Enable Reminders"}
          </span>
        </div>
        <button
          onClick={() => setEnabled((v) => !v)}
          className="relative w-11 h-6 rounded-full transition-colors"
          style={{ background: enabled ? "#f97316" : "var(--border-subtle)" }}
        >
          <span
            className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
            style={{ transform: enabled ? "translateX(20px)" : "translateX(2px)" }}
          />
        </button>
      </div>

      <AnimatePresence>
        {enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 overflow-hidden"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={isRTL ? "بريدك الإلكتروني" : "your@email.com"}
              className="w-full text-sm px-3 py-2.5 rounded-xl bg-transparent outline-none"
              style={{ border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              dir="ltr"
            />
            <div className="flex items-start gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
              <Info size={12} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{isRTL ? "ستتلقى تذكيراً عند تأخر الدراسة وتهنئة عند إتمام المراحل." : "You'll receive a reminder if you miss study days, and congratulations when you complete phases."}</span>
            </div>
            <button
              onClick={save}
              disabled={saving || !email}
              className="w-full py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
              style={{ background: saved ? "rgba(249,115,22,0.15)" : "linear-gradient(135deg,#f97316,#fb923c)", color: saved ? "#f97316" : "#0f0600" }}
            >
              {saving ? (isRTL ? "جارٍ الحفظ..." : "Saving...") : saved ? (isRTL ? "✓ تم الحفظ" : "✓ Saved") : (isRTL ? "حفظ الإعدادات" : "Save Settings")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

/* ── Main Export ───────────────────────────────────── */
export function ScheduleClient({
  plan,
  initialTracking,
  emailSettings,
}: ScheduleClientProps) {
  const { lang } = useLang();
  const isRTL = lang === "ar";
  const weeklyTasks: WeeklyTasks | undefined = plan.weeklyTasks;

  // Determine plan start date — use created_at or today's date as fallback
  const planStartDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Calendar navigation
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  // Build tracking map: dateKey → completed
  const [trackingMap, setTrackingMap] = useState<Map<string, boolean>>(() => {
    const m = new Map<string, boolean>();
    for (const entry of initialTracking) {
      m.set(entry.taskDate, entry.completed);
    }
    return m;
  });

  // Compute missed days (past days since plan start with no completion)
  const missedDays = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    let count = 0;
    const cur = new Date(planStartDate);
    while (cur < now) {
      const key = toDateKey(cur);
      if (!trackingMap.get(key)) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }, [trackingMap, planStartDate]);

  const handleToggle = useCallback(async (dateKey: string, taskKey: string, completed: boolean) => {
    // Optimistic update
    setTrackingMap((prev) => {
      const next = new Map(prev);
      next.set(dateKey, completed);
      return next;
    });
    await fetch("/api/schedule/tracking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskDate: dateKey, taskKey, completed }),
    });
  }, []);

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear((y) => y - 1); setCalMonth(11); }
    else setCalMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear((y) => y + 1); setCalMonth(0); }
    else setCalMonth((m) => m + 1);
  };

  const monthLabel = isRTL
    ? `${MONTH_NAMES_AR[calMonth]} ${calYear}`
    : `${MONTH_NAMES_EN[calMonth]} ${calYear}`;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-2"
            style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)", color: "#a78bfa" }}
          >
            <CalendarDays size={11} />
            {isRTL ? "جدولي السنوي" : "My Annual Schedule"}
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
            {isRTL
              ? `جدول ${plan.profile?.name ?? ""} التفصيلي`
              : `${plan.profile?.name ?? "Your"}'s Learning Schedule`}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            {isRTL ? "تتبع تقدمك يوماً بيوم — كل يوم تفوته يؤخر خطتك بالكامل" : "Track your progress day by day — every missed day delays your full plan"}
          </p>
          {plan.weeklyGoal && (
            <p className="text-xs mt-1 font-semibold" style={{ color: "#f97316" }}>
              {isRTL ? "هدف الأسبوع: " : "Weekly goal: "}{plan.weeklyGoal}
            </p>
          )}
        </div>
        {/* Regenerate schedule button */}
        <a
          href="/schedule"
          onClick={async (e) => {
            e.preventDefault();
            // Reset scheduleGenerated flag via API, then navigate back to selection
            await fetch("/api/user/roadmap/reset-schedule", { method: "POST" });
            window.location.href = "/schedule";
          }}
          className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-70"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}
        >
          <RotateCcw size={12} />
          {isRTL ? "إعادة اختيار الدورات" : "Change Courses"}
        </a>
      </motion.div>

      {/* Delay Banner */}
      <DelayBanner missedDays={missedDays} isRTL={isRTL} />

      {/* Stats */}
      <StatsRow plan={plan} tracking={trackingMap} planStartDate={planStartDate} isRTL={isRTL} />

      {/* Main grid: calendar + sidebar */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Calendar — 2/3 width */}
        <div className="lg:col-span-2 space-y-5">
          <Card delay={0.15}>
            {/* Month nav */}
            <div className="flex items-center justify-between mb-5">
              <button
                onClick={prevMonth}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:opacity-70"
                style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
              >
                <ChevronLeft size={15} />
              </button>
              <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{monthLabel}</h2>
              <button
                onClick={nextMonth}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:opacity-70"
                style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
              >
                <ChevronRight size={15} />
              </button>
            </div>

            <MonthlyCalendar
              year={calYear}
              month={calMonth}
              planStartDate={planStartDate}
              tracking={trackingMap}
              plan={plan}
              onToggle={handleToggle}
              isRTL={isRTL}
              weeklyTasks={weeklyTasks}
            />

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 flex-wrap">
              {[
                { color: "#f97316", label: isRTL ? "مكتمل" : "Done" },
                { color: "#fb923c", label: isRTL ? "اليوم" : "Today" },
                { color: "#ef4444", label: isRTL ? "فائت" : "Missed" },
                { color: "var(--border-subtle)", label: isRTL ? "قادم" : "Upcoming" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
                  <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{label}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Sidebar — 1/3 */}
        <div className="space-y-4">
          <CurrentPhaseCard plan={plan} planStartDate={planStartDate} isRTL={isRTL} />
          <EmailSettings emailSettings={emailSettings} isRTL={isRTL} />
        </div>
      </div>
    </div>
  );
}
