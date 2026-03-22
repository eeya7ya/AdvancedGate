"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Send, Sparkles, Brain, Target, Clock, ArrowRight, ChevronRight, RotateCcw, Zap, Map, AlertTriangle, Globe, ExternalLink, BookOpen, X, Trash2 } from "lucide-react";
import { useLang } from "@/lib/language";

/* ── Types ─────────────────────────────────────────────────────── */
interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Priority {
  topic: string;
  score: number;
  description: string;
  color: string;
}

interface TimeSlice {
  subject: string;
  percentage: number;
  color: string;
  hours: number;
}

interface TopicLink {
  from: string;
  to: string;
  bridge: string;
}

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
  type: "LEARNING_PLAN";
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

type Phase = "welcome" | "chat" | "plan";

/* ── Language / RTL Helpers ─────────────────────────────────────── */
const ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;

function isArabic(text: string): boolean {
  return ARABIC_REGEX.test(text);
}

function getTextDir(text: string): "rtl" | "ltr" {
  return isArabic(text) ? "rtl" : "ltr";
}

/* ── Helpers ────────────────────────────────────────────────────── */
function parsePlan(text: string): LearningPlan | null {
  try {
    let cleaned = text.trim();
    // Strip markdown code fences (AI sometimes wraps JSON in ```json...```)
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    }
    const start = cleaned.indexOf("{");
    if (start === -1) return null;
    const json = cleaned.slice(start);
    const end = json.lastIndexOf("}");
    if (end === -1) return null;
    const parsed = JSON.parse(json.slice(0, end + 1));
    if (parsed.type === "LEARNING_PLAN") return parsed as LearningPlan;
    return null;
  } catch {
    return null;
  }
}

function looksLikePlanAttempt(text: string): boolean {
  const t = text.trim();
  return t.startsWith("{") || t.startsWith("```") || t.includes('"type": "LEARNING_PLAN"');
}

/* ── Translations ───────────────────────────────────────────────── */
const D: Record<string, { en: string; ar: string }> = {
  badge:          { en: "Real-time AI Advisor · Powered by eSpark", ar: "مستشار ذكاء اصطناعي · مدعوم بـ eSpark" },
  heroTitle:      { en: "Achieve Any Dream With", ar: "حقق أي حلم بمساعدة" },
  heroAI:         { en: "Your AI Advisor", ar: "مستشارك الذكي" },
  heroDesc:       { en: "No matter what your goal is — career, business, creative, academic, or personal — your AI advisor will understand your unique situation and build a real-time roadmap with mind maps, charts, and actionable steps to help you get there.", ar: "مهما كان هدفك — مهني، تجاري، إبداعي، أكاديمي أو شخصي — سيفهم مستشارك الذكي وضعك الفريد ويبني لك خارطة طريق حقيقية بخرائط ذهنية ورسوم بيانية وخطوات عملية توصلك إلى ما تريد." },
  startSession:   { en: "Start AI Session", ar: "ابدأ الجلسة الذكية" },
  chip1:          { en: "Any goal, any domain", ar: "أي هدف، أي مجال" },
  chip2:          { en: "Mind maps & charts", ar: "خرائط ذهنية ورسوم بيانية" },
  chip3:          { en: "Real-time action plan", ar: "خطة عمل آنية" },
  chip4:          { en: "Saves your progress", ar: "يحفظ تقدمك" },
  yourPlan:       { en: "Your Personalized Action Plan", ar: "خطتك الشخصية" },
  marketNotice:   { en: "Market Notice", ar: "تنبيه السوق" },
  viewRoadmap:    { en: "View Roadmap", ar: "عرض خارطة الطريق" },
  restart:        { en: "Restart", ar: "ابدأ من جديد" },
  todayFocus:     { en: "Today's Focus", ar: "تركيز اليوم" },
  recCourses:     { en: "Recommended Courses", ar: "الدورات الموصى بها" },
  open:           { en: "Open", ar: "فتح" },
  search:         { en: "Search", ar: "بحث" },
  by:             { en: "by", ar: "بواسطة" },
  nextSteps:      { en: "Your Next Steps", ar: "خطواتك القادمة" },
  advisorLabel:   { en: "AI Life Advisor", ar: "مستشار الحياة الذكي" },
  chatHeading:    { en: "let's map your path", ar: "لنرسم طريقك" },
  startOver:      { en: "Start over", ar: "ابدأ من جديد" },
  placeholder:    { en: "Message AI Advisor... (Enter to send, Shift+Enter for new line)", ar: "اكتب رسالتك... (Enter للإرسال، Shift+Enter لسطر جديد)" },
  crafting:       { en: "Crafting your personalized roadmap...", ar: "جارٍ إنشاء خارطة طريقك الشخصية..." },
  startOverTitle: { en: "Start Over?", ar: "البدء من جديد؟" },
  startOverMsg:   { en: "This will permanently delete your saved roadmap and all session data, then restart from scratch. This cannot be undone.", ar: "سيؤدي هذا إلى حذف خارطة طريقك المحفوظة وجميع بيانات الجلسة نهائياً، ثم البدء من الصفر. لا يمكن التراجع عن هذا." },
  startOverConfirm: { en: "Yes, Delete & Restart", ar: "نعم، احذف وابدأ من جديد" },
};
function td(key: string, ar: boolean): string {
  return ar ? (D[key]?.ar ?? key) : (D[key]?.en ?? key);
}

