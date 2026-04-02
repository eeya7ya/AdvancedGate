"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Send, Sparkles, Brain, Target, Clock, ArrowRight, RotateCcw, Map, Globe, X, Trash2, TrendingUp, MessageCircle, CalendarDays, CheckCircle } from "lucide-react";
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
  sourceType?: "free" | "paid" | "certificate" | "official";
  isFree?: boolean;
  hasCertificate?: boolean;
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
  badge:          { en: "AI Advisor · Powered by eSpark", ar: "مستشار ذكاء اصطناعي · مدعوم بـ eSpark" },
  heroTitle:      { en: "Build your path.", ar: "ابنِ طريقك." },
  heroAI:         { en: "Start with a conversation.", ar: "ابدأ بمحادثة." },
  heroDesc:       { en: "Tell the advisor where you are and what you want. It will map out courses, weekly schedules, and concrete next steps — and save everything so you can pick up where you left off.", ar: "أخبر المستشار أين أنت وماذا تريد. سيضع لك خارطة دورات وجداول أسبوعية وخطوات عملية واضحة — ويحفظ كل شيء حتى تكمل من حيث توقفت." },
  startSession:   { en: "Start Session", ar: "ابدأ الجلسة" },
  chip1:          { en: "Courses & roadmaps", ar: "دورات وخرائط طريق" },
  chip2:          { en: "Weekly schedule", ar: "جدول أسبوعي" },
  chip3:          { en: "Progress saved", ar: "التقدم محفوظ" },
  chip4:          { en: "Any goal or field", ar: "أي هدف أو مجال" },
  yourPlan:       { en: "Your Personalized Action Plan", ar: "خطتك الشخصية" },
  marketNotice:   { en: "Market Notice", ar: "تنبيه السوق" },
  viewRoadmap:    { en: "View Roadmap", ar: "عرض خارطة الطريق" },
  viewAnalysis:   { en: "View Analysis", ar: "عرض التحليل" },
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
  chatPlaceholder:{ en: "Ask your AI guide anything... (Enter to send)", ar: "اسأل مرشدك الذكي أي شيء... (Enter للإرسال)" },
  crafting:       { en: "Crafting your personalized roadmap...", ar: "جارٍ إنشاء خارطة طريقك الشخصية..." },
  startOverTitle: { en: "Start Over?", ar: "البدء من جديد؟" },
  startOverMsg:   { en: "This will permanently delete your saved roadmap and all session data, then restart from scratch. This cannot be undone.", ar: "سيؤدي هذا إلى حذف خارطة طريقك المحفوظة وجميع بيانات الجلسة نهائياً، ثم البدء من الصفر. لا يمكن التراجع عن هذا." },
  startOverConfirm: { en: "Yes, Delete & Restart", ar: "نعم، احذف وابدأ من جديد" },
  aiGuide:        { en: "Your AI Guide", ar: "مرشدك الذكي" },
  introWelcome:   { en: "Welcome to eSpark", ar: "مرحباً بك في eSpark" },
  introSub:       { en: "Let's figure out how we can help you.", ar: "دعنا نكتشف كيف يمكننا مساعدتك." },
  introSkip:      { en: "Skip intro", ar: "تخطى المقدمة" },
  introQuestion:  { en: "What brings you here today?", ar: "ما الذي أتى بك إلينا اليوم؟" },
  introGo:        { en: "Got it, let's go!", ar: "فهمت، هيا نبدأ!" },
  guideAdvisor:   { en: "This is your AI Advisor — ask it anything about your plan", ar: "هذا هو مستشارك الذكي — اسأله أي شيء عن خطتك" },
  guideSidebar:   { en: "Navigate to Courses, Roadmap, Schedule and more", ar: "تصفح الدورات وخارطة الطريق والجدول وأكثر" },
  guideSearch:    { en: "Deep Search finds relevant courses and official docs for any topic", ar: "البحث العميق يجد الدورات والمراجع الرسمية لأي موضوع" },
  guideReady:     { en: "Your AI advisor is ready to build your personalized learning roadmap", ar: "مستشارك الذكي جاهز لبناء خارطة تعلمك الشخصية" },
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

