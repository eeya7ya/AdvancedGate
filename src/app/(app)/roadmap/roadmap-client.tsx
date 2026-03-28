"use client";

import { useState, useEffect, createContext, useContext, useMemo } from "react";
import { useLang } from "@/lib/language";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Target, Clock, ArrowRight, ChevronRight, Zap, Brain,
  Map, Bell, BellOff, Mail, RotateCcw, CheckCircle, Loader2,
  CalendarDays, TrendingUp, Globe, BookOpen, AlertTriangle,
  Printer, Flag, Layers, ExternalLink, PlayCircle,
} from "lucide-react";
import { subjects } from "@/lib/data";

/* ── Language / RTL Helper ─────────────────────────────────── */
const RTLContext = createContext(false);
function useRTL() { return useContext(RTLContext); }

/** Strip trailing symbols (+, &, ,, -, etc.) and cap at 3 meaningful words */
function smartLabel(subject: string): string {
  const words = subject.trim().split(/\s+/);
  // Take up to 3 words, filter out words that are only symbols at the end
  let taken = words.slice(0, 3);
  // Remove trailing symbol-only tokens ("+", "&", ",", "-", etc.)
  while (taken.length > 1 && /^[^a-zA-Z0-9\u0600-\u06FF]+$/.test(taken[taken.length - 1])) {
    taken = taken.slice(0, -1);
  }
  return taken.join(" ");
}