/* ── Sub-components ─────────────────────────────────────────────── */

function AIAvatar() {
  return (
    <div
      className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 animate-pulse-ring"
      style={{ background: "linear-gradient(135deg, #00d4a1, #22d3ee)" }}
    >
      <Brain size={14} className="text-white" />
    </div>
  );
}

function TypingIndicator({ isPlan = false }: { isPlan?: boolean }) {
  const { lang } = useLang();
  const ar = lang === "ar";
  return (
    <div className="flex items-end gap-3">
      <AIAvatar />
      <div
        className="flex flex-col gap-2 px-4 py-3 rounded-2xl rounded-bl-sm"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center gap-1.5">
          <span className="typing-dot w-2 h-2 rounded-full" style={{ background: "var(--brand-teal)" }} />
          <span className="typing-dot w-2 h-2 rounded-full" style={{ background: "var(--brand-teal)" }} />
          <span className="typing-dot w-2 h-2 rounded-full" style={{ background: "var(--brand-teal)" }} />
        </div>
        {isPlan && (
          <p className="text-xs font-medium animate-pulse" style={{ color: "var(--text-muted)" }}>
            {td("crafting", ar)}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Confirm Dialog ─────────────────────────────────────────────── */
function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  isLoading,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-medium)",
        }}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(239,68,68,0.15)" }}
            >
              <Trash2 size={16} style={{ color: "#ef4444" }} />
            </div>
            <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
              {title}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
            style={{ color: "var(--text-muted)" }}
          >
            <X size={15} />
          </button>
        </div>
        <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--text-secondary)" }}>
          {message}
        </p>
        <div className="flex gap-2.5">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80 disabled:opacity-40"
            style={{
              background: "var(--bg-base)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, #ef4444, #dc2626)",
              color: "#fff",
              boxShadow: "0 0 16px rgba(239,68,68,0.3)",
            }}
          >
            {isLoading ? "Deleting..." : confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* Map Q-number to a distinct accent color so each question feels unique */
const Q_COLORS: Record<string, { bg: string; text: string; glow: string; border: string }> = {
  Q1: { bg: "linear-gradient(135deg, #00d4a1, #22d3ee)", text: "#fff", glow: "rgba(0,212,161,0.35)", border: "rgba(0,212,161,0.3)" },
  Q2: { bg: "linear-gradient(135deg, #6366f1, #818cf8)", text: "#fff", glow: "rgba(99,102,241,0.3)",  border: "rgba(99,102,241,0.3)" },
  Q3: { bg: "linear-gradient(135deg, #f59e0b, #fbbf24)", text: "#0a1628", glow: "rgba(245,158,11,0.3)", border: "rgba(245,158,11,0.3)" },
  Q4: { bg: "linear-gradient(135deg, #ec4899, #f472b6)", text: "#fff", glow: "rgba(236,72,153,0.3)",  border: "rgba(236,72,153,0.3)" },
  Q5: { bg: "linear-gradient(135deg, #14b8a6, #06b6d4)", text: "#fff", glow: "rgba(20,184,166,0.3)",  border: "rgba(20,184,166,0.3)" },
};

function renderInlineMarkdown(text: string, baseKey: number): React.ReactNode {
  /* Handle **bold** inline segments */
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={baseKey + i} style={{ color: "var(--text-primary)", fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function formatAIMessage(content: string, isStreaming?: boolean) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;
  let pendingBlank = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      pendingBlank = true;
      continue;
    }

    // Detect Q1:, Q2: ... lines — render as an ornate highlighted question card
    const qMatch = trimmed.match(/^(Q\d+):\s*(.+)$/);
    if (qMatch) {
      if (pendingBlank && elements.length > 0) elements.push(<div key={key++} className="h-3" />);
      pendingBlank = false;
      const qNum = qMatch[1];
      const qColors = Q_COLORS[qNum] ?? Q_COLORS.Q1;
      const startKey = key;
      key += 20; // reserve space for inline keys
      elements.push(
        <div
          key={startKey}
          className="flex items-start gap-3 mt-2 p-3 rounded-xl"
          style={{
            background: `rgba(0,0,0,0.15)`,
            border: `1px solid ${qColors.border}`,
            boxShadow: `0 0 14px ${qColors.glow}`,
          }}
        >
          <span
            className="flex-shrink-0 text-xs font-black px-2.5 py-1 rounded-lg tracking-wide"
            style={{
              background: qColors.bg,
              color: qColors.text,
              boxShadow: `0 0 10px ${qColors.glow}`,
              letterSpacing: "0.06em",
              minWidth: "36px",
              textAlign: "center",
            }}
          >
            {qNum}
          </span>
          <span className="leading-relaxed text-sm font-medium pt-0.5" style={{ color: "var(--text-primary)" }}>
            {renderInlineMarkdown(qMatch[2], startKey + 1)}
          </span>
        </div>
      );
    } else {
      if (pendingBlank && elements.length > 0) elements.push(<div key={key++} className="h-2" />);
      pendingBlank = false;
      const startKey = key;
      key += 20;
      elements.push(
        <p key={startKey} className="leading-relaxed text-sm" style={{ wordBreak: "break-word" }}>
          {renderInlineMarkdown(trimmed, startKey + 1)}
        </p>
      );
    }
  }

  if (isStreaming) {
    elements.push(
      <span
        key="cursor"
        className="inline-block w-0.5 h-4 ml-0.5 align-middle animate-pulse"
        style={{ background: "var(--brand-teal)" }}
      />
    );
  }

  return elements;
}

function ChatBubble({ msg, isStreaming }: { msg: Message; isStreaming?: boolean }) {
  const isAI = msg.role === "assistant";
  const dir = getTextDir(msg.content);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`flex items-end gap-3 ${isAI ? "" : "flex-row-reverse"}`}
    >
      {isAI ? (
        <AIAvatar />
      ) : (
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
          style={{ background: "linear-gradient(135deg, #4f9eff, #7c3aed)" }}
        >
          U
        </div>
      )}
      <div
        dir={dir}
        className={`px-4 py-3 rounded-2xl ${isAI ? "max-w-[85%]" : "max-w-[75%]"}`}
        style={
          isAI
            ? {
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
                borderBottomLeftRadius: "6px",
                lineHeight: "1.65",
                textAlign: dir === "rtl" ? "right" : "left",
              }
            : {
                background: "linear-gradient(135deg, #00d4a1, #22d3ee)",
                color: "#0a1628",
                borderBottomRightRadius: "6px",
                lineHeight: "1.6",
                fontWeight: 500,
                textAlign: dir === "rtl" ? "right" : "left",
              }
        }
      >
        {isAI ? formatAIMessage(msg.content, isStreaming) : <p className="leading-relaxed text-sm">{msg.content}</p>}
      </div>
    </motion.div>
  );
}