/* ── Intro Overlay ─────────────────────────────────────────────── */
const SCENARIOS = [
  { id: "career",    emoji: "🗺️", en: "Work Roadmap / Career Path",     ar: "خارطة العمل / المسار المهني",    descEn: "Build a step-by-step plan for your professional goals",            descAr: "ابنِ خطة خطوة بخطوة لأهدافك المهنية" },
  { id: "study",     emoji: "📚", en: "Study Specific Classes",          ar: "دراسة مواد محددة",               descEn: "Follow structured learning paths and courses",                     descAr: "اتبع مسارات تعلم منظمة ودورات دراسية" },
  { id: "explore",   emoji: "🔭", en: "Explore Fields & Domains",        ar: "استكشاف المجالات والتخصصات",     descEn: "Discover what's out there and find your direction",                 descAr: "اكتشف ما يتوفر وابحث عن اتجاهك" },
  { id: "freelance", emoji: "💼", en: "Freelance / Business Growth",     ar: "العمل الحر / نمو الأعمال",       descEn: "Scale your work, find clients, build your brand",                  descAr: "طوّر عملك وابحث عن عملاء وابنِ علامتك التجارية" },
  { id: "help",      emoji: "🤝", en: "I Need Help / I'm Struggling",   ar: "أحتاج مساعدة / أواجه صعوبات",  descEn: "General guidance for whatever challenge you're facing",             descAr: "توجيه عام لأي تحدي تواجهه" },
];

const GUIDE_STEPS = [
  { keyRef: "advisor", icon: "🤖" },
  { keyRef: "sidebar", icon: "📂" },
  { keyRef: "search",  icon: "🔍" },
  { keyRef: "ready",   icon: "🎯" },
];