const UI_LABELS: Record<string, { en: string; ar: string }> = {
  priorities:     { en: "Learning Priorities",       ar: "أولويات التعلم" },
  timeAlloc:      { en: "Weekly Time Allocation",    ar: "توزيع الوقت الأسبوعي" },
  weeklySchedule: { en: "Suggested Weekly Schedule", ar: "الجدول الأسبوعي المقترح" },
  topicConn:      { en: "Topic Connections",         ar: "روابط المواضيع" },
  market:         { en: "Market Intelligence",       ar: "تحليل السوق" },
  courses:        { en: "Recommended Courses",       ar: "الدورات الموصى بها" },
  roadmap:        { en: "Your Roadmap",              ar: "خارطة طريقك" },
  nextSteps:      { en: "Your Next Steps",           ar: "خطواتك القادمة" },
  scheduleNote:   { en: "Schedule auto-generated from your weekly time allocation. Adjust via your AI Advisor.", ar: "الجدول مُنشأ تلقائياً من توزيع وقتك الأسبوعي. عدّله عبر مستشارك الذكي." },
  todayFocus:     { en: "Today's Focus",             ar: "تركيز اليوم" },
  personalPlan:   { en: "Your Personalized Action Plan", ar: "خطتك الشخصية" },
  rest:           { en: "Rest",                      ar: "راحة" },
  modifyPlan:     { en: "Modify Plan",               ar: "تعديل الخطة" },
};
function t(key: string, isRTL: boolean): string {
  return isRTL ? (UI_LABELS[key]?.ar ?? key) : (UI_LABELS[key]?.en ?? key);
}

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
  url?: string;
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
  const isRTL = useRTL();

  return (
    <SectionCard delay={0.2}>
      <SectionTitle icon={Target} label={t("priorities", isRTL)} color="var(--brand-teal)" />
      <div className="space-y-4">
        {priorities.map((p) => (
          <div key={p.topic}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{p.topic}</span>
              <span className="text-xs font-bold" style={{ color: p.color }}>{p.score}%</span>
            </div>
            <div className="relative h-2.5 rounded-full overflow-hidden" style={{ background: "var(--bg-base)" }}>
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${p.score}%`,
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
  const isRTL = useRTL();
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 500); return () => clearTimeout(t); }, []);

  const r = 70, cx = 100, cy = 100, strokeWidth = 22;
  const circumference = 2 * Math.PI * r;
  const totalHours = Math.round(slices.reduce((s, x) => s + Number(x.hours), 0) * 10) / 10;
  const cumulatives = slices.map((_, i) => Math.round(slices.slice(0, i).reduce((sum, x) => sum + x.percentage, 0) * 100) / 100);

  return (
    <SectionCard delay={0.3}>
      <SectionTitle icon={Clock} label={t("timeAlloc", isRTL)} color="#22d3ee" />
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
  const isRTL = useRTL();

  // Compute uniform row heights: each block-row uses the tallest block in that position
  const maxBlocks = useMemo(
    () => Math.max(...schedule.map((d) => d.blocks.length), 1),
    [schedule]
  );
  const rowHeights = useMemo(
    () =>
      Array.from({ length: maxBlocks }, (_, i) =>
        Math.max(88, Math.max(...schedule.map((d) => (d.blocks[i]?.minutes ?? 0))) * 1.1)
      ),
    [schedule, maxBlocks]
  );

  return (
    <SectionCard delay={0.4}>
      <SectionTitle icon={CalendarDays} label={t("weeklySchedule", isRTL)} color="#a78bfa" />

      {/* Flat 7-column grid — headers first, then one row per block position */}
      <div className="grid grid-cols-7 gap-2">
        {/* ── Day headers ── */}
        {schedule.map(({ day }) => {
          const isWeekend = day === "Sat" || day === "Sun";
          return (
            <div
              key={`h-${day}`}
              className="rounded-lg py-2 text-center"
              style={{
                background: isWeekend ? "rgba(167,139,250,0.1)" : "rgba(34,211,238,0.08)",
                border: `1px solid ${isWeekend ? "rgba(167,139,250,0.25)" : "rgba(34,211,238,0.2)"}`,
              }}
            >
              <p className="text-xs font-bold" style={{ color: isWeekend ? "#a78bfa" : "#22d3ee" }}>{day}</p>
            </div>
          );
        })}

        {/* ── Block rows (each position = same height across all 7 columns) ── */}
        {Array.from({ length: maxBlocks }, (_, bi) =>
          schedule.map(({ day, blocks }) => {
            const b = blocks[bi];
            const isWeekend = day === "Sat" || day === "Sun";
            const rowH = rowHeights[bi];

            if (!b) {
              // Empty slot: keep the row height consistent
              return (
                <div
                  key={`${day}-${bi}-empty`}
                  className="rounded-xl flex items-center justify-center"
                  style={{
                    height: `${rowH}px`,
                    background: "var(--bg-base)",
                    border: `1px dashed ${isWeekend ? "rgba(167,139,250,0.2)" : "var(--border-subtle)"}`,
                  }}
                >
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{t("rest", isRTL)}</p>
                </div>
              );
            }

            return (
              <div
                key={`${day}-${bi}`}
                className="rounded-xl flex flex-col items-center justify-center px-2 text-center gap-1.5"
                style={{
                  height: `${rowH}px`,
                  background: `${b.color}15`,
                  border: `1px solid ${b.color}40`,
                }}
              >
                <p
                  className="text-[11px] font-bold leading-tight w-full text-center"
                  style={{ color: b.color, wordBreak: "break-word" }}
                >
                  {smartLabel(b.subject)}
                </p>
                <p className="text-[11px] font-semibold" style={{ color: "var(--text-secondary)" }}>
                  {b.minutes >= 60
                    ? `${(b.minutes / 60).toFixed(1).replace(/\.0$/, "")}h`
                    : `${b.minutes}m`}
                </p>
              </div>
            );
          })
        )}
      </div>

      <p className="text-xs mt-4" style={{ color: "var(--text-muted)" }}>
        {t("scheduleNote", isRTL)}
      </p>
    </SectionCard>
  );
}

function TopicConnections({ links }: { links: TopicLink[] }) {
  const isRTL = useRTL();
  return (
    <SectionCard delay={0.5}>
      <SectionTitle icon={Zap} label={t("topicConn", isRTL)} color="#a78bfa" />
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
            <div className="flex flex-col gap-2 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                  style={{ background: "rgba(0,212,161,0.12)", color: "#00d4a1" }}>{link.from}</span>
                <ChevronRight size={13} style={{ color: "var(--text-muted)" }} />
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                  style={{ background: "rgba(34,211,238,0.12)", color: "#22d3ee" }}>{link.to}</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{link.bridge}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </SectionCard>
  );
}

/* ── Market Insights ───────────────────────────────────────── */
function MarketInsightsSection({ insights }: { insights: MarketInsights }) {
  const isRTL = useRTL();
  return (
    <SectionCard delay={0.35}>
      <SectionTitle icon={Globe} label={t("market", isRTL)} color="#22d3ee" />
      {insights.notice && (
        <div className="mb-5 px-4 py-3 rounded-xl"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)" }}>
          <div className="flex items-center gap-2 mb-1.5">
            <AlertTriangle size={13} style={{ color: "#f59e0b" }} />
            <span className="text-xs font-bold tracking-wide" style={{ color: "#f59e0b" }}>
              {isRTL ? "تنبيه السوق" : "Market Notice"}
            </span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "#fbbf24" }}>{insights.notice}</p>
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div className="rounded-xl p-4" style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)" }}>
          <p className="text-xs font-bold mb-1.5" style={{ color: "#00d4a1" }}>{isRTL ? "الطلب المحلي" : "Local Demand"}</p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{insights.localDemand}</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)" }}>
          <p className="text-xs font-bold mb-1.5" style={{ color: "#22d3ee" }}>{isRTL ? "الطلب العالمي" : "Global Demand"}</p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{insights.globalDemand}</p>
        </div>
      </div>
      <div className="rounded-xl p-4 mb-4" style={{ background: "rgba(0,212,161,0.06)", border: "1px solid rgba(0,212,161,0.18)" }}>
        <p className="text-xs font-bold mb-1" style={{ color: "#00d4a1" }}>{isRTL ? "نطاق الدخل المتوقع" : "Expected Income Range"}</p>
        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{insights.salaryRange}</p>
      </div>
      <div className="rounded-xl p-4" style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)" }}>
        <p className="text-xs font-bold mb-1.5" style={{ color: "#a78bfa" }}>{isRTL ? "التوصية الاستراتيجية" : "Strategic Recommendation"}</p>
        <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{insights.recommendation}</p>
      </div>
    </SectionCard>
  );
}

/* ── Platform-specific search URL fallback ─────────────────── */
function getPlatformSearchUrl(platform: string, title: string): string {
  const q = encodeURIComponent(title);
  const p = platform.toLowerCase();
  if (p.includes("udemy"))            return `https://www.udemy.com/courses/search/?q=${q}`;
  if (p.includes("coursera"))         return `https://www.coursera.org/search?query=${q}`;
  if (p.includes("youtube"))          return `https://www.youtube.com/results?search_query=${q}`;
  if (p.includes("linkedin"))         return `https://www.linkedin.com/learning/search?keywords=${q}`;
  if (p.includes("pluralsight"))      return `https://www.pluralsight.com/search?q=${q}`;
  if (p.includes("edx"))              return `https://www.edx.org/search?q=${q}`;
  if (p.includes("freecodecamp"))     return `https://www.freecodecamp.org/news/search/?query=${q}`;
  if (p.includes("khan"))             return `https://www.khanacademy.org/search?page_search_query=${q}`;
  if (p.includes("cisco"))            return `https://u.cisco.com/search?term=${q}`;
  if (p.includes("microsoft"))        return `https://learn.microsoft.com/en-us/search/?terms=${q}`;
  if (p.includes("aws") || p.includes("skill builder")) return `https://explore.skillbuilder.aws/learn?searchTerm=${q}`;
  if (p.includes("google cloud") || p.includes("cloudskillsboost")) return `https://cloudskillsboost.google/catalog?keywords=${q}`;
  if (p.includes("comptia"))          return `https://www.comptia.org/training/certmaster-learn#q=${q}`;
  if (p.includes("vmware"))           return `https://mylearn.vmware.com/search#${q}`;
  if (p.includes("palo alto"))        return `https://www.paloaltonetworks.com/services/education/search#${q}`;
  // Default: Google search scoped to the platform name
  return `https://www.google.com/search?q=${encodeURIComponent(title + " " + platform + " course")}`;
}

/* ── Course Matching ───────────────────────────────────────── */
const allInternalCourses = subjects.flatMap((s) =>
  s.courses.map((c) => ({ ...c, subjectTitle: s.title }))
);

function findInternalCourse(title: string): { id: string; subjectId: string } | null {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
  const target = normalize(title);
  const targetWords = target.split(" ");

  let bestMatch: (typeof allInternalCourses)[number] | null = null;
  let bestScore = 0;

  for (const course of allInternalCourses) {
    const courseName = normalize(course.title);
    const courseWords = courseName.split(" ");
    // Count matching words
    const matches = targetWords.filter((w) => courseWords.some((cw) => cw.includes(w) || w.includes(cw))).length;
    const score = matches / Math.max(targetWords.length, courseWords.length);
    if (score > bestScore && score >= 0.4) {
      bestScore = score;
      bestMatch = course;
    }
  }
  return bestMatch ? { id: bestMatch.id, subjectId: bestMatch.subjectId } : null;
}

/* ── Course Recommendations ────────────────────────────────── */
const OPTION_LABELS = ["A", "B", "C", "D", "E", "F"];
const OPTION_COLORS = ["#00d4a1", "#4f9eff", "#a78bfa", "#f59e0b", "#f87171", "#22d3ee"];

function CourseRecommendationsSection({ courses }: { courses: CourseRecommendation[] }) {
  const isRTL = useRTL();
  const levelColor: Record<string, string> = {
    Beginner: "#00d4a1",
    "Beginner to Intermediate": "#22d3ee",
    Intermediate: "#a78bfa",
    "Intermediate to Advanced": "#f59e0b",
    Advanced: "#f87171",
  };

  // Group courses by phase
  const phaseMap = useMemo(() => {
    const map = new Map<string, CourseRecommendation[]>();
    for (const c of courses) {
      const key = c.phase || (isRTL ? "عام" : "General");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return map;
  }, [courses, isRTL]);

  const phases = Array.from(phaseMap.entries());

  return (
    <SectionCard delay={0.4}>
      <SectionTitle icon={BookOpen} label={t("courses", isRTL)} color="#a78bfa" />
      <div className="space-y-6">
        {phases.map(([phase, phaseCourses], phaseIdx) => (
          <div key={phase}>
            {/* Phase header */}
            <div className="flex items-center gap-2 mb-3">
              <div
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold"
                style={{ background: `${OPTION_COLORS[phaseIdx % OPTION_COLORS.length]}18`, color: OPTION_COLORS[phaseIdx % OPTION_COLORS.length], border: `1px solid ${OPTION_COLORS[phaseIdx % OPTION_COLORS.length]}33` }}
              >
                <Flag size={10} />
                {phase}
              </div>
              <div className="flex-1 h-px" style={{ background: "var(--border-subtle)" }} />
            </div>

            {/* Options within this phase */}
            <div className="space-y-3">
              {phaseCourses.map((c, optIdx) => {
                const internalMatch = findInternalCourse(c.title);
                const courseLink = internalMatch ? `/learn/${internalMatch.id}` : null;
                const isFree = /youtube|freecodecamp|khan|edx/i.test(c.platform);
                const isOfficial = /cisco|microsoft|aws|comptia|google cloud|vmware|palo alto/i.test(c.platform);
                const tierLabel = isOfficial ? (isRTL ? "رسمي" : "Official") : isFree ? (isRTL ? "مجاني" : "Free") : (isRTL ? "مدفوع" : "Paid");
                const tierColor = isOfficial ? "#f59e0b" : isFree ? "#00d4a1" : "#a78bfa";
                const optColor = OPTION_COLORS[optIdx % OPTION_COLORS.length];
                const optLabel = OPTION_LABELS[optIdx] ?? String(optIdx + 1);
                const openUrl = courseLink ? null : (c.url && c.url.length > 0 ? c.url : getPlatformSearchUrl(c.platform, c.title));

                return (
                  <motion.div
                    key={optIdx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + phaseIdx * 0.1 + optIdx * 0.06, duration: 0.35 }}
                    className="rounded-xl p-4 group relative"
                    style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)" }}
                  >
                    <div className="flex items-start gap-3">
                      {/* Option badge */}
                      <div
                        className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black"
                        style={{ background: `${optColor}18`, color: optColor, border: `1px solid ${optColor}33` }}
                      >
                        {optLabel}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-sm font-bold leading-snug" style={{ color: "var(--text-primary)" }}>{c.title}</p>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg"
                              style={{ background: `${tierColor}18`, color: tierColor }}>
                              {tierLabel}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg"
                              style={{ background: `${levelColor[c.level] ?? "#00d4a1"}18`, color: levelColor[c.level] ?? "#00d4a1" }}>
                              {c.level}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs mt-0.5 mb-2" style={{ color: "var(--text-muted)" }}>
                          {c.platform} · {c.instructor}
                        </p>
                        <p className="text-xs leading-relaxed mb-3" style={{ color: "var(--text-secondary)" }}>{c.focus}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md"
                            style={{ background: "rgba(34,211,238,0.1)", color: "#22d3ee" }}>
                            <Clock size={9} />
                            {c.estimatedHours}h
                          </span>
                          {courseLink ? (
                            <Link
                              href={courseLink}
                              className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-md transition-all hover:scale-105"
                              style={{ background: "linear-gradient(135deg, rgba(0,212,161,0.15), rgba(34,211,238,0.15))", color: "#00d4a1", border: "1px solid rgba(0,212,161,0.25)" }}
                            >
                              <PlayCircle size={10} />
                              {isRTL ? "ابدأ الدورة" : "Start Course"}
                            </Link>
                          ) : (
                            <a
                              href={openUrl!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all hover:scale-105 hover:opacity-90"
                              style={{
                                background: c.url && c.url.length > 0
                                  ? "linear-gradient(135deg, rgba(79,158,255,0.15), rgba(79,158,255,0.08))"
                                  : `linear-gradient(135deg, ${optColor}22, ${optColor}10)`,
                                color: c.url && c.url.length > 0 ? "#4f9eff" : optColor,
                                border: `1px solid ${c.url && c.url.length > 0 ? "rgba(79,158,255,0.3)" : optColor + "44"}`,
                              }}
                            >
                              <ExternalLink size={10} />
                              {isRTL ? "افتح الدورة" : "Open Course"}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

/* ── Roadmap Phases ────────────────────────────────────────── */
function RoadmapPhasesSection({ phases }: { phases: RoadmapPhase[] }) {
  const isRTL = useRTL();
  const phaseColors = ["#00d4a1", "#22d3ee", "#a78bfa", "#f59e0b", "#f87171", "#34d399", "#60a5fa", "#e879f9"];

  return (
    <SectionCard delay={0.45}>
      <SectionTitle icon={Layers} label={t("roadmap", isRTL)} color="#00d4a1" />
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
                      <p className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color }}>{isRTL ? "المعالم" : "Milestones"}</p>
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
                      <p className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "#a78bfa" }}>{isRTL ? "المهارات" : "Skills"}</p>
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
  const { lang } = useLang();
  const isRTL = lang === "ar";

  // Course selection state — tracks which courses the user has enrolled in
  const [selectedCourses, setSelectedCourses] = useState<Set<number>>(() => {
    const initial = new Set<number>();
    (plan.courseRecommendations ?? []).forEach((c: CourseRecommendation & { selected?: boolean }, i: number) => {
      if (c.selected) initial.add(i);
    });
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggleCourse = (index: number) => {
    setSelectedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
    setSaved(false);
  };

  const saveSelections = async () => {
    setSaving(true);
    try {
      const updatedPlan = { ...plan };
      if (updatedPlan.courseRecommendations) {
        updatedPlan.courseRecommendations = updatedPlan.courseRecommendations.map(
          (c: CourseRecommendation, i: number) => ({ ...c, selected: selectedCourses.has(i) })
        );
      }
      await fetch("/api/user/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: updatedPlan }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <RTLContext.Provider value={isRTL}>
    <div className="max-w-4xl mx-auto space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Page header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>
            <Map size={10} className="inline mr-1" />
            {isRTL ? "خارطة طريقي" : "My Roadmap"}
          </p>
          <h1 className="text-2xl lg:text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
            {isRTL ? `خطة عمل ${plan.profile.name}` : `${plan.profile.name}'s Action Plan`}
          </h1>
        </div>
        <Link
          href="/dashboard"
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all hover:opacity-80"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}
        >
          <RotateCcw size={12} />
          {t("modifyPlan", isRTL)}
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
            {t("personalPlan", isRTL)}
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {plan.profile.summary}
          </p>
        </div>
      </motion.div>

      {/* Roadmap Phases */}
      {plan.roadmap && plan.roadmap.length > 0 && (
        <RoadmapPhasesSection phases={plan.roadmap} />
      )}

      {/* Course Selection */}
      {plan.courseRecommendations && plan.courseRecommendations.length > 0 && (
        <SectionCard delay={0.4}>
          <div className="flex items-center justify-between mb-5">
            <SectionTitle icon={BookOpen} label={isRTL ? "اختر دوراتك" : "Select Your Courses"} color="#a78bfa" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                {selectedCourses.size}/{plan.courseRecommendations.length} {isRTL ? "مختارة" : "selected"}
              </span>
            </div>
          </div>
          <p className="text-xs mb-4 leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {isRTL
              ? "اختر الدورات التي تريد التسجيل بها حسب ميزانيتك وتفضيلاتك. الدورات المجانية والمدفوعة متاحة لكل مسار."
              : "Select courses you want to enroll in based on your budget and preferences. Free and paid options are available for each path."}
          </p>
          <div className="space-y-3">
            {plan.courseRecommendations.map((c: CourseRecommendation, i: number) => {
              const isSelected = selectedCourses.has(i);
              const isFree = /youtube|freecodecamp|khan|edx/i.test(c.platform);
              const levelColor: Record<string, string> = {
                Beginner: "#00d4a1",
                "Beginner to Intermediate": "#22d3ee",
                Intermediate: "#a78bfa",
                "Intermediate to Advanced": "#f59e0b",
                Advanced: "#f87171",
              };

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.06, duration: 0.35 }}
                  className="rounded-xl p-4 cursor-pointer transition-all"
                  style={{
                    background: isSelected ? "rgba(0,212,161,0.06)" : "var(--bg-base)",
                    border: isSelected ? "2px solid rgba(0,212,161,0.5)" : "1px solid var(--border-subtle)",
                    boxShadow: isSelected ? "0 0 16px rgba(0,212,161,0.15)" : "none",
                  }}
                  onClick={() => toggleCourse(i)}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <div
                      className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center mt-0.5 transition-all"
                      style={{
                        background: isSelected ? "linear-gradient(135deg, #00d4a1, #22d3ee)" : "var(--bg-card)",
                        border: isSelected ? "none" : "2px solid var(--border-medium)",
                      }}
                    >
                      {isSelected && <CheckCircle size={12} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-bold leading-snug" style={{ color: "var(--text-primary)" }}>{c.title}</p>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-lg"
                            style={{ background: isFree ? "rgba(0,212,161,0.12)" : "rgba(167,139,250,0.12)", color: isFree ? "#00d4a1" : "#a78bfa" }}
                          >
                            {isFree ? (isRTL ? "مجاني" : "Free") : (isRTL ? "مدفوع" : "Paid")}
                          </span>
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-lg"
                            style={{ background: `${levelColor[c.level] ?? "#00d4a1"}18`, color: levelColor[c.level] ?? "#00d4a1" }}
                          >
                            {c.level}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                        {c.platform} · {c.instructor}
                      </p>
                      <p className="text-xs leading-relaxed mb-2" style={{ color: "var(--text-secondary)" }}>{c.focus}</p>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md"
                          style={{ background: "rgba(34,211,238,0.1)", color: "#22d3ee" }}>
                          <Clock size={9} /> {c.estimatedHours}h
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md"
                          style={{ background: "rgba(0,212,161,0.1)", color: "#00d4a1" }}>
                          <Flag size={9} /> {c.phase}
                        </span>
                        <a
                          href={c.url && c.url.length > 0 ? c.url : getPlatformSearchUrl(c.platform, c.title)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all hover:scale-105 hover:opacity-90"
                          style={{
                            background: c.url && c.url.length > 0
                              ? "linear-gradient(135deg, rgba(79,158,255,0.15), rgba(79,158,255,0.08))"
                              : "linear-gradient(135deg, rgba(0,212,161,0.15), rgba(0,212,161,0.08))",
                            color: c.url && c.url.length > 0 ? "#4f9eff" : "#00d4a1",
                            border: c.url && c.url.length > 0 ? "1px solid rgba(79,158,255,0.3)" : "1px solid rgba(0,212,161,0.3)",
                          }}
                        >
                          <ExternalLink size={10} />
                          {isRTL ? "افتح الدورة" : "Open Course"}
                        </a>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Save button */}
          <div className="flex items-center justify-between mt-5 pt-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {isRTL
                ? "حفظ اختياراتك لإنشاء الجدول الزمني تلقائياً"
                : "Save selections to auto-generate your schedule"}
            </p>
            <button
              onClick={saveSelections}
              disabled={saving || selectedCourses.size === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #00d4a1, #22d3ee)", boxShadow: "0 0 16px rgba(0,212,161,0.3)" }}
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : saved ? (
                <CheckCircle size={14} />
              ) : null}
              {saved ? (isRTL ? "تم الحفظ!" : "Saved!") : (isRTL ? "حفظ الاختيارات" : "Save My Selections")}
            </button>
          </div>
        </SectionCard>
      )}

      {/* Next Steps */}
      <SectionCard delay={0.5}>
        <SectionTitle icon={TrendingUp} label={t("nextSteps", isRTL)} color="var(--brand-teal)" />
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

      {/* Continue to Schedule button */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex items-center justify-center gap-4 py-4"
      >
        <Link
          href="/schedule"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-bold text-white transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #00d4a1, #22d3ee)", boxShadow: "0 0 32px rgba(0,212,161,0.35)" }}
        >
          <CalendarDays size={16} />
          {isRTL ? "المتابعة إلى الجدول" : "Continue to Schedule"}
          <ArrowRight size={16} />
        </Link>
      </motion.div>
    </div>
    </RTLContext.Provider>
  );
}
