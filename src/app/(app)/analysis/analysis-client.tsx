"use client";

import { useState, useEffect, useMemo, createContext, useContext } from "react";
import { useLang } from "@/lib/language";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Target, Clock, ChevronRight, Zap, Brain,
  TrendingUp, Globe, AlertTriangle, CalendarDays, ArrowRight,
} from "lucide-react";

/* ── Language / RTL Helper ─────────────────────────────────── */
const RTLContext = createContext(false);
function useRTL() { return useContext(RTLContext); }

function smartLabel(subject: string): string {
  const words = subject.trim().split(/\s+/);
  let taken = words.slice(0, 3);
  while (taken.length > 1 && /^[^a-zA-Z0-9\u0600-\u06FF]+$/.test(taken[taken.length - 1])) {
    taken = taken.slice(0, -1);
  }
  return taken.join(" ");
}

const UI: Record<string, { en: string; ar: string }> = {
  pageTitle:      { en: "Advice Analysis",           ar: "تحليل النصائح" },
  pageSubtitle:   { en: "Real-time marketplace analysis & learning properties", ar: "تحليل السوق في الوقت الحقيقي وخصائص التعلم" },
  priorities:     { en: "Learning Priorities",       ar: "أولويات التعلم" },
  timeAlloc:      { en: "Weekly Time Allocation",    ar: "توزيع الوقت الأسبوعي" },
  weeklySchedule: { en: "Suggested Weekly Schedule", ar: "الجدول الأسبوعي المقترح" },
  topicConn:      { en: "Topic Connections",         ar: "روابط المواضيع" },
  market:         { en: "Market Intelligence",       ar: "تحليل السوق" },
  rest:           { en: "Rest",                      ar: "راحة" },
  scheduleNote:   { en: "Schedule auto-generated from your weekly time allocation.", ar: "الجدول مُنشأ تلقائياً من توزيع وقتك الأسبوعي." },
  continueRoadmap: { en: "Continue to RoadMap",      ar: "المتابعة إلى خارطة الطريق" },
};
function t(key: string, isRTL: boolean): string {
  return isRTL ? (UI[key]?.ar ?? key) : (UI[key]?.en ?? key);
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

interface LearningPlan {
  profile: { name: string; country?: string; targetMarket?: string; workStyle?: string; summary: string };
  marketInsights?: MarketInsights;
  priorities: Priority[];
  timeAllocation: TimeSlice[];
  topicConnections: TopicLink[];
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

/* ── Market Insights ──────────────────────────────────────── */
function MarketInsightsSection({ insights }: { insights: MarketInsights }) {
  const isRTL = useRTL();
  return (
    <SectionCard delay={0.15}>
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

/* ── Priority Bars ────────────────────────────────────────── */
function PriorityBars({ priorities }: { priorities: Priority[] }) {
  const [animated, setAnimated] = useState(false);
  const isRTL = useRTL();
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 300); return () => clearTimeout(t); }, []);

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

/* ── Donut Chart ──────────────────────────────────────────── */
function DonutChart({ slices }: { slices: TimeSlice[] }) {
  const [animated, setAnimated] = useState(false);
  const isRTL = useRTL();
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 500); return () => clearTimeout(t); }, []);

  const r = 70, cx = 100, cy = 100, strokeWidth = 22;
  const circumference = 2 * Math.PI * r;
  const totalHours = Math.round(slices.reduce((s, x) => s + x.hours, 0) * 10) / 10;
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

/* ── Weekly Schedule ──────────────────────────────────────── */
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function buildSchedule(slices: TimeSlice[]) {
  const dayWeights = [1.2, 1.2, 1.2, 1.2, 1.2, 0.8, 0.8];
  const totalWeight = dayWeights.reduce((a, b) => a + b, 0);
  return DAYS.map((day, di) => {
    const dayFraction = dayWeights[di] / totalWeight;
    const blocks = slices
      .map((s) => ({ subject: s.subject, color: s.color, minutes: Math.round(s.hours * 60 * dayFraction) }))
      .filter((b) => b.minutes >= 10);
    return { day, blocks };
  });
}

