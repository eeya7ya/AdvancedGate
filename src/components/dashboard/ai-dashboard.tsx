"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Send, Sparkles, Brain, Target, Clock, ArrowRight, ChevronRight, RotateCcw, Zap, Map } from "lucide-react";

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

interface LearningPlan {
  type: "LEARNING_PLAN";
  profile: { name: string; summary: string };
  todaysFocus: { topic: string; reason: string; duration: string; action: string };
  priorities: Priority[];
  timeAllocation: TimeSlice[];
  topicConnections: TopicLink[];
  nextSteps: string[];
}

type Phase = "welcome" | "chat" | "plan";

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

function TypingIndicator() {
  return (
    <div className="flex items-end gap-3">
      <AIAvatar />
      <div
        className="flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-bl-sm"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
      >
        <span className="typing-dot w-2 h-2 rounded-full" style={{ background: "var(--brand-teal)" }} />
        <span className="typing-dot w-2 h-2 rounded-full" style={{ background: "var(--brand-teal)" }} />
        <span className="typing-dot w-2 h-2 rounded-full" style={{ background: "var(--brand-teal)" }} />
      </div>
    </div>
  );
}

function ChatBubble({ msg, isStreaming }: { msg: Message; isStreaming?: boolean }) {
  const isAI = msg.role === "assistant";
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
        className="max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed"
        style={
          isAI
            ? {
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
                borderBottomLeftRadius: "4px",
              }
            : {
                background: "linear-gradient(135deg, #00d4a1, #22d3ee)",
                color: "#0f172a",
                borderBottomRightRadius: "4px",
              }
        }
      >
        {msg.content}
        {isStreaming && (
          <span
            className="inline-block w-0.5 h-4 ml-0.5 align-middle animate-pulse"
            style={{ background: "var(--brand-teal)" }}
          />
        )}
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
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span
                className="px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap flex-shrink-0"
                style={{ background: "rgba(0,212,161,0.12)", color: "#00d4a1" }}
              >
                {link.from}
              </span>
              <ChevronRight size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
              <p className="text-xs flex-1 min-w-0" style={{ color: "var(--text-secondary)" }}>
                {link.bridge}
              </p>
              <ChevronRight size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
              <span
                className="px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap flex-shrink-0"
                style={{ background: "rgba(34,211,238,0.12)", color: "#22d3ee" }}
              >
                {link.to}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ── Welcome Screen ─────────────────────────────────────────────── */
function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4"
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
          Real-time AI Advisor · Powered by Claude
        </div>
        <h1
          className="text-3xl lg:text-4xl font-bold mb-4 leading-tight max-w-lg mx-auto"
          style={{ color: "var(--text-primary)" }}
        >
          Achieve Any Dream With{" "}
          <span className="gradient-text-ai">Your AI Advisor</span>
        </h1>
        <p
          className="max-w-lg mx-auto text-base leading-relaxed mb-10"
          style={{ color: "var(--text-secondary)" }}
        >
          No matter what your goal is — career, business, creative, academic, or personal —
          your AI advisor will understand your unique situation and build a real-time roadmap
          with mind maps, charts, and actionable steps to help you get there.
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
          <span className="relative z-10">Start AI Session</span>
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
        {[
          { icon: "✦", text: "Any goal, any domain" },
          { icon: "✦", text: "Mind maps & charts" },
          { icon: "✦", text: "Real-time action plan" },
          { icon: "✦", text: "Saves your progress" },
        ].map((f) => (
          <div
            key={f.text}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)",
            }}
          >
            <span style={{ color: "var(--brand-teal)" }}>{f.icon}</span>
            {f.text}
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}

/* ── Plan View ──────────────────────────────────────────────────── */
function PlanView({ plan, onReset }: { plan: LearningPlan; onReset: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
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
            Your Personalized Action Plan
          </div>
          <p className="text-sm max-w-2xl leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {plan.profile.summary}
          </p>
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
            View Roadmap
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
            Restart
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
            Today&apos;s Focus
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
          Your Next Steps
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
      let rafId: number | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        streamBufferRef.current += decoder.decode(value, { stream: true });
        if (!rafId) {
          rafId = requestAnimationFrame(() => {
            setStreamedText(streamBufferRef.current);
            rafId = null;
          });
        }
      }
      // Flush any remaining buffered text
      if (rafId) cancelAnimationFrame(rafId);
      const full = streamBufferRef.current;
      setStreamedText(full);

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
        }).catch(() => null);
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
      const greeting = `Hello! I'm ready to get my personalized action plan.`;
      const initMessages: Message[] = [{ role: "user", content: greeting }];
      setMessages(initMessages);

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: initMessages }),
      });

      if (!res.ok || !res.body) throw new Error("API error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      streamBufferRef.current = "";
      let rafId: number | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        streamBufferRef.current += decoder.decode(value, { stream: true });
        if (!rafId) {
          rafId = requestAnimationFrame(() => {
            setStreamedText(streamBufferRef.current);
            rafId = null;
          });
        }
      }
      if (rafId) cancelAnimationFrame(rafId);
      const full = streamBufferRef.current;
      setStreamedText(full);

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
  }, []);

  const handleReset = useCallback(() => {
    setPhase("welcome");
    setMessages([]);
    setPlan(null);
    setInput("");
    setStreamedText("");
    setIsLoading(false);
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>
              AI Life Advisor
            </p>
            <h1 className="text-2xl lg:text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
              {phase === "chat" ? `Hey ${firstName}, let's map your path` : `${firstName}'s Action Plan`}
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
              Start over
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
              className="flex-1 overflow-y-auto rounded-2xl p-5 space-y-5 mb-4"
              style={{
                background: "var(--bg-card)",
                border: "2px solid rgba(0,212,161,0.15)",
                boxShadow: "inset 0 1px 0 rgba(0,212,161,0.06)",
              }}
            >
              {/* Progress */}
              {messages.length > 0 && (
                <div className="flex items-center gap-2 pb-2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((n) => {
                      const answered = Math.floor(messages.filter(m => m.role === "user").length / 1);
                      return (
                        <div
                          key={n}
                          className="w-6 h-1.5 rounded-full transition-all duration-500"
                          style={{
                            background: n <= answered
                              ? "linear-gradient(90deg, #00d4a1, #22d3ee)"
                              : "var(--bg-base)",
                          }}
                        />
                      );
                    })}
                  </div>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {Math.min(messages.filter(m => m.role === "user").length, 5)}/5 questions
                  </span>
                </div>
              )}

              {messages.map((msg, i) => {
                // Don't render the silent greeting sent at start
                if (msg.role === "user" && msg.content === "Hello! I'm ready to get my personalized action plan.") return null;
                return <ChatBubble key={i} msg={msg} />;
              })}

              {/* Streaming AI response */}
              {isLoading && streamedText && (
                <ChatBubble
                  msg={{
                    role: "assistant",
                    content: looksLikePlanAttempt(streamedText)
                      ? "Generating your action plan\u2026"
                      : streamedText,
                  }}
                  isStreaming
                />
              )}

              {/* Typing indicator */}
              {isLoading && !streamedText && <TypingIndicator />}

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
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your answer... (Enter to send)"
                rows={1}
                disabled={isLoading}
                className="flex-1 resize-none bg-transparent outline-none text-sm leading-relaxed py-1 disabled:opacity-40"
                style={{
                  color: "var(--text-primary)",
                  maxHeight: "120px",
                  overflowY: "auto",
                  caretColor: "#00d4a1",
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
    </div>
  );
}
