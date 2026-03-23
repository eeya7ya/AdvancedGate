"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useLang } from "@/lib/language";
import {
  CalendarDays, Clock, Target, Printer, CheckCircle,
} from "lucide-react";

/* ── Types ────────────────────────────────────────────────── */
interface TimeSlice   { subject: string; percentage: number; color: string; hours: number }
interface ScheduleData {
  daily: { duration: string; structure: string[] };
  weekly: { pattern: string; weeklyGoal: string };
  printableTargets: { daily: string; weekly: string; monthly: string };
}
interface LearningPlan {
  profile: { name: string; summary: string };
  todaysFocus: { topic: string; reason: string; duration: string; action: string };
  timeAllocation: TimeSlice[];
  schedule?: ScheduleData;
}

/* ── Weekly schedule builder ──────────────────────────────── */
const DAYS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAYS_AR = ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"];

function smartLabel(subject: string): string {
  const words = subject.trim().split(/\s+/);
  let taken = words.slice(0, 3);
  while (taken.length > 1 && /^[^a-zA-Z0-9\u0600-\u06FF]+$/.test(taken[taken.length - 1])) {
    taken = taken.slice(0, -1);
  }
  return taken.join(" ");
}

function buildSchedule(slices: TimeSlice[]) {
  const dayWeights = [1.2, 1.2, 1.2, 1.2, 1.2, 0.8, 0.8];
  const totalWeight = dayWeights.reduce((a, b) => a + b, 0);
  return DAYS_EN.map((day, di) => {
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

/* ── Card wrapper ─────────────────────────────────────────── */
function Card({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
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

/* ── Weekly grid ──────────────────────────────────────────── */
function WeeklyGrid({ slices, isRTL }: { slices: TimeSlice[]; isRTL: boolean }) {
  const schedule = buildSchedule(slices);
  const dayLabels = isRTL ? DAYS_AR : DAYS_EN;

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
    <Card delay={0.2}>
      <SectionTitle icon={CalendarDays} label={isRTL ? "الجدول الأسبوعي المقترح" : "Weekly Schedule"} color="#a78bfa" />
      <div className="grid grid-cols-7 gap-2">
        {schedule.map(({ day }, idx) => {
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
              <p className="text-xs font-bold" style={{ color: isWeekend ? "#a78bfa" : "#22d3ee" }}>
                {dayLabels[idx]}
              </p>
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
                <div
                  key={`${day}-${bi}-empty`}
                  className="rounded-xl flex items-center justify-center"
                  style={{
                    height: `${rowH}px`,
                    background: "var(--bg-base)",
                    border: `1px dashed ${isWeekend ? "rgba(167,139,250,0.2)" : "var(--border-subtle)"}`,
                  }}
                >
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    {isRTL ? "راحة" : "Rest"}
                  </p>
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
      <p className="text-xs mt-4 text-center" style={{ color: "var(--text-muted)" }}>
        {isRTL
          ? "الجدول مُنشأ تلقائياً من توزيع وقتك الأسبوعي. عدّله عبر مستشارك الذكي."
          : "Schedule auto-generated from your weekly time allocation. Adjust via your AI Advisor."}
      </p>
    </Card>
  );
}

/* ── Printable schedule ───────────────────────────────────── */
function PrintableSchedule({ schedule, isRTL }: { schedule: ScheduleData; isRTL: boolean }) {
  return (
    <Card delay={0.3}>
      <SectionTitle
        icon={Printer}
        label={isRTL ? "جدولك الدراسي القابل للطباعة" : "Your Study Schedule"}
        color="#22d3ee"
      />

      {/* Daily structure */}
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "#00d4a1" }}>
          {isRTL ? `الروتين اليومي · ${schedule.daily.duration}` : `Daily Routine · ${schedule.daily.duration}`}
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
        <p className="text-xs font-bold mb-1" style={{ color: "#22d3ee" }}>
          {isRTL ? "النمط الأسبوعي" : "Weekly Pattern"}
        </p>
        <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{schedule.weekly.pattern}</p>
        <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{schedule.weekly.weeklyGoal}</p>
      </div>

      {/* Targets */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: "#a78bfa" }}>
          {isRTL ? "الأهداف القابلة للطباعة" : "Printable Targets"}
        </p>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { label: isRTL ? "يومي" : "Daily",   value: schedule.printableTargets.daily,   color: "#00d4a1" },
            { label: isRTL ? "أسبوعي" : "Weekly", value: schedule.printableTargets.weekly,  color: "#22d3ee" },
            { label: isRTL ? "شهري" : "Monthly",  value: schedule.printableTargets.monthly, color: "#a78bfa" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl p-4"
              style={{ background: "var(--bg-base)", border: `1px solid ${color}33` }}>
              <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color }}>
                {label} {isRTL ? "هدف" : "Target"}
              </p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{value}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

/* ── Today's Focus card ───────────────────────────────────── */
function TodayFocus({ plan, isRTL }: { plan: LearningPlan; isRTL: boolean }) {
  return (
    <Card delay={0.1}>
      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-semibold mb-4"
        style={{ background: "rgba(0,212,161,0.12)", color: "#00d4a1" }}>
        <Target size={11} />
        {isRTL ? "تركيز اليوم" : "Today's Focus"}
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
    </Card>
  );
}

/* ── Time allocation summary ──────────────────────────────── */
function TimeAllocationSummary({ slices, isRTL }: { slices: TimeSlice[]; isRTL: boolean }) {
  const totalHours = slices.reduce((s, x) => s + x.hours, 0);
  return (
    <Card delay={0.15}>
      <SectionTitle icon={Clock} label={isRTL ? "توزيع الوقت الأسبوعي" : "Weekly Time Allocation"} color="#22d3ee" />
      <div className="flex items-center justify-between mb-4 pb-3"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
          {isRTL ? "المجموع الأسبوعي" : "Total per week"}
        </span>
        <span className="text-2xl font-bold" style={{ color: "#00d4a1" }}>{totalHours}h</span>
      </div>
      <div className="space-y-3">
        {slices.map((s) => (
          <div key={s.subject}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: s.color, boxShadow: `0 0 6px ${s.color}88` }} />
                <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{s.subject}</span>
              </div>
              <span className="text-xs font-bold" style={{ color: s.color }}>{s.hours}h · {s.percentage}%</span>
            </div>
            <div className="relative h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-base)" }}>
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${s.percentage}%`,
                  background: `linear-gradient(90deg, ${s.color}cc, ${s.color})`,
                  boxShadow: `0 0 8px ${s.color}66`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ── Main export ──────────────────────────────────────────── */
export function ScheduleClient({ plan }: { plan: LearningPlan }) {
  const { lang } = useLang();
  const isRTL = lang === "ar";
  const [printReady, setPrintReady] = useState(false);

  useEffect(() => { setPrintReady(true); }, []);

  const handlePrint = () => {
    const el = document.getElementById("schedule-print-area");
    if (!el) return;
    const original = document.body.innerHTML;
    document.body.innerHTML = el.innerHTML;
    window.print();
    document.body.innerHTML = original;
    window.location.reload();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4"
      >
        <div>
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-2"
            style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)", color: "#a78bfa" }}
          >
            <CalendarDays size={11} />
            {isRTL ? "جدولي" : "My Schedule"}
          </div>
          <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
            {isRTL
              ? `جدول ${plan.profile.name}`
              : `${plan.profile.name}'s Schedule`}
          </h1>
        </div>
        {printReady && (
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-80 flex-shrink-0"
            style={{ background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.2)", color: "#22d3ee" }}
          >
            <Printer size={13} />
            {isRTL ? "طباعة" : "Print"}
          </button>
        )}
      </motion.div>

      {/* Completion note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05 }}
        className="flex items-center gap-2 px-4 py-3 rounded-xl"
        style={{ background: "rgba(0,212,161,0.06)", border: "1px solid rgba(0,212,161,0.15)" }}
      >
        <CheckCircle size={14} style={{ color: "#00d4a1", flexShrink: 0 }} />
        <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {plan.profile.summary}
        </p>
      </motion.div>

      {/* Printable area */}
      <div id="schedule-print-area" className="space-y-6">
        <TodayFocus plan={plan} isRTL={isRTL} />
        <TimeAllocationSummary slices={plan.timeAllocation} isRTL={isRTL} />
        <WeeklyGrid slices={plan.timeAllocation} isRTL={isRTL} />
        {plan.schedule && <PrintableSchedule schedule={plan.schedule} isRTL={isRTL} />}
      </div>
    </div>
  );
}