function WeeklySchedule({ slices }: { slices: TimeSlice[] }) {
  const schedule = buildSchedule(slices);
  const isRTL = useRTL();
  const maxBlocks = useMemo(() => Math.max(...schedule.map((d) => d.blocks.length), 1), [schedule]);
  const rowHeights = useMemo(
    () => Array.from({ length: maxBlocks }, (_, i) => Math.max(88, Math.max(...schedule.map((d) => (d.blocks[i]?.minutes ?? 0))) * 1.1)),
    [schedule, maxBlocks]
  );

  return (
    <SectionCard delay={0.4}>
      <SectionTitle icon={CalendarDays} label={t("weeklySchedule", isRTL)} color="#a78bfa" />
      <div className="grid grid-cols-7 gap-2">
        {schedule.map(({ day }) => {
          const isWeekend = day === "Sat" || day === "Sun";
          return (
            <div key={`h-${day}`} className="rounded-lg py-2 text-center"
              style={{ background: isWeekend ? "rgba(167,139,250,0.1)" : "rgba(34,211,238,0.08)", border: `1px solid ${isWeekend ? "rgba(167,139,250,0.25)" : "rgba(34,211,238,0.2)"}` }}>
              <p className="text-xs font-bold" style={{ color: isWeekend ? "#a78bfa" : "#22d3ee" }}>{day}</p>
            </div>
          );
        })}
        {Array.from({ length: maxBlocks }, (_, bi) =>
          schedule.map(({ day, blocks }) => {
            const b = blocks[bi];
            const isWeekend = day === "Sat" || day === "Sun";
            const rowH = rowHeights[bi];
            if (!b) {
              return (
                <div key={`${day}-${bi}-empty`} className="rounded-xl flex items-center justify-center"
                  style={{ height: `${rowH}px`, background: "var(--bg-base)", border: `1px dashed ${isWeekend ? "rgba(167,139,250,0.2)" : "var(--border-subtle)"}` }}>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{t("rest", isRTL)}</p>
                </div>
              );
            }
            return (
              <div key={`${day}-${bi}`} className="rounded-xl flex flex-col items-center justify-center px-2 text-center gap-1.5"
                style={{ height: `${rowH}px`, background: `${b.color}15`, border: `1px solid ${b.color}40` }}>
                <p className="text-[11px] font-bold leading-tight w-full text-center" style={{ color: b.color, wordBreak: "break-word" }}>
                  {smartLabel(b.subject)}
                </p>
                <p className="text-[11px] font-semibold" style={{ color: "var(--text-secondary)" }}>
                  {b.minutes >= 60 ? `${(b.minutes / 60).toFixed(1).replace(/\.0$/, "")}h` : `${b.minutes}m`}
                </p>
              </div>
            );
          })
        )}
      </div>
      <p className="text-xs mt-4" style={{ color: "var(--text-muted)" }}>{t("scheduleNote", isRTL)}</p>
    </SectionCard>
  );
}

/* ── Topic Connections ────────────────────────────────────── */
function TopicConnections({ links }: { links: TopicLink[] }) {
  const isRTL = useRTL();
  return (
    <SectionCard delay={0.5}>
      <SectionTitle icon={Zap} label={t("topicConn", isRTL)} color="#a78bfa" />
      <div className="space-y-3">
        {links.map((link, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }}
            className="flex items-start gap-3 p-4 rounded-xl"
            style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)" }}>
            <div className="flex flex-col gap-2 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ background: "rgba(0,212,161,0.12)", color: "#00d4a1" }}>{link.from}</span>
                <ChevronRight size={13} style={{ color: "var(--text-muted)" }} />
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ background: "rgba(34,211,238,0.12)", color: "#22d3ee" }}>{link.to}</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{link.bridge}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </SectionCard>
  );
}

/* ── Main Client Component ────────────────────────────────── */
export function AnalysisClient({ plan }: { plan: LearningPlan }) {
  const { lang } = useLang();
  const isRTL = lang === "ar";

  return (
    <RTLContext.Provider value={isRTL}>
      <div className="max-w-4xl mx-auto space-y-6" dir={isRTL ? "rtl" : "ltr"}>
        {/* Page header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>
            <TrendingUp size={10} className="inline mr-1" />
            {t("pageTitle", isRTL)}
          </p>
          <h1 className="text-2xl lg:text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
            {t("pageSubtitle", isRTL)}
          </h1>
          {/* Profile chips */}
          <div className="flex flex-wrap gap-2 mt-3">
            {plan.profile.country && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                style={{ background: "rgba(34,211,238,0.1)", color: "#22d3ee", border: "1px solid rgba(34,211,238,0.2)" }}>
                <Globe size={10} />
                {plan.profile.country}
              </span>
            )}
            {plan.profile.targetMarket && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                style={{ background: "rgba(0,212,161,0.1)", color: "#00d4a1", border: "1px solid rgba(0,212,161,0.2)" }}>
                {plan.profile.targetMarket}
              </span>
            )}
            {plan.profile.workStyle && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                style={{ background: "rgba(167,139,250,0.1)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.2)" }}>
                {plan.profile.workStyle}
              </span>
            )}
          </div>
        </motion.div>

        {/* Market Insights */}
        {plan.marketInsights && <MarketInsightsSection insights={plan.marketInsights} />}

        {/* Charts row */}
        <div className="grid md:grid-cols-2 gap-5">
          <PriorityBars priorities={plan.priorities} />
          <DonutChart slices={plan.timeAllocation} />
        </div>

        {/* Weekly Schedule */}
        <WeeklySchedule slices={plan.timeAllocation} />

        {/* Topic Connections */}
        <TopicConnections links={plan.topicConnections} />

        {/* Continue to RoadMap button */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex items-center justify-center py-6"
        >
          <Link
            href="/roadmap"
            className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #00d4a1, #22d3ee)", boxShadow: "0 0 32px rgba(0,212,161,0.35)" }}
          >
            {t("continueRoadmap", isRTL)}
            <ArrowRight size={16} />
          </Link>
        </motion.div>
      </div>
    </RTLContext.Provider>
  );
}
