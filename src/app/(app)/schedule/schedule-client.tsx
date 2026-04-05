"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/lib/language";
import {
  CalendarDays, Clock, Target, CheckCircle, Circle,
  AlertTriangle, Mail, ChevronLeft, ChevronRight,
  BookOpen, TrendingUp, Bell, BellOff, Info,
  Zap, Play, X, Star, RotateCcw, ExternalLink,
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

interface WeekDay {
  dayNumber: number;
  label: string;
  task: string;
  type: "study" | "practice" | "review" | "rest";
  hasQuiz: boolean;
  quizTopic: string;
  courseRef: string;
  courseUrl: string;
  duration: string;
}

interface WeekSchedule {
  week: number;
  month: number;
  theme: string;
  certification: string;
  days: WeekDay[];
}

interface QuizQuestion {
  id: number;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
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

function getDailyObjective(
  dayIndex: number,
  phase: RoadmapPhase | null,
  course: CourseRec | null,
  slices: TimeSlice[],
  isRTL: boolean,
): { title: string; subject: string; color: string; action: string } {
  const dayOfWeek = dayIndex % 7;
  const weekInPhase = Math.floor((dayIndex % 30) / 7);
  const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
  const subjectIndex = dayIndex % slices.length;
  const slice = slices[subjectIndex] ?? slices[0];

  if (isWeekend) {
    return {
      title: isRTL ? "مراجعة وتعزيز" : "Review & Reinforce",
      subject: slice?.subject ?? "",
      color: "#a78bfa",
      action: isRTL ? "راجع ملاحظاتك وحل تمريناً" : "Review notes and solve a practice exercise",
    };
  }

  if (course) {
    const milestone = phase?.milestones?.[weekInPhase % (phase.milestones.length || 1)] ?? "";
    return {
      title: course.title,
      subject: course.platform,
      color: slice?.color ?? "#f97316",
      action: milestone || course.focus || (isRTL ? "ادرس الوحدة التالية" : "Study the next module"),
    };
  }

  return {
    title: phase?.goal ?? (isRTL ? "تعلم يومي" : "Daily Learning"),
    subject: slice?.subject ?? "",
    color: slice?.color ?? "#f97316",
    action: isRTL ? "أكمل مهمة اليوم" : "Complete today's task",
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
}

function MonthlyCalendar({ year, month, planStartDate, tracking, plan, onToggle, isRTL }: CalendarProps) {
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

/* ── Quiz Modal ────────────────────────────────────── */
interface QuizModalProps {
  topic: string;
  dayTask: string;
  courseTitle: string;
  isRTL: boolean;
  onClose: () => void;
  onComplete: () => void;
}

function QuizModal({ topic, dayTask, courseTitle, isRTL, onClose, onComplete }: QuizModalProps) {
  // step: "context" → ask what they studied | "loading" → generating | "quiz" → playing | "done"
  const [step, setStep] = useState<"context" | "loading" | "quiz" | "done">("context");
  const [lectureNotes, setLectureNotes] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [error, setError] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);

  async function startQuiz() {
    setStep("loading");
    try {
      const res = await fetch("/api/ai/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          dayTask,
          courseTitle,
          lectureNotes: lectureNotes.trim() || undefined,
          language: isRTL ? "ar" : "en",
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setQuestions(data.questions ?? []);
      setStep("quiz");
    } catch {
      setError(true);
      setStep("quiz");
    }
  }

  const currentQ = questions[currentIdx];
  const totalQ = questions.length;

  function handleSelect(idx: number) {
    if (answered || !currentQ) return;
    setSelected(idx);
    setAnswered(true);
    if (idx === currentQ.correctIndex) setScore((s) => s + 1);
  }

  function handleNext() {
    if (currentIdx + 1 >= totalQ) {
      setStep("done");
    } else {
      setCurrentIdx((i) => i + 1);
      setSelected(null);
      setAnswered(false);
    }
  }

  function handleRetry() {
    setCurrentIdx(0);
    setSelected(null);
    setAnswered(false);
    setScore(0);
    setStep("quiz");
  }

  const optionStyle = (idx: number) => {
    if (!answered) return { bg: "var(--bg-base)", border: "var(--border-subtle)", color: "var(--text-primary)" };
    if (!currentQ) return { bg: "var(--bg-base)", border: "var(--border-subtle)", color: "var(--text-primary)" };
    if (idx === currentQ.correctIndex) return { bg: "rgba(74,222,128,0.12)", border: "rgba(74,222,128,0.5)", color: "#4ade80" };
    if (idx === selected) return { bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.4)", color: "#ef4444" };
    return { bg: "var(--bg-base)", border: "var(--border-subtle)", color: "var(--text-muted)" };
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.96 }}
        className="w-full max-w-lg rounded-3xl overflow-hidden flex flex-col"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", maxHeight: "92vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#f97316,#fb923c)" }}>
              <Zap size={13} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "#f97316" }}>
                {isRTL ? "اختبار اليوم" : "Daily Quiz"}
              </p>
              <p className="text-xs truncate max-w-[220px]" style={{ color: "var(--text-muted)" }}>{topic}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-xl flex items-center justify-center transition-all hover:opacity-70"
            style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto">
          {/* ── Step 1: Context ── */}
          {step === "context" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="text-center mb-5">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)" }}>
                  <BookOpen size={24} style={{ color: "#f97316" }} />
                </div>
                <h3 className="text-base font-bold mb-1" style={{ color: "var(--text-primary)" }}>
                  {isRTL ? "ماذا درست اليوم؟" : "What did you study today?"}
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {isRTL
                    ? "اكتب ما تعلمته من المحاضرة أو الدورة — سيساعدنا ذلك على توليد أسئلة مخصصة لك. هذا اختياري."
                    : "Describe what you covered in this lecture or lesson — we'll use it to tailor your quiz. Optional."}
                </p>
              </div>

              <textarea
                value={lectureNotes}
                onChange={(e) => setLectureNotes(e.target.value)}
                rows={4}
                placeholder={isRTL
                  ? "مثال: تعلمت اليوم عن بنية KNX، كيفية برمجة المجموعات في ETS، والفرق بين TP وIP..."
                  : "e.g. Covered KNX topology, learned how group addresses work in ETS, difference between TP and IP line..."}
                className="w-full text-sm px-4 py-3 rounded-2xl bg-transparent resize-none outline-none mb-4"
                style={{
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-primary)",
                  background: "var(--bg-base)",
                }}
                dir={isRTL ? "rtl" : "ltr"}
              />

              <div className="flex gap-3">
                <button
                  onClick={() => startQuiz()}
                  className="flex-1 py-3 rounded-2xl text-sm font-bold transition-all hover:opacity-80"
                  style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
                >
                  {isRTL ? "تخطي — ابدأ الاختبار" : "Skip — Start Quiz"}
                </button>
                <button
                  onClick={() => startQuiz()}
                  disabled={!lectureNotes.trim()}
                  className="flex-1 py-3 rounded-2xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg,#f97316,#fb923c)", color: "#0f0600" }}
                >
                  {isRTL ? "توليد اختبار مخصص" : "Generate Tailored Quiz"}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Step: Loading ── */}
          {step === "loading" && (
            <div className="flex flex-col items-center justify-center py-14 gap-4">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: "#f97316" }} />
                <div className="absolute inset-2 rounded-full flex items-center justify-center" style={{ background: "rgba(249,115,22,0.1)" }}>
                  <Zap size={12} style={{ color: "#f97316" }} />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {isRTL ? "Claude يحلّل ملاحظاتك..." : "Claude is analysing your notes..."}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  {isRTL ? "يتم توليد 5 أسئلة مخصصة لك" : "Generating 5 personalised questions"}
                </p>
              </div>
            </div>
          )}

          {/* ── Step: Quiz Error ── */}
          {step === "quiz" && error && (
            <div className="text-center py-8">
              <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                {isRTL ? "تعذّر توليد الأسئلة. حاول مرة أخرى." : "Could not generate questions. Please try again."}
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
              >
                {isRTL ? "إغلاق" : "Close"}
              </button>
            </div>
          )}

          {/* ── Step: Quiz Playing ── */}
          {step === "quiz" && !error && currentQ && (
            <div>
              {/* Progress */}
              <div className="flex items-center gap-3 mb-5">
                <span className="text-xs font-bold w-10 text-center" style={{ color: "var(--text-muted)" }}>
                  {currentIdx + 1}/{totalQ}
                </span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-base)" }}>
                  <motion.div
                    className="h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentIdx + 1) / totalQ) * 100}%` }}
                    style={{ background: "linear-gradient(90deg,#f97316,#fb923c)" }}
                  />
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: totalQ }).map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full transition-colors"
                      style={{ background: i < currentIdx ? "#f97316" : i === currentIdx ? "#fb923c" : "var(--border-subtle)" }} />
                  ))}
                </div>
              </div>

              <motion.p
                key={currentIdx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm font-semibold leading-relaxed mb-5"
                style={{ color: "var(--text-primary)" }}
              >
                {currentQ.question}
              </motion.p>

              <div className="space-y-2.5 mb-4">
                {currentQ.options.map((opt, idx) => {
                  const c = optionStyle(idx);
                  return (
                    <motion.button
                      key={idx}
                      whileTap={answered ? {} : { scale: 0.98 }}
                      onClick={() => handleSelect(idx)}
                      className="w-full text-start px-4 py-3.5 rounded-2xl text-sm font-medium transition-all"
                      style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color, cursor: answered ? "default" : "pointer" }}
                    >
                      <span className="font-bold me-2">{["A", "B", "C", "D"][idx]}.</span>
                      {opt}
                    </motion.button>
                  );
                })}
              </div>

              <AnimatePresence>
                {answered && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div
                      className="p-3.5 rounded-2xl mb-4 text-xs leading-relaxed"
                      style={{
                        background: selected === currentQ.correctIndex ? "rgba(74,222,128,0.08)" : "rgba(167,139,250,0.08)",
                        border: `1px solid ${selected === currentQ.correctIndex ? "rgba(74,222,128,0.3)" : "rgba(167,139,250,0.25)"}`,
                        color: "var(--text-secondary)",
                      }}
                    >
                      <span className="font-bold" style={{ color: selected === currentQ.correctIndex ? "#4ade80" : "#a78bfa" }}>
                        {selected === currentQ.correctIndex ? (isRTL ? "✓ صحيح! " : "✓ Correct! ") : (isRTL ? "✗ خطأ. " : "✗ Incorrect. ")}
                      </span>
                      {currentQ.explanation}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {answered && (
                <button
                  onClick={handleNext}
                  className="w-full py-3 rounded-2xl text-sm font-bold transition-all hover:opacity-80"
                  style={{ background: "linear-gradient(135deg,#f97316,#fb923c)", color: "#0f0600" }}
                >
                  {currentIdx + 1 >= totalQ ? (isRTL ? "عرض النتيجة" : "See Results") : (isRTL ? "التالي" : "Next")}
                </button>
              )}
            </div>
          )}

          {/* ── Step: Done ── */}
          {step === "done" && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{
                  background: score >= totalQ * 0.8
                    ? "linear-gradient(135deg,#f97316,#fb923c)"
                    : score >= totalQ * 0.5
                      ? "linear-gradient(135deg,#f59e0b,#fbbf24)"
                      : "linear-gradient(135deg,#6366f1,#a78bfa)",
                  boxShadow: `0 0 30px ${score >= totalQ * 0.8 ? "rgba(249,115,22,0.35)" : score >= totalQ * 0.5 ? "rgba(245,158,11,0.35)" : "rgba(99,102,241,0.35)"}`,
                }}
              >
                <Star size={32} className="text-white" />
              </div>
              <h3 className="text-3xl font-black mb-1" style={{ color: "var(--text-primary)" }}>{score}/{totalQ}</h3>
              <p className="text-sm font-bold mb-1" style={{ color: score >= totalQ * 0.8 ? "#f97316" : score >= totalQ * 0.5 ? "#f59e0b" : "#a78bfa" }}>
                {score >= totalQ * 0.8
                  ? (isRTL ? "ممتاز! أنت تتقن هذا الموضوع" : "Excellent! You've mastered this topic")
                  : score >= totalQ * 0.5
                    ? (isRTL ? "جيد! راجع النقاط الضعيفة" : "Good! Review the weak spots")
                    : (isRTL ? "راجع الموضوع مجدداً" : "Review this topic again")}
              </p>
              <p className="text-xs mb-7" style={{ color: "var(--text-muted)" }}>
                {isRTL ? `${score} من ${totalQ} إجابات صحيحة` : `${score} out of ${totalQ} correct`}
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleRetry}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold"
                  style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
                >
                  <RotateCcw size={13} />
                  {isRTL ? "إعادة" : "Retry"}
                </button>
                <button
                  onClick={() => { onComplete(); onClose(); }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold hover:opacity-80 transition-all"
                  style={{ background: "linear-gradient(135deg,#f97316,#fb923c)", color: "#0f0600" }}
                >
                  <CheckCircle size={13} />
                  {isRTL ? "إتمام اليوم" : "Mark Day Done"}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/* ── Weekly Schedule View ──────────────────────────── */
function WeeklyScheduleView({
  plan,
  tracking,
  planStartDate,
  onToggle,
  isRTL,
}: {
  plan: Plan;
  tracking: Map<string, boolean>;
  planStartDate: Date;
  onToggle: (dateKey: string, taskKey: string, completed: boolean) => void;
  isRTL: boolean;
}) {
  const weeks: WeekSchedule[] = plan.weeklySchedule ?? [];
  const [activeWeek, setActiveWeek] = useState(0);
  const [selectedDayNum, setSelectedDayNum] = useState<number | null>(null);
  const [quizDay, setQuizDay] = useState<WeekDay | null>(null);

  if (weeks.length === 0) return null;

  const week = weeks[activeWeek];
  if (!week) return null;

  const TYPE_COLORS: Record<string, string> = { study: "#4f9eff", practice: "#f97316", review: "#a78bfa", rest: "#6b7280" };
  const TYPE_ICONS: Record<string, React.ReactNode> = {
    study: <BookOpen size={12} />,
    practice: <Play size={12} />,
    review: <RotateCcw size={12} />,
    rest: <Star size={12} />,
  };

  function getDateKey(weekIdx: number, dayNum: number): string {
    const offset = weekIdx * 7 + (dayNum - 1);
    const d = new Date(planStartDate);
    d.setDate(d.getDate() + offset);
    return toDateKey(d);
  }

  function isDone(weekIdx: number, dayNum: number): boolean {
    return tracking.get(getDateKey(weekIdx, dayNum)) ?? false;
  }

  const completedCount = week.days.filter((d) => isDone(activeWeek, d.dayNumber)).length;
  const allDone = completedCount === week.days.length;

  function handleToggleDay(day: WeekDay) {
    const key = getDateKey(activeWeek, day.dayNumber);
    const taskKey = `${key}-daily`;
    onToggle(key, taskKey, !(tracking.get(key) ?? false));
  }

  const selectedDay = week.days.find((d) => d.dayNumber === selectedDayNum) ?? null;

  return (
    <>
      <AnimatePresence>
        {quizDay && (
          <QuizModal
            topic={quizDay.quizTopic}
            dayTask={quizDay.task}
            courseTitle={quizDay.courseRef}
            isRTL={isRTL}
            onClose={() => setQuizDay(null)}
            onComplete={() => handleToggleDay(quizDay)}
          />
        )}
      </AnimatePresence>

      <Card delay={0.25}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <CalendarDays size={14} style={{ color: "#4f9eff" }} />
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "#4f9eff" }}>
                {isRTL ? "جدولك الأسبوعي" : "Your Weekly Schedule"}
              </p>
            </div>
            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{week.theme}</p>
            {week.certification && (
              <p className="text-[11px] mt-0.5 font-medium" style={{ color: "#f5a623" }}>
                🏆 {week.certification}
              </p>
            )}
          </div>

          {/* Week selector */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => { setActiveWeek((w) => Math.max(0, w - 1)); setSelectedDayNum(null); }}
              disabled={activeWeek === 0}
              className="w-7 h-7 rounded-xl flex items-center justify-center disabled:opacity-30"
              style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}
            >
              <ChevronLeft size={13} />
            </button>
            <span className="text-xs font-bold px-2" style={{ color: "var(--text-primary)" }}>
              {isRTL ? `أسبوع ${week.week}` : `Week ${week.week}`}
            </span>
            <button
              onClick={() => { setActiveWeek((w) => Math.min(weeks.length - 1, w + 1)); setSelectedDayNum(null); }}
              disabled={activeWeek >= weeks.length - 1}
              className="w-7 h-7 rounded-xl flex items-center justify-center disabled:opacity-30"
              style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-base)" }}>
            <motion.div
              className="h-2 rounded-full"
              animate={{ width: `${(completedCount / week.days.length) * 100}%` }}
              style={{ background: "linear-gradient(90deg,#f97316,#fb923c)" }}
            />
          </div>
          <span className="text-xs font-bold flex-shrink-0" style={{ color: allDone ? "#f97316" : "var(--text-muted)" }}>
            {completedCount}/{week.days.length}
          </span>
        </div>

        {/* Advance banner — only when week is fully done */}
        <AnimatePresence>
          {allDone && activeWeek < weeks.length - 1 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-4"
            >
              <div
                className="flex items-center justify-between p-3 rounded-2xl"
                style={{ background: "linear-gradient(135deg,rgba(249,115,22,0.12),rgba(251,146,60,0.08))", border: "1px solid rgba(249,115,22,0.3)" }}
              >
                <p className="text-xs font-bold" style={{ color: "#f97316" }}>
                  {isRTL ? "أتممت هذا الأسبوع! جاهز للأسبوع التالي؟" : "Week complete! Ready for the next one?"}
                </p>
                <button
                  onClick={() => { setActiveWeek((w) => w + 1); setSelectedDayNum(null); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold hover:opacity-80 transition-all flex-shrink-0"
                  style={{ background: "linear-gradient(135deg,#f97316,#fb923c)", color: "#0f0600" }}
                >
                  {isRTL ? `أسبوع ${week.week + 1}` : `Week ${week.week + 1}`}
                  <ChevronRight size={11} />
                </button>
              </div>
            </motion.div>
          )}
          {allDone && activeWeek >= weeks.length - 1 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-4"
            >
              <div
                className="p-3 rounded-2xl text-center"
                style={{ background: "linear-gradient(135deg,rgba(249,115,22,0.12),rgba(251,146,60,0.08))", border: "1px solid rgba(249,115,22,0.3)" }}
              >
                <p className="text-xs font-bold" style={{ color: "#f97316" }}>
                  {isRTL ? "🎉 أتممت الشهر الأول! أنت على المسار الصحيح تماماً." : "🎉 Month 1 complete! You are right on track."}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 7 Day Cards */}
        <div className="grid grid-cols-7 gap-1.5 mb-4">
          {week.days.map((day) => {
            const done = isDone(activeWeek, day.dayNumber);
            const color = TYPE_COLORS[day.type] ?? "#6b7280";
            const isSelected = selectedDayNum === day.dayNumber;
            const isRest = day.type === "rest";

            return (
              <motion.button
                key={day.dayNumber}
                whileTap={{ scale: 0.94 }}
                onClick={() => setSelectedDayNum(isSelected ? null : day.dayNumber)}
                className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-2xl transition-all"
                style={{
                  background: done
                    ? `${color}22`
                    : isSelected
                      ? `${color}14`
                      : "var(--bg-base)",
                  border: `1px solid ${done ? `${color}50` : isSelected ? `${color}60` : "var(--border-subtle)"}`,
                  boxShadow: isSelected ? `0 0 12px ${color}30` : undefined,
                  opacity: isRest && !done ? 0.6 : 1,
                }}
              >
                {/* Icon or checkmark */}
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: done ? color : `${color}18`, color: done ? "#fff" : color }}
                >
                  {done ? <CheckCircle size={12} /> : TYPE_ICONS[day.type]}
                </div>

                {/* Day number */}
                <span className="text-[11px] font-black leading-none" style={{ color: done ? color : isSelected ? color : "var(--text-muted)" }}>
                  {isRTL ? `${day.dayNumber}` : `D${day.dayNumber}`}
                </span>

                {/* Quiz badge */}
                {day.hasQuiz && !done && (
                  <span className="w-1 h-1 rounded-full" style={{ background: "#fb923c" }} />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Type legend */}
        <div className="flex items-center gap-3 flex-wrap mb-4">
          {Object.entries(TYPE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm" style={{ background: color }} />
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                {isRTL
                  ? { study: "دراسة", practice: "تطبيق", review: "مراجعة", rest: "راحة" }[type]
                  : { study: "Study", practice: "Practice", review: "Review", rest: "Rest" }[type]}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#fb923c" }} />
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{isRTL ? "اختبار" : "Quiz"}</span>
          </div>
        </div>

        {/* Selected Day Detail */}
        <AnimatePresence>
          {selectedDay && (
            <motion.div
              key={selectedDay.dayNumber}
              initial={{ opacity: 0, y: -6, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -6, height: 0 }}
              className="overflow-hidden"
            >
              <div
                className="p-4 rounded-2xl"
                style={{
                  background: `${TYPE_COLORS[selectedDay.type] ?? "#6b7280"}0e`,
                  border: `1px solid ${TYPE_COLORS[selectedDay.type] ?? "#6b7280"}30`,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-lg"
                        style={{ background: `${TYPE_COLORS[selectedDay.type]}20`, color: TYPE_COLORS[selectedDay.type] ?? "#6b7280" }}
                      >
                        {isRTL
                          ? { study: "دراسة", practice: "تطبيق", review: "مراجعة", rest: "راحة" }[selectedDay.type]
                          : { study: "Study", practice: "Practice", review: "Review", rest: "Rest" }[selectedDay.type]}
                      </span>
                      <span className="text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>
                        {isRTL ? `اليوم ${selectedDay.dayNumber}` : `Day ${selectedDay.dayNumber}`} · {selectedDay.label}
                      </span>
                      {selectedDay.duration && selectedDay.duration !== "0h" && (
                        <span className="text-[10px] flex items-center gap-0.5" style={{ color: "var(--text-muted)" }}>
                          <Clock size={9} /> {selectedDay.duration}
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-medium leading-relaxed mb-2" style={{ color: "var(--text-primary)" }}>
                      {selectedDay.task}
                    </p>

                    {selectedDay.courseRef && (
                      <div className="flex items-center gap-1.5 mb-3">
                        <BookOpen size={11} style={{ color: "#a78bfa", flexShrink: 0 }} />
                        {selectedDay.courseUrl ? (
                          <a
                            href={selectedDay.courseUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium hover:underline flex items-center gap-1"
                            style={{ color: "#a78bfa" }}
                          >
                            {selectedDay.courseRef}
                            <ExternalLink size={10} />
                          </a>
                        ) : (
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{selectedDay.courseRef}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                {selectedDay.type !== "rest" && (
                  <div className="flex items-center gap-2 pt-1">
                    {selectedDay.hasQuiz && !isDone(activeWeek, selectedDay.dayNumber) && (
                      <button
                        onClick={() => setQuizDay(selectedDay)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80"
                        style={{ background: "linear-gradient(135deg,#f97316,#fb923c)", color: "#0f0600" }}
                      >
                        <Zap size={11} />
                        {isRTL ? "ابدأ الاختبار" : "Take Quiz"}
                      </button>
                    )}
                    <button
                      onClick={() => handleToggleDay(selectedDay)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80"
                      style={
                        isDone(activeWeek, selectedDay.dayNumber)
                          ? { background: "rgba(249,115,22,0.15)", color: "#f97316", border: "1px solid rgba(249,115,22,0.3)" }
                          : { background: "var(--bg-base)", color: "var(--text-muted)", border: "1px solid var(--border-subtle)" }
                      }
                    >
                      {isDone(activeWeek, selectedDay.dayNumber)
                        ? <><CheckCircle size={11} /> {isRTL ? "مكتمل" : "Completed"}</>
                        : <><Circle size={11} /> {isRTL ? "وضع علامة مكتمل" : "Mark as Done"}</>}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer hint */}
        {!allDone && (
          <p className="text-[10px] text-center mt-3" style={{ color: "var(--text-muted)" }}>
            {isRTL
              ? `أكمل جميع الأيام السبعة للانتقال إلى الأسبوع ${week.week + 1}`
              : `Complete all 7 days to advance to Week ${week.week + 1}`}
          </p>
        )}
      </Card>
    </>
  );
}

/* ── Main Export ───────────────────────────────────── */
export function ScheduleClient({

  const currentQ = questions[currentIdx];
  const totalQ = questions.length;

  function handleSelect(idx: number) {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    if (idx === currentQ.correctIndex) setScore((s) => s + 1);
  }

  function handleNext() {
    if (currentIdx + 1 >= totalQ) {
      setFinished(true);
    } else {
      setCurrentIdx((i) => i + 1);
      setSelected(null);
      setAnswered(false);
    }
  }

  const optionColors = (idx: number) => {
    if (!answered) return { bg: "var(--bg-base)", border: "var(--border-subtle)", color: "var(--text-primary)" };
    if (idx === currentQ.correctIndex) return { bg: "rgba(74,222,128,0.12)", border: "rgba(74,222,128,0.5)", color: "#4ade80" };
    if (idx === selected) return { bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.4)", color: "#ef4444" };
    return { bg: "var(--bg-base)", border: "var(--border-subtle)", color: "var(--text-muted)" };
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.97 }}
        className="w-full max-w-lg rounded-3xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", maxHeight: "90vh", overflowY: "auto" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#f97316,#fb923c)" }}>
              <Zap size={13} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "#f97316" }}>
                {isRTL ? "اختبار اليوم" : "Daily Quiz"}
              </p>
              <p className="text-xs truncate max-w-[220px]" style={{ color: "var(--text-muted)" }}>{topic}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-70"
            style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-5">
          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: "#f97316" }} />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {isRTL ? "يتم توليد الأسئلة..." : "Generating questions..."}
              </p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="text-center py-8">
              <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                {isRTL ? "تعذّر توليد الأسئلة. حاول مرة أخرى." : "Could not generate questions. Please try again."}
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-bold"
                style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
              >
                {isRTL ? "إغلاق" : "Close"}
              </button>
            </div>
          )}

          {/* Finished */}
          {!loading && !error && finished && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6"
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: score >= totalQ * 0.8 ? "linear-gradient(135deg,#f97316,#fb923c)" : score >= totalQ * 0.5 ? "linear-gradient(135deg,#f59e0b,#fbbf24)" : "linear-gradient(135deg,#6366f1,#a78bfa)" }}
              >
                <Star size={28} className="text-white" />
              </div>
              <h3 className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
                {isRTL ? `${score} / ${totalQ}` : `${score} / ${totalQ}`}
              </h3>
              <p className="text-sm mb-1 font-semibold" style={{ color: score >= totalQ * 0.8 ? "#f97316" : score >= totalQ * 0.5 ? "#f59e0b" : "#a78bfa" }}>
                {score >= totalQ * 0.8
                  ? (isRTL ? "ممتاز! أنت تتقن هذا الموضوع 🔥" : "Excellent! You've mastered this topic 🔥")
                  : score >= totalQ * 0.5
                    ? (isRTL ? "جيد! راجع النقاط الضعيفة 💪" : "Good! Review the weak spots 💪")
                    : (isRTL ? "راجع الموضوع مرة أخرى 📚" : "Review this topic again 📚")}
              </p>
              <p className="text-xs mb-6" style={{ color: "var(--text-muted)" }}>
                {isRTL ? `أجبت بشكل صحيح على ${score} من ${totalQ} أسئلة` : `You answered ${score} out of ${totalQ} correctly`}
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => { setCurrentIdx(0); setSelected(null); setAnswered(false); setScore(0); setFinished(false); }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80"
                  style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
                >
                  <RotateCcw size={13} />
                  {isRTL ? "إعادة" : "Retry"}
                </button>
                <button
                  onClick={() => { onComplete(); onClose(); }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80"
                  style={{ background: "linear-gradient(135deg,#f97316,#fb923c)", color: "#0f0600" }}
                >
                  <CheckCircle size={13} />
                  {isRTL ? "إتمام اليوم" : "Mark Day Done"}
                </button>
              </div>
            </motion.div>
          )}

          {/* Question */}
          {!loading && !error && !finished && currentQ && (
            <div>
              {/* Progress */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>
                  {isRTL ? `${currentIdx + 1} / ${totalQ}` : `${currentIdx + 1} / ${totalQ}`}
                </span>
                <div className="flex-1 mx-3 h-1.5 rounded-full" style={{ background: "var(--bg-base)" }}>
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{ width: `${((currentIdx + 1) / totalQ) * 100}%`, background: "linear-gradient(90deg,#f97316,#fb923c)" }}
                  />
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: totalQ }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: i < currentIdx ? "#f97316" : i === currentIdx ? "#fb923c" : "var(--border-subtle)" }}
                    />
                  ))}
                </div>
              </div>

              {/* Question text */}
              <motion.p
                key={currentIdx}
                initial={{ opacity: 0, x: isRTL ? -10 : 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-sm font-semibold leading-relaxed mb-4"
                style={{ color: "var(--text-primary)" }}
              >
                {currentQ.question}
              </motion.p>

              {/* Options */}
              <div className="space-y-2.5 mb-4">
                {currentQ.options.map((opt, idx) => {
                  const c = optionColors(idx);
                  return (
                    <motion.button
                      key={idx}
                      whileTap={answered ? {} : { scale: 0.98 }}
                      onClick={() => handleSelect(idx)}
                      className="w-full text-start px-4 py-3 rounded-2xl text-sm font-medium transition-all"
                      style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color, cursor: answered ? "default" : "pointer" }}
                    >
                      <span className="font-bold me-2" style={{ color: c.color }}>
                        {["A", "B", "C", "D"][idx]}.
                      </span>
                      {opt}
                    </motion.button>
                  );
                })}
              </div>

              {/* Explanation */}
              <AnimatePresence>
                {answered && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div
                      className="p-3 rounded-2xl mb-4 text-xs leading-relaxed"
                      style={{
                        background: selected === currentQ.correctIndex ? "rgba(74,222,128,0.08)" : "rgba(167,139,250,0.08)",
                        border: `1px solid ${selected === currentQ.correctIndex ? "rgba(74,222,128,0.3)" : "rgba(167,139,250,0.25)"}`,
                        color: "var(--text-secondary)",
                      }}
                    >
                      <span className="font-bold" style={{ color: selected === currentQ.correctIndex ? "#4ade80" : "#a78bfa" }}>
                        {selected === currentQ.correctIndex
                          ? (isRTL ? "✓ صحيح! " : "✓ Correct! ")
                          : (isRTL ? "✗ خطأ. " : "✗ Incorrect. ")}
                      </span>
                      {currentQ.explanation}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {answered && (
                <button
                  onClick={handleNext}
                  className="w-full py-3 rounded-2xl text-sm font-bold transition-all hover:opacity-80"
                  style={{ background: "linear-gradient(135deg,#f97316,#fb923c)", color: "#0f0600" }}
                >
                  {currentIdx + 1 >= totalQ
                    ? (isRTL ? "عرض النتيجة" : "See Results")
                    : (isRTL ? "السؤال التالي" : "Next Question")}
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/* ── Weekly Schedule View ──────────────────────────── */
function WeeklyScheduleView({
  plan,
  tracking,
  planStartDate,
  onToggle,
  isRTL,
}: {
  plan: Plan;
  tracking: Map<string, boolean>;
  planStartDate: Date;
  onToggle: (dateKey: string, taskKey: string, completed: boolean) => void;
  isRTL: boolean;
}) {
  const weeks: WeekSchedule[] = plan.weeklySchedule ?? [];
  const [activeWeek, setActiveWeek] = useState(0);
  const [quizDay, setQuizDay] = useState<WeekDay | null>(null);

  if (weeks.length === 0) return null;

  const week = weeks[activeWeek];
  if (!week) return null;

  const TYPE_COLORS: Record<string, string> = {
    study: "#4f9eff",
    practice: "#f97316",
    review: "#a78bfa",
    rest: "#6b7280",
  };

  const TYPE_LABELS_EN: Record<string, string> = {
    study: "Study",
    practice: "Practice",
    review: "Review",
    rest: "Rest",
  };

  const TYPE_LABELS_AR: Record<string, string> = {
    study: "دراسة",
    practice: "تطبيق",
    review: "مراجعة",
    rest: "راحة",
  };

  // Map week+day to actual calendar date key
  function getDateKeyForDay(weekIndex: number, dayNumber: number): string {
    const dayOffset = weekIndex * 7 + (dayNumber - 1);
    const d = new Date(planStartDate);
    d.setDate(d.getDate() + dayOffset);
    return toDateKey(d);
  }

  function isDayDone(weekIndex: number, dayNumber: number): boolean {
    const key = getDateKeyForDay(weekIndex, dayNumber);
    return tracking.get(key) ?? false;
  }

  function handleMarkDone(day: WeekDay) {
    const key = getDateKeyForDay(activeWeek, day.dayNumber);
    const taskKey = `${key}-daily`;
    const current = tracking.get(key) ?? false;
    onToggle(key, taskKey, !current);
  }

  return (
    <div>
      <AnimatePresence>
        {quizDay && (
          <QuizModal
            topic={quizDay.quizTopic}
            dayTask={quizDay.task}
            courseTitle={quizDay.courseRef}
            isRTL={isRTL}
            onClose={() => setQuizDay(null)}
            onComplete={() => {
              handleMarkDone(quizDay);
              setQuizDay(null);
            }}
          />
        )}
      </AnimatePresence>

      <Card delay={0.2}>
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(79,158,255,0.15)" }}>
            <CalendarDays size={14} style={{ color: "#4f9eff" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "#4f9eff" }}>
              {isRTL ? "الجدول التفصيلي أسبوع بأسبوع" : "Week-by-Week Schedule"}
            </p>
            <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
              {week.theme}
            </p>
          </div>
          {week.certification && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-lg flex-shrink-0"
              style={{ background: "rgba(245,166,35,0.1)", color: "#f5a623", border: "1px solid rgba(245,166,35,0.3)" }}
            >
              🏆 {week.certification}
            </span>
          )}
        </div>

        {/* Week tabs */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
          {weeks.map((w, i) => (
            <button
              key={i}
              onClick={() => setActiveWeek(i)}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
              style={
                activeWeek === i
                  ? { background: "linear-gradient(135deg,#4f9eff22,#4f9eff11)", border: "1px solid rgba(79,158,255,0.5)", color: "#4f9eff" }
                  : { background: "var(--bg-base)", border: "1px solid var(--border-subtle)", color: "var(--text-muted)" }
              }
            >
              {isRTL ? `أسبوع ${w.week}` : `Week ${w.week}`}
            </button>
          ))}
        </div>

        {/* Days */}
        <div className="space-y-2">
          {week.days.map((day) => {
            const done = isDayDone(activeWeek, day.dayNumber);
            const typeColor = TYPE_COLORS[day.type] ?? "#6b7280";
            const typeLabel = isRTL ? TYPE_LABELS_AR[day.type] : TYPE_LABELS_EN[day.type];
            const isRest = day.type === "rest";

            return (
              <motion.div
                key={day.dayNumber}
                initial={{ opacity: 0, x: isRTL ? -6 : 6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: day.dayNumber * 0.04 }}
                className="flex items-start gap-3 p-3 rounded-2xl"
                style={{
                  background: done ? `${typeColor}10` : "var(--bg-base)",
                  border: `1px solid ${done ? `${typeColor}30` : "var(--border-subtle)"}`,
                  opacity: isRest ? 0.55 : 1,
                }}
              >
                {/* Day number */}
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: done ? typeColor : `${typeColor}18`, color: done ? "#fff" : typeColor }}
                >
                  {done ? <CheckCircle size={14} /> : day.dayNumber}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                      style={{ background: `${typeColor}18`, color: typeColor }}
                    >
                      {typeLabel}
                    </span>
                    <span className="text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>
                      {day.label}
                    </span>
                    {day.duration && day.duration !== "0h" && (
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        · {day.duration}
                      </span>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: done ? "var(--text-muted)" : "var(--text-secondary)" }}>
                    {day.task}
                  </p>
                  {day.courseRef && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <BookOpen size={10} style={{ color: "#a78bfa", flexShrink: 0 }} />
                      {day.courseUrl ? (
                        <a
                          href={day.courseUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-medium hover:underline truncate flex items-center gap-0.5"
                          style={{ color: "#a78bfa" }}
                        >
                          {day.courseRef}
                          <ExternalLink size={8} />
                        </a>
                      ) : (
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{day.courseRef}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {!isRest && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {day.hasQuiz && !done && (
                      <button
                        onClick={() => setQuizDay(day)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all hover:opacity-80"
                        style={{ background: "linear-gradient(135deg,#f97316,#fb923c)", color: "#0f0600" }}
                      >
                        <Play size={9} />
                        {isRTL ? "اختبار" : "Quiz"}
                      </button>
                    )}
                    <button
                      onClick={() => handleMarkDone(day)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all hover:opacity-80"
                      style={
                        done
                          ? { background: "rgba(249,115,22,0.15)", color: "#f97316", border: "1px solid rgba(249,115,22,0.3)" }
                          : { background: "var(--bg-card)", color: "var(--text-muted)", border: "1px solid var(--border-subtle)" }
                      }
                    >
                      {done
                        ? <><CheckCircle size={9} /> {isRTL ? "تم" : "Done"}</>
                        : <><Circle size={9} /> {isRTL ? "إتمام" : "Mark"}</>}
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </Card>
    </div>
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
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between gap-4">
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
        </div>
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

      {/* Week-by-Week Schedule */}
      {plan.weeklySchedule && plan.weeklySchedule.length > 0 && (
        <WeeklyScheduleView
          plan={plan}
          tracking={trackingMap}
          planStartDate={planStartDate}
          onToggle={handleToggle}
          isRTL={isRTL}
        />
      )}
    </div>
  );
}