function IntroOverlay({
  firstName,
  onComplete,
}: {
  firstName: string;
  onComplete: (scenarioId: string, scenarioLabel: string) => void;
}) {
  const { lang } = useLang();
  const ar = lang === "ar";
  const [phase, setPhase] = useState<"typing" | "scenarios" | "guide">("typing");
  const [typed, setTyped] = useState("");
  const [noiseChar, setNoiseChar] = useState("");
  const [subVisible, setSubVisible] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<(typeof SCENARIOS)[0] | null>(null);
  const [guideStep, setGuideStep] = useState(0);

  const welcomeText = ar
    ? `مرحباً بك في eSpark، ${firstName}.`
    : `Welcome to eSpark, ${firstName}.`;

  // Old-printer typewriter effect with variable timing and noise chars
  useEffect(() => {
    if (phase !== "typing") return;
    let i = 0;
    let cancelled = false;
    setTyped("");
    setNoiseChar("");
    setSubVisible(false);

    const NOISE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@!%&*";

    const printNext = () => {
      if (cancelled) return;
      if (i >= welcomeText.length) {
        setNoiseChar("");
        setTimeout(() => { if (!cancelled) setSubVisible(true); }, 400);
        setTimeout(() => { if (!cancelled) setPhase("scenarios"); }, 2800);
        return;
      }
      // 28% chance of noise char appearing before the real char settles
      const hasNoise = Math.random() < 0.28;
      if (hasNoise) {
        setNoiseChar(NOISE_CHARS[Math.floor(Math.random() * NOISE_CHARS.length)]);
        setTimeout(() => {
          if (cancelled) return;
          setNoiseChar("");
          i++;
          setTyped(welcomeText.slice(0, i));
          setTimeout(printNext, 40 + Math.random() * 35);
        }, 30);
      } else {
        i++;
        setTyped(welcomeText.slice(0, i));
        setTimeout(printNext, 40 + Math.random() * 35);
      }
    };

    setTimeout(printNext, 300);
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, lang]);

  const handleScenarioSelect = (scenario: (typeof SCENARIOS)[0]) => {
    setSelectedScenario(scenario);
    setTimeout(() => setPhase("guide"), 300);
  };

  const handleFinish = () => {
    if (!selectedScenario) return;
    onComplete(selectedScenario.id, ar ? selectedScenario.ar : selectedScenario.en);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden"
      style={{
        background: "radial-gradient(ellipse 90% 70% at 50% 38%, rgba(0,212,161,0.09) 0%, rgba(5,8,22,0.97) 65%)",
        backdropFilter: "blur(20px)",
      }}
      dir={ar ? "rtl" : "ltr"}
    >
      {/* CRT scanlines overlay */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.13) 1px, rgba(0,0,0,0.13) 2px)",
          backgroundSize: "100% 2px",
        }}
      />
      {/* Edge vignette */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.55) 100%)",
        }}
      />
      {/* Top glare streak */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none z-0"
        style={{
          width: "60%",
          height: "1px",
          background: "linear-gradient(90deg, transparent, rgba(0,212,161,0.25), transparent)",
        }}
      />
      <AnimatePresence mode="wait">

        {/* Phase 1 — Typewriter */}
        {phase === "typing" && (
          <motion.div
            key="typing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="text-center max-w-xl relative z-10"
          >
            {/* Glowing icon with printer-flicker effect */}
            <div className="relative mb-10">
              <div
                className="absolute inset-0 rounded-full blur-3xl scale-[2] opacity-20"
                style={{ background: "radial-gradient(circle, #00d4a1, #22d3ee)" }}
              />
              <div
                className="relative w-20 h-20 rounded-3xl flex items-center justify-center mx-auto animate-printer-flicker"
                style={{
                  background: "linear-gradient(135deg, #00d4a1, #22d3ee)",
                  boxShadow: "0 0 40px rgba(0,212,161,0.5), 0 0 80px rgba(0,212,161,0.15)",
                }}
              >
                <Brain size={40} className="text-white" />
              </div>
            </div>

            {/* Printer-style terminal text */}
            <div
              className="inline-block px-6 py-4 rounded-xl mb-6"
              style={{
                background: "rgba(0,0,0,0.35)",
                border: "1px solid rgba(0,212,161,0.2)",
                boxShadow: "inset 0 0 30px rgba(0,0,0,0.3)",
              }}
            >
              <h1
                className="text-2xl lg:text-3xl font-bold text-white min-h-[1.4em] animate-printer-flicker"
                style={{
                  fontFamily: "'Courier New', Courier, monospace",
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "0.04em",
                  textShadow: "0 0 8px rgba(0,212,161,0.7), 0 0 20px rgba(0,212,161,0.25)",
                }}
              >
                {typed}
                {noiseChar && (
                  <span style={{ color: "#4ade80", opacity: 0.65 }}>{noiseChar}</span>
                )}
                <span
                  className="animate-blink-cursor inline-block w-[0.55em] h-[1.1em] ml-0.5 align-text-bottom"
                  style={{
                    background: "#00d4a1",
                    boxShadow: "0 0 6px rgba(0,212,161,0.8)",
                    verticalAlign: "text-bottom",
                  }}
                />
              </h1>
            </div>

            <AnimatePresence>
              {subVisible && (
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-base"
                  style={{
                    color: "rgba(255,255,255,0.55)",
                    fontFamily: "'Courier New', Courier, monospace",
                    letterSpacing: "0.03em",
                  }}
                >
                  {td("introSub", ar)}
                </motion.p>
              )}
            </AnimatePresence>
            <button
              onClick={() => setPhase("scenarios")}
              className="mt-10 text-xs font-medium hover:opacity-70 transition-opacity"
              style={{ color: "rgba(255,255,255,0.25)", fontFamily: "'Courier New', Courier, monospace" }}
            >
              {td("introSkip", ar)}
            </button>
          </motion.div>
        )}

        {/* Phase 2 — Scenario Selection */}
        {phase === "scenarios" && (
          <motion.div
            key="scenarios"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-5xl min-h-[80vh] flex flex-col justify-center relative z-10"
          >
            <h2 className="text-3xl lg:text-4xl font-black text-white text-center mb-3">
              {td("introQuestion", ar)}
            </h2>
            <p className="text-center text-base mb-10" style={{ color: "rgba(255,255,255,0.72)" }}>
              {ar ? "اختر ما يصف وضعك أفضل" : "Choose what best describes your situation"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SCENARIOS.slice(0, 4).map((s) => (
                <motion.button
                  key={s.id}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleScenarioSelect(s)}
                  className="flex items-start gap-5 p-6 rounded-2xl text-left transition-all min-h-[110px]"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.border = "1px solid rgba(0,212,161,0.4)";
                    (e.currentTarget as HTMLElement).style.background = "rgba(0,212,161,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.border = "1px solid rgba(255,255,255,0.1)";
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                  }}
                >
                  <span className="text-3xl flex-shrink-0 mt-0.5">{s.emoji}</span>
                  <div className={ar ? "text-right" : "text-left"}>
                    <div className="text-base font-bold text-white mb-1.5">
                      {ar ? s.ar : s.en}
                    </div>
                    <div className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.72)" }}>
                      {ar ? s.descAr : s.descEn}
                    </div>
                  </div>
                </motion.button>
              ))}
              {/* 5th card — full width, centered */}
              <div className="sm:col-span-2 flex justify-center">
                <motion.button
                  key={SCENARIOS[4].id}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleScenarioSelect(SCENARIOS[4])}
                  className="w-full max-w-lg flex items-start gap-5 p-6 rounded-2xl text-left transition-all min-h-[110px]"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.border = "1px solid rgba(0,212,161,0.4)";
                    (e.currentTarget as HTMLElement).style.background = "rgba(0,212,161,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.border = "1px solid rgba(255,255,255,0.1)";
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                  }}
                >
                  <span className="text-3xl flex-shrink-0 mt-0.5">{SCENARIOS[4].emoji}</span>
                  <div className={ar ? "text-right" : "text-left"}>
                    <div className="text-base font-bold text-white mb-1.5">
                      {ar ? SCENARIOS[4].ar : SCENARIOS[4].en}
                    </div>
                    <div className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.72)" }}>
                      {ar ? SCENARIOS[4].descAr : SCENARIOS[4].descEn}
                    </div>
                  </div>
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Phase 3 — Navigation Guide */}
        {phase === "guide" && (
          <motion.div
            key="guide"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md text-center relative z-10"
          >
            {selectedScenario && (
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-8"
                style={{
                  background: "rgba(0,212,161,0.12)",
                  border: "1px solid rgba(0,212,161,0.3)",
                  color: "#00d4a1",
                }}
              >
                <span>{selectedScenario.emoji}</span>
                {ar ? selectedScenario.ar : selectedScenario.en}
              </div>
            )}

            <div className="space-y-3 mb-8">
              {GUIDE_STEPS.map((step, idx) => {
                const passed = idx < guideStep;
                const active = idx === guideStep;
                return (
                  <motion.div
                    key={step.keyRef}
                    initial={{ opacity: 0, x: ar ? 20 : -20 }}
                    animate={{ opacity: idx <= guideStep ? 1 : 0.3, x: 0 }}
                    transition={{ delay: idx * 0.12 }}
                    className="flex items-center gap-3 p-4 rounded-2xl"
                    style={{
                      background: active
                        ? "rgba(0,212,161,0.1)"
                        : passed
                        ? "rgba(255,255,255,0.03)"
                        : "transparent",
                      border: active
                        ? "1px solid rgba(0,212,161,0.3)"
                        : "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <span className="text-xl flex-shrink-0">{step.icon}</span>
                    <p
                      className={`text-sm ${ar ? "text-right" : "text-left"}`}
                      style={{ color: active ? "#f8fafc" : "rgba(255,255,255,0.65)" }}
                    >
                      {td(`guide${step.keyRef.charAt(0).toUpperCase()}${step.keyRef.slice(1)}`, ar)}
                    </p>
                    {passed && (
                      <span className="ms-auto text-[#00d4a1] flex-shrink-0">✓</span>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {guideStep < GUIDE_STEPS.length - 1 ? (
              <button
                onClick={() => setGuideStep((s) => s + 1)}
                className="px-6 py-3 rounded-2xl text-sm font-semibold transition-all hover:opacity-90"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#e2e8f0",
                }}
              >
                {ar ? "التالي ←" : "Next →"}
              </button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleFinish}
                className="px-8 py-3.5 rounded-2xl text-sm font-bold text-white transition-all"
                style={{
                  background: "linear-gradient(135deg, #00d4a1, #22d3ee)",
                  boxShadow: "0 0 32px rgba(0,212,161,0.4)",
                }}
              >
                {td("introGo", ar)}
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Welcome Screen ─────────────────────────────────────────────── */
const WELCOME_FEATURES: { icon: React.ReactNode; keyEn: string; keyAr: string }[] = [
  { icon: <Map size={14} />,         keyEn: "Courses & roadmaps",  keyAr: "دورات وخرائط طريق" },
  { icon: <CalendarDays size={14} />, keyEn: "Weekly schedule",    keyAr: "جدول أسبوعي" },
  { icon: <CheckCircle size={14} />,  keyEn: "Progress saved",     keyAr: "التقدم محفوظ" },
  { icon: <Sparkles size={14} />,     keyEn: "Any goal or field",  keyAr: "أي هدف أو مجال" },
];

function WelcomeScreen({ onStart }: { onStart: () => void }) {
  const { lang } = useLang();
  const ar = lang === "ar";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center min-h-[60vh] px-4"
      dir={ar ? "rtl" : "ltr"}
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.05, type: "spring", stiffness: 220 }}
        className="relative mb-7"
      >
        <div
          className="absolute inset-0 rounded-full blur-2xl scale-150 opacity-30"
          style={{ background: "linear-gradient(135deg, #00d4a1, #22d3ee)" }}
        />
        <div
          className="relative w-20 h-20 rounded-2xl flex items-center justify-center animate-float"
          style={{ background: "linear-gradient(135deg, #00d4a1, #22d3ee)" }}
        >
          <Brain size={38} className="text-white" strokeWidth={1.5} />
        </div>
      </motion.div>

      {/* Heading block */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="text-center max-w-md"
      >
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: "var(--brand-teal)" }}
        >
          {td("badge", ar)}
        </p>
        <h1
          className="text-3xl lg:text-4xl font-bold mb-1 leading-tight"
          style={{ color: "var(--text-primary)" }}
        >
          {td("heroTitle", ar)}
        </h1>
        <h2
          className="text-xl lg:text-2xl font-semibold mb-5 gradient-text-ai"
        >
          {td("heroAI", ar)}
        </h2>
        <p
          className="text-sm leading-relaxed mb-8"
          style={{ color: "var(--text-secondary)" }}
        >
          {td("heroDesc", ar)}
        </p>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onStart}
          className="relative inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl text-sm font-bold text-white overflow-hidden group"
          style={{
            background: "linear-gradient(135deg, #00d4a1, #22d3ee)",
            boxShadow: "0 0 32px rgba(0,212,161,0.3)",
          }}
        >
          <span
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: "linear-gradient(135deg, #00c090, #0ea5c5)" }}
          />
          <Brain size={16} className="relative z-10" />
          <span className="relative z-10">{td("startSession", ar)}</span>
          <ArrowRight size={16} className="relative z-10" />
        </motion.button>
      </motion.div>

      {/* Feature grid */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-2 gap-2.5 mt-10 w-full max-w-xs"
      >
        {WELCOME_FEATURES.map((f) => (
          <div
            key={f.keyEn}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)",
            }}
          >
            <span style={{ color: "var(--brand-teal)" }}>{f.icon}</span>
            {ar ? f.keyAr : f.keyEn}
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}

/* ── Plan View — AI Guide with Embedded Chat ───────────────────── */
function PlanView({ plan, onReset }: { plan: LearningPlan; onReset: () => void }) {
  const { lang } = useLang();
  const ar = lang === "ar";

  // Embedded chat state
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatStreamedText, setChatStreamedText] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatTextareaRef = useRef<HTMLTextAreaElement>(null);
  const chatStreamRef = useRef("");

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatStreamedText, chatLoading]);

  const sendChatMessage = useCallback(async (text: string) => {
    if (!text.trim() || chatLoading) return;
    const updated: Message[] = [...chatMessages, { role: "user", content: text.trim() }];
    setChatMessages(updated);
    setChatInput("");
    setChatLoading(true);
    setChatStreamedText("");
    chatStreamRef.current = "";

    try {
      const res = await fetch("/api/ai/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated }),
      });
      if (!res.ok || !res.body) throw new Error("API error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chatStreamRef.current += decoder.decode(value, { stream: true });
        setChatStreamedText(chatStreamRef.current);
      }
      setChatMessages([...updated, { role: "assistant", content: chatStreamRef.current }]);
    } catch {
      setChatMessages([...updated, { role: "assistant", content: ar ? "عذراً، حدث خطأ. حاول مرة أخرى." : "Sorry, something went wrong. Please try again." }]);
    } finally {
      setChatLoading(false);
      setChatStreamedText("");
    }
  }, [chatMessages, chatLoading, ar]);

  const handleChatKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage(chatInput);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-5"
      dir={ar ? "rtl" : "ltr"}
    >
      {/* Header with nav links */}
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
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href="/analysis"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
            style={{
              background: "rgba(167,139,250,0.15)",
              border: "1px solid rgba(167,139,250,0.3)",
              color: "#a78bfa",
            }}
          >
            <TrendingUp size={12} />
            {td("viewAnalysis", ar)}
          </Link>
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

      {/* Compact Today's Focus */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative overflow-hidden rounded-2xl p-5"
        style={{
          background: "linear-gradient(135deg, rgba(0,212,161,0.08) 0%, rgba(34,211,238,0.06) 100%)",
          border: "1px solid rgba(0,212,161,0.2)",
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div
              className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-semibold mb-2"
              style={{ background: "rgba(0,212,161,0.12)", color: "#00d4a1" }}
            >
              <Target size={11} />
              {td("todayFocus", ar)}
            </div>
            <h2 className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)" }}>
              {plan.todaysFocus.topic}
            </h2>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {plan.todaysFocus.reason}
            </p>
          </div>
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold flex-shrink-0"
            style={{
              background: "rgba(0,212,161,0.1)",
              border: "1px solid rgba(0,212,161,0.2)",
              color: "#00d4a1",
            }}
          >
            <Clock size={11} />
            {plan.todaysFocus.duration}
          </div>
        </div>
      </motion.div>

      {/* Embedded AI Chat */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          height: "calc(100vh - 420px)",
          minHeight: "400px",
        }}
      >
        {/* Chat header */}
        <div
          className="flex items-center gap-2.5 px-5 py-3 border-b"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #00d4a1, #22d3ee)" }}
          >
            <MessageCircle size={13} className="text-white" />
          </div>
          <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            {td("aiGuide", ar)}
          </span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            — {ar ? "اسألني أي شيء عن خطتك" : "Ask me anything about your plan"}
          </span>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {chatMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 opacity-60">
              <Brain size={28} style={{ color: "var(--brand-teal)" }} />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {ar
                  ? "أنا مرشدك الذكي — اسأل عن جدولك أو دوراتك أو أي شيء يتعلق بخطتك"
                  : "I'm your AI guide — ask about your schedule, courses, or anything related to your plan"}
              </p>
            </div>
          )}
          {chatMessages.map((msg, i) => (
            <ChatBubble key={i} msg={msg} />
          ))}
          {chatLoading && chatStreamedText && (
            <div className="flex items-end gap-3">
              <AIAvatar />
              <div
                className="max-w-[80%] px-4 py-3 rounded-2xl rounded-bl-sm text-sm leading-relaxed whitespace-pre-wrap"
                dir={getTextDir(chatStreamedText)}
                style={{
                  background: "var(--bg-base)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-primary)",
                }}
              >
                {chatStreamedText}
              </div>
            </div>
          )}
          {chatLoading && !chatStreamedText && <TypingIndicator />}
          <div ref={chatEndRef} />
        </div>

        {/* Chat input */}
        <div
          className="flex items-end gap-3 p-3 border-t"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <textarea
            ref={chatTextareaRef}
            value={chatInput}
            onChange={(e) => {
              setChatInput(e.target.value);
              const el = e.target;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 160) + "px";
            }}
            onKeyDown={handleChatKeyDown}
            placeholder={td("chatPlaceholder", ar)}
            rows={1}
            disabled={chatLoading}
            dir={getTextDir(chatInput)}
            className="flex-1 resize-none bg-transparent outline-none text-sm leading-relaxed py-1.5 disabled:opacity-40"
            style={{
              color: "var(--text-primary)",
              minHeight: "36px",
              maxHeight: "160px",
              overflowY: "auto",
              caretColor: "#00d4a1",
              height: "36px",
              textAlign: isArabic(chatInput) ? "right" : "left",
              wordBreak: "break-word",
              whiteSpace: "pre-wrap",
            }}
          />
          <button
            onClick={() => sendChatMessage(chatInput)}
            disabled={!chatInput.trim() || chatLoading}
            className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
            style={{
              background: chatInput.trim() && !chatLoading
                ? "linear-gradient(135deg, #00d4a1, #22d3ee)"
                : "var(--bg-base)",
              boxShadow: chatInput.trim() && !chatLoading ? "0 0 16px rgba(0,212,161,0.4)" : "none",
              border: "1px solid rgba(0,212,161,0.2)",
            }}
          >
            <Send size={15} className="text-white" />
          </button>
        </div>
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
  const [showIntro, setShowIntro] = useState(false);
  const [scenario, setScenario] = useState<string>("");
  const { lang } = useLang();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamBufferRef = useRef("");

  // Restore saved plan from DB on mount; show intro whenever there is no plan
  useEffect(() => {
    const savedScenario = localStorage.getItem("espark-scenario") ?? "";
    if (savedScenario) setScenario(savedScenario);

    // --- sessionStorage plan cache: show saved plan instantly, then re-validate in background ---
    const CACHE_KEY = "espark-plan-cache";
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as LearningPlan;
        if (parsed?.type === "LEARNING_PLAN") {
          setPlan(parsed);
          setPhase("plan");
          setIsInitializing(false);
          // Revalidate silently in background — update cache but don't re-render if plan unchanged
          fetch("/api/user/roadmap")
            .then((r) => r.ok ? r.json() : null)
            .then((data) => {
              if (data?.planJson && (data.planJson as LearningPlan).type === "LEARNING_PLAN") {
                sessionStorage.setItem(CACHE_KEY, JSON.stringify(data.planJson));
              } else {
                // Plan was deleted externally — clear cache + reset
                sessionStorage.removeItem(CACHE_KEY);
              }
            })
            .catch(() => {});
          return;
        }
      } catch {
        sessionStorage.removeItem(CACHE_KEY);
      }
    }

    const introSeen = localStorage.getItem("espark-intro-seen");

    fetch("/api/user/roadmap")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.planJson && (data.planJson as LearningPlan).type === "LEARNING_PLAN") {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(data.planJson));
          setPlan(data.planJson as LearningPlan);
          setPhase("plan");
        } else if (!introSeen) {
          // First visit — show full intro
          setShowIntro(true);
        }
        // else: intro already seen this session → show WelcomeScreen directly
      })
      .catch(() => {
        if (!introSeen) setShowIntro(true);
      })
      .finally(() => setIsInitializing(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep sessionStorage plan cache in sync — powers instant re-navigation
  useEffect(() => {
    if (plan) sessionStorage.setItem("espark-plan-cache", JSON.stringify(plan));
  }, [plan]);

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
        body: JSON.stringify({ messages: newMessages, isInit: true }),
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
        // Keep loading — wait for Tavily-enriched plan (with real course links) before showing anything
        setIsLoading(true);
        const tavilyController = new AbortController();
        const tavilyTimeout = setTimeout(() => tavilyController.abort(), 150000);
        fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: newMessages }), // isInit omitted → false → Tavily path
          signal: tavilyController.signal,
        })
          .then(async (r) => {
            clearTimeout(tavilyTimeout);
            if (!r.ok || !r.body) {
              // Fall back to initial plan if Tavily fails
              setPlan(detected);
              setPhase("plan");
              setMessages([...newMessages, { role: "assistant", content: full }]);
              fetch("/api/user/roadmap", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ plan: detected }),
              }).catch(() => null);
              return;
            }
            const tavilyReader = r.body.getReader();
            const tavilyDecoder = new TextDecoder();
            let tavilyText = "";
            while (true) {
              const { done, value } = await tavilyReader.read();
              if (done) break;
              tavilyText += tavilyDecoder.decode(value, { stream: true });
            }
            const enrichedPlan = parsePlan(tavilyText);
            if (enrichedPlan) {
              setPlan(enrichedPlan);
              setPhase("plan");
              setMessages([...newMessages, { role: "assistant", content: tavilyText }]);
              fetch("/api/user/roadmap", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ plan: enrichedPlan }),
              }).catch(() => null);
            } else {
              // Tavily response malformed — fall back to initial plan
              setPlan(detected);
              setPhase("plan");
              setMessages([...newMessages, { role: "assistant", content: full }]);
              fetch("/api/user/roadmap", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ plan: detected }),
              }).catch(() => null);
            }
          })
          .catch(() => {
            clearTimeout(tavilyTimeout);
            // On timeout/error fall back to initial plan
            setPlan(detected);
            setPhase("plan");
            setMessages([...newMessages, { role: "assistant", content: full }]);
            fetch("/api/user/roadmap", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ plan: detected }),
            }).catch(() => null);
          })
          .finally(() => setIsLoading(false));
      } else if (looksLikePlanAttempt(full)) {
        // Plan JSON was malformed/truncated — auto-retry via the full Tavily generation path silently
        setIsLoading(true);
        const retryController = new AbortController();
        const retryTimeout = setTimeout(() => retryController.abort(), 150000);
        fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: newMessages }), // isInit omitted → full Tavily plan path
          signal: retryController.signal,
        })
          .then(async (r) => {
            clearTimeout(retryTimeout);
            if (!r.ok || !r.body) return;
            const retryReader = r.body.getReader();
            const retryDecoder = new TextDecoder();
            let retryText = "";
            while (true) {
              const { done, value } = await retryReader.read();
              if (done) break;
              retryText += retryDecoder.decode(value, { stream: true });
            }
            const retryPlan = parsePlan(retryText);
            if (retryPlan) {
              setPlan(retryPlan);
              setPhase("plan");
              setMessages([...newMessages, { role: "assistant" as const, content: retryText }]);
              fetch("/api/user/roadmap", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ plan: retryPlan }),
              }).catch(() => null);
            }
          })
          .catch(() => { clearTimeout(retryTimeout); })
          .finally(() => setIsLoading(false));
      } else {
        setMessages([...newMessages, { role: "assistant", content: full }]);
      }
    } catch {
      // Silently stop loading on error — no error message shown in chat
    } finally {
      setIsLoading(false);
      setStreamedText("");
    }
  }, [messages, isLoading]);

  const startInterview = useCallback(async (scenarioLabel?: string) => {
    setPhase("chat");
    setIsLoading(true);
    setStreamedText("");
    const activeScenario = scenarioLabel ?? scenario;

    try {
      const focusSuffix = activeScenario ? ` My focus: ${activeScenario}.` : "";
      const greeting = lang === "ar"
        ? `مرحباً! أنا مستعد للحصول على خطة العمل الشخصية الخاصة بي.${activeScenario ? ` تركيزي: ${activeScenario}.` : ""}`
        : `Hello! I'm ready to get my personalized action plan.${focusSuffix}`;
      const initMessages: Message[] = [{ role: "user", content: greeting }];
      setMessages(initMessages);

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: initMessages, isInit: true, scenario: activeScenario }),
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
  }, [lang, scenario]);

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
      localStorage.removeItem("espark-scenario");
      localStorage.removeItem("espark-intro-seen");
      sessionStorage.removeItem("espark-plan-cache");
      setScenario("");
      setShowIntro(true);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // Must be declared before any early returns (Rules of Hooks)
  const handleIntroComplete = useCallback((scenarioId: string, scenarioLabel: string) => {
    void scenarioId;
    localStorage.setItem("espark-scenario", scenarioLabel);
    localStorage.setItem("espark-intro-seen", "1");
    setScenario(scenarioLabel);
    setShowIntro(false);
    void startInterview(scenarioLabel);
  }, [startInterview]);

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
      {/* First-time intro overlay */}
      <AnimatePresence>
        {showIntro && (
          <IntroOverlay
            key="intro"
            firstName={firstName}
            onComplete={handleIntroComplete}
          />
        )}
      </AnimatePresence>

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
                  el.style.height = Math.min(el.scrollHeight, 160) + "px";
                }}
                onKeyDown={handleKeyDown}
                placeholder={td("placeholder", lang === "ar")}
                rows={1}
                disabled={isLoading}
                dir={getTextDir(input)}
                className="flex-1 resize-none bg-transparent outline-none text-sm leading-relaxed py-1.5 disabled:opacity-40"
                style={{
                  color: "var(--text-primary)",
                  minHeight: "36px",
                  maxHeight: "160px",
                  overflowY: "auto",
                  caretColor: "#00d4a1",
                  height: "36px",
                  textAlign: isArabic(input) ? "right" : "left",
                  wordBreak: "break-word",
                  whiteSpace: "pre-wrap",
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