/* ── Priority Bar Chart ─────────────────────────────────────────── */
function PriorityBarChart({ priorities }: { priorities: Priority[] }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="rounded-2xl p-6"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <h3
        className="text-sm font-bold mb-5 flex items-center gap-2"
        style={{ color: "var(--text-primary)" }}
      >
        <Target size={15} style={{ color: "var(--brand-teal)" }} />
        Learning Priorities
      </h3>
      <div className="space-y-4">
        {priorities.map((p) => (
          <div key={p.topic}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                {p.topic}
              </span>
              <span className="text-xs font-bold" style={{ color: p.color }}>
                {p.score}%
              </span>
            </div>
            <div
              className="relative h-2.5 rounded-full overflow-hidden"
              style={{ background: "var(--bg-base)" }}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: animated ? `${p.score}%` : "0%",
                  background: `linear-gradient(90deg, ${p.color}cc, ${p.color})`,
                  boxShadow: `0 0 8px ${p.color}66`,
                }}
              />
            </div>
            <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
              {p.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Donut Chart ────────────────────────────────────────────────── */
function DonutChart({ slices }: { slices: TimeSlice[] }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 500);
    return () => clearTimeout(t);
  }, []);

  const r = 70;
  const cx = 100;
  const cy = 100;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * r;
  const totalHours = slices.reduce((s, x) => s + x.hours, 0);

  // Pre-compute cumulative start % for each segment
  const cumulatives = slices.map((_, i) =>
    slices.slice(0, i).reduce((sum, x) => sum + x.percentage, 0)
  );

  return (
    <div
      className="rounded-2xl p-6"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <h3
        className="text-sm font-bold mb-5 flex items-center gap-2"
        style={{ color: "var(--text-primary)" }}
      >
        <Clock size={15} style={{ color: "var(--brand-cyan)" }} />
        Weekly Time Allocation
      </h3>

      <div className="flex items-center gap-6">
        {/* SVG Donut */}
        <div className="relative flex-shrink-0">
          <svg width="200" height="200" viewBox="0 0 200 200">
            {/* Track */}
            <circle
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke="var(--bg-base)"
              strokeWidth={strokeWidth}
            />
            {/* Segments */}
            {slices.map((s, i) => {
              const startPercent = cumulatives[i];
              const segLen = (s.percentage / 100) * circumference;
              const rotation = -90 + (startPercent / 100) * 360;
              return (
                <circle
                  key={i}
                  cx={cx} cy={cy} r={r}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${animated ? segLen : 0} ${circumference - (animated ? segLen : 0)}`}
                  strokeDashoffset={0}
                  transform={`rotate(${rotation} ${cx} ${cy})`}
                  strokeLinecap="butt"
                  style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)" }}
                />
              );
            })}
            {/* Center text */}
            <text x={cx} y={cy - 8} textAnchor="middle" className="text-2xl font-bold" fill="var(--text-primary)" fontSize="22" fontWeight="700">
              {totalHours}h
            </text>
            <text x={cx} y={cy + 12} textAnchor="middle" fill="var(--text-muted)" fontSize="11">
              per week
            </text>
          </svg>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-3 min-w-0">
          {slices.map((s) => (
            <div key={s.subject} className="flex items-center gap-2.5">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: s.color, boxShadow: `0 0 6px ${s.color}88` }}
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                  {s.subject}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {s.hours}h/wk · {s.percentage}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Topic Connections ──────────────────────────────────────────── */
function TopicConnections({ links }: { links: TopicLink[] }) {
  return (
    <div
      className="rounded-2xl p-6"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <h3
        className="text-sm font-bold mb-5 flex items-center gap-2"
        style={{ color: "var(--text-primary)" }}
      >
        <Zap size={15} style={{ color: "#a78bfa" }} />
        Topic Connections
      </h3>
      <div className="space-y-3">
        {links.map((link, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.12, duration: 0.4 }}
            className="flex items-start gap-3 p-4 rounded-xl"
            style={{
              background: "var(--bg-base)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div className="flex flex-col gap-2 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                  style={{ background: "rgba(0,212,161,0.12)", color: "#00d4a1" }}
                >
                  {link.from}
                </span>
                <ChevronRight size={13} style={{ color: "var(--text-muted)" }} />
                <span
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                  style={{ background: "rgba(34,211,238,0.12)", color: "#22d3ee" }}
                >
                  {link.to}
                </span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {link.bridge}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ── Welcome Screen ─────────────────────────────────────────────── */
function WelcomeScreen({ onStart }: { onStart: () => void }) {
  const { lang } = useLang();
  const ar = lang === "ar";
  const chips = [
    td("chip1", ar), td("chip2", ar), td("chip3", ar), td("chip4", ar),
  ];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4"
      dir={ar ? "rtl" : "ltr"}
    >
      {/* Glowing brain icon */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
        className="relative mb-8"
      >
        <div
          className="absolute inset-0 rounded-full blur-2xl scale-150 opacity-40"
          style={{ background: "linear-gradient(135deg, #00d4a1, #22d3ee)" }}
        />
        <div
          className="relative w-24 h-24 rounded-3xl flex items-center justify-center animate-float"
          style={{ background: "linear-gradient(135deg, #00d4a1, #22d3ee)" }}
        >
          <Brain size={44} className="text-white" strokeWidth={1.5} />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-4"
          style={{
            background: "rgba(0,212,161,0.1)",
            border: "1px solid rgba(0,212,161,0.2)",
            color: "var(--brand-teal)",
          }}
        >
          <Sparkles size={11} />
          {td("badge", ar)}
        </div>
        <h1
          className="text-3xl lg:text-4xl font-bold mb-4 leading-tight max-w-lg mx-auto"
          style={{ color: "var(--text-primary)" }}
        >
          {td("heroTitle", ar)}{" "}
          <span className="gradient-text-ai">{td("heroAI", ar)}</span>
        </h1>
        <p
          className="max-w-lg mx-auto text-base leading-relaxed mb-10"
          style={{ color: "var(--text-secondary)" }}
        >
          {td("heroDesc", ar)}
        </p>

        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={onStart}
          className="relative inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl text-base font-bold text-white overflow-hidden group"
          style={{
            background: "linear-gradient(135deg, #00d4a1, #22d3ee)",
            boxShadow: "0 0 40px rgba(0,212,161,0.35)",
          }}
        >
          <span
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: "linear-gradient(135deg, #00c090, #0ea5c5)" }}
          />
          <Brain size={18} className="relative z-10" />
          <span className="relative z-10">{td("startSession", ar)}</span>
          <ArrowRight size={18} className="relative z-10" />
        </motion.button>
      </motion.div>

      {/* Feature chips */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex flex-wrap items-center justify-center gap-3 mt-10"
      >
        {chips.map((text) => (
          <div
            key={text}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)",
            }}
          >
            <span style={{ color: "var(--brand-teal)" }}>✦</span>
            {text}
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}

/* ── Plan View ──────────────────────────────────────────────────── */
function PlanView({ plan, onReset }: { plan: LearningPlan; onReset: () => void }) {
  const { lang } = useLang();
  const ar = lang === "ar";
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
      dir={ar ? "rtl" : "ltr"}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-3"
            style={{
              background: "rgba(0,212,161,0.1)",
              border: "1px solid rgba(0,212,161,0.2)",
              color: "var(--brand-teal)",
            }}
          >
            <Sparkles size={11} />
            {td("yourPlan", ar)}
          </div>
          <p className="text-sm max-w-2xl leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {plan.profile.summary}
          </p>
          {/* Market context chips */}
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
          {/* Market notice badge — only if AI flagged a concern */}
          {plan.marketInsights?.notice && (
            <div className="mt-3 px-3 py-3 rounded-xl"
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)" }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <AlertTriangle size={12} style={{ color: "#f59e0b" }} />
                <span className="text-xs font-bold tracking-wide" style={{ color: "#f59e0b" }}>{td("marketNotice", ar)}</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "#fbbf24" }}>
                {plan.marketInsights.notice}
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href="/roadmap"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
            style={{
              background: "linear-gradient(135deg, #00d4a1, #22d3ee)",
              color: "#0a1628",
            }}
          >
            <Map size={12} />
            {td("viewRoadmap", ar)}
          </Link>
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all hover:opacity-80"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-muted)",
            }}
          >
            <RotateCcw size={12} />
            {td("restart", ar)}
          </button>
        </div>
      </div>

      {/* Today's Focus */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative overflow-hidden rounded-2xl p-6"
        style={{
          background: "linear-gradient(135deg, rgba(0,212,161,0.08) 0%, rgba(34,211,238,0.06) 100%)",
          border: "1px solid rgba(0,212,161,0.2)",
        }}
      >
        <div
          className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(circle, #00d4a1, #22d3ee)" }}
        />
        <div className="relative z-10">
          <div
            className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-semibold mb-4"
            style={{ background: "rgba(0,212,161,0.12)", color: "#00d4a1" }}
          >
            <Target size={11} />
            {td("todayFocus", ar)}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex-1">
              <h2
                className="text-2xl font-bold mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                {plan.todaysFocus.topic}
              </h2>
              <p className="text-sm mb-3 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {plan.todaysFocus.reason}
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                  style={{
                    background: "rgba(0,212,161,0.1)",
                    border: "1px solid rgba(0,212,161,0.2)",
                    color: "#00d4a1",
                  }}
                >
                  <Clock size={11} />
                  {plan.todaysFocus.duration}
                </div>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {plan.todaysFocus.action}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <PriorityBarChart priorities={plan.priorities} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <DonutChart slices={plan.timeAllocation} />
        </motion.div>
      </div>

      {/* Topic connections */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <TopicConnections links={plan.topicConnections} />
      </motion.div>

      {/* Course Recommendations */}
      {plan.courseRecommendations && plan.courseRecommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="rounded-2xl p-6"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
        >
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <BookOpen size={15} style={{ color: "#a78bfa" }} />
            {td("recCourses", ar)}
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {plan.courseRecommendations.map((course, i) => (
              <div
                key={i}
                className="flex flex-col gap-2 p-4 rounded-xl"
                style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold leading-snug mb-1" style={{ color: "var(--text-primary)" }}>
                      {course.title}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="px-2 py-0.5 rounded-md text-[10px] font-bold"
                        style={{ background: "rgba(167,139,250,0.12)", color: "#a78bfa" }}
                      >
                        {course.platform}
                      </span>
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        {course.estimatedHours}h · {course.level}
                      </span>
                    </div>
                  </div>
                  {course.url ? (
                    <a
                      href={course.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all hover:opacity-80"
                      style={{
                        background: "linear-gradient(135deg, #00d4a1, #22d3ee)",
                        color: "#0a1628",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {td("open", ar)}
                      <ExternalLink size={9} />
                    </a>
                  ) : (
                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent(course.title + " " + course.platform)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all hover:opacity-80"
                      style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--text-muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {td("search", ar)}
                      <ExternalLink size={9} />
                    </a>
                  )}
                </div>
                <p className="text-[10px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {course.focus}
                </p>
                <div className="flex items-center justify-between">
                  <span
                    className="text-[10px] font-medium px-2 py-0.5 rounded-md"
                    style={{ background: "rgba(0,212,161,0.08)", color: "#00d4a1" }}
                  >
                    {course.phase}
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    {td("by", ar)} {course.instructor}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Next steps */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-2xl p-6"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <h3
          className="text-sm font-bold mb-4 flex items-center gap-2"
          style={{ color: "var(--text-primary)" }}
        >
          <ArrowRight size={15} style={{ color: "var(--brand-teal)" }} />
          {td("nextSteps", ar)}
        </h3>
        <ol className="space-y-3">
          {plan.nextSteps.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  background: "linear-gradient(135deg, #00d4a1, #22d3ee)",
                  color: "#0a1628",
                  border: "2px solid rgba(255,255,255,0.3)",
                  boxShadow: "0 0 10px rgba(0,212,161,0.4)",
                  minWidth: "28px",
                }}
              >
                {i + 1}
              </span>
              <p className="text-sm pt-0.5 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {step}
              </p>
            </li>
          ))}
        </ol>
      </motion.div>
    </motion.div>
  );
}

/* ── Main Dashboard ─────────────────────────────────────────────── */
export function AIDashboard({ firstName }: { firstName: string }) {
  const [phase, setPhase] = useState<Phase>("welcome");
  const [messages, setMessages] = useState<Message[]>([]);
  const [plan, setPlan] = useState<LearningPlan | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { lang } = useLang();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamBufferRef = useRef("");

  // Restore saved plan from DB on mount
  useEffect(() => {
    fetch("/api/user/roadmap")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.planJson && (data.planJson as LearningPlan).type === "LEARNING_PLAN") {
          setPlan(data.planJson as LearningPlan);
          setPhase("plan");
        }
      })
      .catch(() => null)
      .finally(() => setIsInitializing(false));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamedText, isLoading]);

  const sendMessage = useCallback(async (userText: string) => {
    if (!userText.trim() || isLoading) return;

    const newMessages: Message[] = [
      ...messages,
      { role: "user" as const, content: userText.trim() },
    ];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    setStreamedText("");

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok || !res.body) {
        throw new Error("API error");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      streamBufferRef.current = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        streamBufferRef.current += decoder.decode(value, { stream: true });
        setStreamedText(streamBufferRef.current);
      }
      const full = streamBufferRef.current;

      // Check if it's a learning plan
      const detected = parsePlan(full);
      if (detected) {
        setPlan(detected);
        setPhase("plan");
        setMessages([...newMessages, { role: "assistant", content: full }]);
        // Persist to database
        fetch("/api/user/roadmap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: detected }),
        }).then((r) => {
          if (!r.ok) r.json().then((d) => console.error("[roadmap save] failed:", d)).catch(() => null);
        }).catch((err) => console.error("[roadmap save] network error:", err));
      } else if (looksLikePlanAttempt(full)) {
        // AI tried to generate a plan but output was malformed/truncated
        setMessages([
          ...newMessages,
          { role: "assistant", content: "I had trouble generating your plan — the response was incomplete. Please send your last message again and I'll try once more." },
        ]);
      } else {
        setMessages([...newMessages, { role: "assistant", content: full }]);
      }
    } catch {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "I'm sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
      setStreamedText("");
    }
  }, [messages, isLoading]);

  const startInterview = useCallback(async () => {
    setPhase("chat");
    setIsLoading(true);
    setStreamedText("");

    try {
      const greeting = lang === "ar"
        ? "مرحباً! أنا مستعد للحصول على خطة العمل الشخصية الخاصة بي."
        : "Hello! I'm ready to get my personalized action plan.";
      const initMessages: Message[] = [{ role: "user", content: greeting }];
      setMessages(initMessages);

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: initMessages, isInit: true }),
      });

      if (!res.ok || !res.body) throw new Error("API error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      streamBufferRef.current = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        streamBufferRef.current += decoder.decode(value, { stream: true });
        setStreamedText(streamBufferRef.current);
      }
      const full = streamBufferRef.current;

      setMessages([...initMessages, { role: "assistant", content: full }]);
    } catch {
      setMessages([
        { role: "user", content: "Hello!" },
        { role: "assistant", content: "Welcome! I'm your AI life advisor. I'm here to help you achieve any goal or dream. Tell me a bit about yourself — who are you and where are you in life right now?" },
      ]);
    } finally {
      setIsLoading(false);
      setStreamedText("");
    }
  }, [lang]);

  const handleReset = useCallback(() => {
    setShowResetConfirm(true);
  }, []);

  const handleConfirmReset = useCallback(async () => {
    setIsDeleting(true);
    try {
      await fetch("/api/user/roadmap", { method: "DELETE" });
    } catch {
      // ignore — reset UI regardless
    } finally {
      setIsDeleting(false);
      setShowResetConfirm(false);
      setPhase("welcome");
      setMessages([]);
      setPlan(null);
      setInput("");
      setStreamedText("");
      setIsLoading(false);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  if (isInitializing) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center" style={{ minHeight: "60vh" }}>
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl animate-pulse"
            style={{ background: "linear-gradient(135deg, rgba(0,212,161,0.3), rgba(34,211,238,0.3))" }}
          />
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full animate-bounce"
                style={{ background: "#00d4a1", animationDelay: `${i * 0.15}s`, opacity: 0.7 }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page header */}
      {phase !== "welcome" && (
        <div className="flex items-center justify-between mb-6" dir={lang === "ar" ? "rtl" : "ltr"}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>
              {td("advisorLabel", lang === "ar")}
            </p>
            <h1 className="text-2xl lg:text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
              {phase === "chat"
                ? `${firstName}، ${td("chatHeading", lang === "ar")}`
                : `${firstName}'s Action Plan`}
            </h1>
          </div>
          {phase === "chat" && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all hover:opacity-80"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-muted)",
              }}
            >
              <RotateCcw size={12} />
              {td("startOver", lang === "ar")}
            </button>
          )}
        </div>
      )}

      <AnimatePresence mode="wait">
        {phase === "welcome" && (
          <WelcomeScreen key="welcome" onStart={startInterview} />
        )}

        {phase === "chat" && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col"
            style={{ height: "calc(100vh - 220px)", minHeight: "480px" }}
          >
            {/* Messages area */}
            <div
              className="flex-1 overflow-y-auto rounded-2xl p-6 space-y-6 mb-4"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
                boxShadow: "inset 0 1px 0 rgba(0,212,161,0.04)",
              }}
            >

              {messages.map((msg, i) => {
                // Don't render the silent greeting sent at start
                if (msg.role === "user" && (
                  msg.content === "Hello! I'm ready to get my personalized action plan." ||
                  msg.content === "مرحباً! أنا مستعد للحصول على خطة العمل الشخصية الخاصة بي."
                )) return null;
                return <ChatBubble key={i} msg={msg} />;
              })}

              {/* Loading indicator — shown throughout generation (no raw streaming text) */}
              {isLoading && (
                <TypingIndicator isPlan={looksLikePlanAttempt(streamedText)} />
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div
              className="flex items-end gap-3 p-3 rounded-2xl"
              style={{
                background: "var(--bg-card)",
                border: "2px solid rgba(0,212,161,0.25)",
                boxShadow: "0 0 0 1px rgba(0,212,161,0.08)",
              }}
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  const el = e.target;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 120) + "px";
                }}
                onKeyDown={handleKeyDown}
                placeholder={td("placeholder", lang === "ar")}
                rows={1}
                disabled={isLoading}
                dir={getTextDir(input)}
                className="flex-1 resize-none bg-transparent outline-none text-sm leading-relaxed py-1 disabled:opacity-40"
                style={{
                  color: "var(--text-primary)",
                  maxHeight: "120px",
                  overflowY: "auto",
                  caretColor: "#00d4a1",
                  height: "auto",
                  textAlign: isArabic(input) ? "right" : "left",
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                style={{
                  background: input.trim() && !isLoading
                    ? "linear-gradient(135deg, #00d4a1, #22d3ee)"
                    : "var(--bg-base)",
                  boxShadow: input.trim() && !isLoading ? "0 0 16px rgba(0,212,161,0.4)" : "none",
                  border: "1px solid rgba(0,212,161,0.2)",
                }}
              >
                <Send size={15} className="text-white" />
              </button>
            </div>
          </motion.div>
        )}

        {phase === "plan" && plan && (
          <motion.div key="plan" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <PlanView plan={plan} onReset={handleReset} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showResetConfirm && (
          <ConfirmDialog
            open={showResetConfirm}
            title={td("startOverTitle", lang === "ar")}
            message={td("startOverMsg", lang === "ar")}
            confirmLabel={td("startOverConfirm", lang === "ar")}
            onConfirm={handleConfirmReset}
            onCancel={() => setShowResetConfirm(false)}
            isLoading={isDeleting}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
