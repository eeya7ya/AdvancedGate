"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Brain, MessageSquare, Plus, Trash2, Edit3, Save,
  X, StickyNote, BookOpen, Target, Clock,
} from "lucide-react";
import { useLang } from "@/lib/language";

/* ── Types ─────────────────────────────────────────────────── */
interface Message {
  role: "user" | "assistant";
  content: string;
}

interface UserNote {
  id: number;
  note: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

interface AIChatClientProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plan: any;
  notes: UserNote[];
  userName: string;
}

/* ── Helpers ────────────────────────────────────────────────── */
const ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
function isArabic(text: string): boolean { return ARABIC_REGEX.test(text); }
function getTextDir(text: string): "rtl" | "ltr" { return isArabic(text) ? "rtl" : "ltr"; }

/* ── Translations ──────────────────────────────────────────── */
const T: Record<string, { en: string; ar: string }> = {
  title:       { en: "AI Chat", ar: "المحادثة الذكية" },
  subtitle:    { en: "Ask about your courses, schedule, or career path", ar: "اسأل عن دوراتك، جدولك، أو مسارك المهني" },
  placeholder: { en: "Ask about your learning path... (Enter to send)", ar: "اسأل عن مسار تعلمك... (Enter للإرسال)" },
  notes:       { en: "My Notes", ar: "ملاحظاتي" },
  addNote:     { en: "Add Note", ar: "إضافة ملاحظة" },
  context:     { en: "Plan Context", ar: "سياق الخطة" },
  noplan:      { en: "No plan yet. Start an AI Advisor session first.", ar: "لا توجد خطة بعد. ابدأ جلسة المستشار الذكي أولاً." },
  courses:     { en: "Your Courses", ar: "دوراتك" },
  priorities:  { en: "Your Priorities", ar: "أولوياتك" },
  noteHint:    { en: "Notes help your AI remember preferences and context", ar: "الملاحظات تساعد ذكاءك الاصطناعي على تذكر تفضيلاتك" },
  save:        { en: "Save", ar: "حفظ" },
  cancel:      { en: "Cancel", ar: "إلغاء" },
  delete:      { en: "Delete", ar: "حذف" },
  welcome:     { en: "Hi! I'm your focused AI assistant. I know your learning plan and notes. Ask me anything about your courses, schedule, or career path.", ar: "مرحباً! أنا مساعدك الذكي المتخصص. أعرف خطة تعلمك وملاحظاتك. اسألني عن أي شيء يتعلق بدوراتك أو جدولك أو مسارك المهني." },
};
function t(key: string, ar: boolean): string {
  return ar ? (T[key]?.ar ?? key) : (T[key]?.en ?? key);
}

/* ── Notes Panel ───────────────────────────────────────────── */
function NotesPanel({
  notes,
  onAdd,
  onUpdate,
  onDelete,
  isRTL,
}: {
  notes: UserNote[];
  onAdd: (note: string, category: string) => void;
  onUpdate: (id: number, note: string) => void;
  onDelete: (id: number) => void;
  isRTL: boolean;
}) {
  const [newNote, setNewNote] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  const categories = [
    { value: "general", en: "General", ar: "عام" },
    { value: "course", en: "Course", ar: "دورة" },
    { value: "schedule", en: "Schedule", ar: "جدول" },
    { value: "preference", en: "Preference", ar: "تفضيل" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <StickyNote size={14} style={{ color: "#f59e0b" }} />
        <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
          {t("notes", isRTL)}
        </h3>
      </div>
      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
        {t("noteHint", isRTL)}
      </p>

      {/* Add note form */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="text-[11px] px-2 py-1.5 rounded-lg bg-transparent outline-none"
            style={{ border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
          >
            {categories.map((c) => (
              <option key={c.value} value={c.value}>{isRTL ? c.ar : c.en}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <input
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder={isRTL ? "ملاحظة جديدة..." : "New note..."}
            dir={getTextDir(newNote)}
            className="flex-1 text-xs px-3 py-2 rounded-lg bg-transparent outline-none"
            style={{ border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newNote.trim()) {
                onAdd(newNote.trim(), newCategory);
                setNewNote("");
              }
            }}
          />
          <button
            onClick={() => {
              if (newNote.trim()) {
                onAdd(newNote.trim(), newCategory);
                setNewNote("");
              }
            }}
            disabled={!newNote.trim()}
            className="px-3 py-2 rounded-lg text-[11px] font-semibold transition-all disabled:opacity-40"
            style={{ background: "rgba(0,212,161,0.15)", color: "#00d4a1", border: "1px solid rgba(0,212,161,0.2)" }}
          >
            <Plus size={12} />
          </button>
        </div>
      </div>

      {/* Notes list */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {notes.map((note) => (
          <div
            key={note.id}
            className="flex items-start gap-2 p-2.5 rounded-xl"
            style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)" }}
          >
            {editingId === note.id ? (
              <div className="flex-1 flex gap-2">
                <input
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  dir={getTextDir(editText)}
                  className="flex-1 text-xs px-2 py-1 rounded-lg bg-transparent outline-none"
                  style={{ border: "1px solid rgba(0,212,161,0.3)", color: "var(--text-primary)" }}
                  autoFocus
                />
                <button
                  onClick={() => { onUpdate(note.id, editText); setEditingId(null); }}
                  className="p-1 rounded-lg hover:opacity-80" style={{ color: "#00d4a1" }}
                >
                  <Save size={12} />
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="p-1 rounded-lg hover:opacity-80" style={{ color: "var(--text-muted)" }}
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 min-w-0">
                  <span
                    className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                    style={{ background: "rgba(167,139,250,0.12)", color: "#a78bfa" }}
                  >
                    {note.category}
                  </span>
                  <p className="text-xs mt-1 leading-relaxed" dir={getTextDir(note.note)} style={{ color: "var(--text-secondary)" }}>
                    {note.note}
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => { setEditingId(note.id); setEditText(note.note); }}
                    className="p-1 rounded hover:opacity-80" style={{ color: "var(--text-muted)" }}
                  >
                    <Edit3 size={11} />
                  </button>
                  <button
                    onClick={() => onDelete(note.id)}
                    className="p-1 rounded hover:opacity-80" style={{ color: "#ef4444" }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        {notes.length === 0 && (
          <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>
            {isRTL ? "لا توجد ملاحظات بعد" : "No notes yet"}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Plan Context Sidebar ──────────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PlanContext({ plan, isRTL }: { plan: any; isRTL: boolean }) {
  if (!plan) {
    return (
      <div className="text-center py-6">
        <Brain size={24} style={{ color: "var(--text-muted)", margin: "0 auto 8px" }} />
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{t("noplan", isRTL)}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Target size={14} style={{ color: "#00d4a1" }} />
        <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
          {t("context", isRTL)}
        </h3>
      </div>

      {/* Today's Focus */}
      {plan.todaysFocus && (
        <div className="p-3 rounded-xl" style={{ background: "rgba(0,212,161,0.06)", border: "1px solid rgba(0,212,161,0.15)" }}>
          <p className="text-[10px] font-bold uppercase mb-1" style={{ color: "#00d4a1" }}>
            {isRTL ? "تركيز اليوم" : "Today's Focus"}
          </p>
          <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{plan.todaysFocus.topic}</p>
          <div className="flex items-center gap-1 mt-1">
            <Clock size={10} style={{ color: "#00d4a1" }} />
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{plan.todaysFocus.duration}</span>
          </div>
        </div>
      )}

      {/* Priorities */}
      {plan.priorities && (
        <div>
          <p className="text-[10px] font-bold uppercase mb-2 flex items-center gap-1.5" style={{ color: "#a78bfa" }}>
            <Target size={10} />
            {t("priorities", isRTL)}
          </p>
          <div className="space-y-1.5">
            {plan.priorities.slice(0, 3).map((p: { topic: string; score: number; color: string }, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
                <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{p.topic}</span>
                <span className="text-[10px] font-bold ms-auto" style={{ color: p.color }}>{p.score}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Courses */}
      {plan.courseRecommendations && (
        <div>
          <p className="text-[10px] font-bold uppercase mb-2 flex items-center gap-1.5" style={{ color: "#22d3ee" }}>
            <BookOpen size={10} />
            {t("courses", isRTL)}
          </p>
          <div className="space-y-1.5">
            {plan.courseRecommendations.slice(0, 4).map((c: { title: string; platform: string; phase: string }, i: number) => (
              <div key={i} className="p-2 rounded-lg" style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)" }}>
                <p className="text-[11px] font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>{c.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(167,139,250,0.1)", color: "#a78bfa" }}>{c.platform}</span>
                  <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>{c.phase}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────── */
export function AIChatClient({ plan, notes: initialNotes, userName }: AIChatClientProps) {
  const { lang } = useLang();
  const isRTL = lang === "ar";
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const [notes, setNotes] = useState<UserNote[]>(initialNotes);
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamBufferRef = useRef("");

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamedText]);

  // Welcome message on mount
  useEffect(() => {
    setMessages([{ role: "assistant", content: t("welcome", isRTL) }]);
  }, [isRTL]);

  const sendMessage = useCallback(async (userText: string) => {
    if (!userText.trim() || isLoading) return;

    const newMessages: Message[] = [...messages, { role: "user", content: userText.trim() }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    setStreamedText("");

    try {
      const res = await fetch("/api/ai/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.filter((m) => m.content !== t("welcome", isRTL)),
        }),
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

      setMessages([...newMessages, { role: "assistant", content: streamBufferRef.current }]);
    } catch {
      setMessages([...newMessages, { role: "assistant", content: isRTL ? "عذراً، حدث خطأ. حاول مرة أخرى." : "Sorry, something went wrong. Please try again." }]);
    } finally {
      setIsLoading(false);
      setStreamedText("");
    }
  }, [messages, isLoading, isRTL]);

  // Notes CRUD
  const handleAddNote = async (note: string, category: string) => {
    const res = await fetch("/api/user/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note, category }),
    });
    const data = await res.json();
    if (data.id) {
      setNotes((prev) => [{ id: data.id, note, category, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...prev]);
    }
  };

  const handleUpdateNote = async (id: number, note: string) => {
    await fetch("/api/user/notes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, note }),
    });
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, note, updatedAt: new Date().toISOString() } : n)));
  };

  const handleDeleteNote = async (id: number) => {
    await fetch("/api/user/notes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  function formatMessage(content: string, streaming?: boolean) {
    const lines = content.split("\n");
    const elements: React.ReactNode[] = [];
    let key = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        elements.push(<div key={key++} className="h-2" />);
        continue;
      }
      // Bold handling
      const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
      elements.push(
        <p key={key++} className="leading-relaxed text-sm" style={{ wordBreak: "break-word" }}>
          {parts.map((part, i) =>
            part.startsWith("**") && part.endsWith("**")
              ? <strong key={i} style={{ color: "var(--text-primary)", fontWeight: 700 }}>{part.slice(2, -2)}</strong>
              : part
          )}
        </p>
      );
    }

    if (streaming) {
      elements.push(
        <span key="cursor" className="inline-block w-0.5 h-4 ml-0.5 align-middle animate-pulse" style={{ background: "#00d4a1" }} />
      );
    }
    return elements;
  }

  return (
    <div className="max-w-7xl mx-auto" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-4"
      >
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-1"
            style={{ background: "rgba(0,212,161,0.1)", border: "1px solid rgba(0,212,161,0.2)", color: "#00d4a1" }}>
            <MessageSquare size={11} />
            {t("title", isRTL)}
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            {isRTL ? `محادثة ${userName} الذكية` : `${userName}'s AI Chat`}
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{t("subtitle", isRTL)}</p>
        </div>
        <button
          onClick={() => setShowSidebar((s) => !s)}
          className="lg:hidden px-3 py-2 rounded-xl text-xs font-semibold"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
        >
          {showSidebar ? <X size={14} /> : <StickyNote size={14} />}
        </button>
      </motion.div>

      <div className="flex gap-4" style={{ height: "calc(100vh - 240px)", minHeight: "500px" }}>
        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto rounded-2xl p-5 space-y-4 mb-3"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
          >
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-end gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                {msg.role === "assistant" ? (
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #00d4a1, #22d3ee)" }}>
                    <Brain size={13} className="text-white" />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                    style={{ background: "linear-gradient(135deg, #4f9eff, #7c3aed)" }}>
                    {userName[0]?.toUpperCase() ?? "U"}
                  </div>
                )}
                <div
                  dir={getTextDir(msg.content)}
                  className={`px-4 py-3 rounded-2xl ${msg.role === "assistant" ? "max-w-[85%]" : "max-w-[75%]"}`}
                  style={msg.role === "assistant"
                    ? { background: "var(--bg-base)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", borderBottomLeftRadius: "6px" }
                    : { background: "linear-gradient(135deg, #00d4a1, #22d3ee)", color: "#0a1628", borderBottomRightRadius: "6px", fontWeight: 500 }
                  }
                >
                  {msg.role === "assistant" ? formatMessage(msg.content) : <p className="text-sm leading-relaxed">{msg.content}</p>}
                </div>
              </motion.div>
            ))}

            {/* Streaming */}
            {isLoading && streamedText && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-end gap-3">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #00d4a1, #22d3ee)" }}>
                  <Brain size={13} className="text-white" />
                </div>
                <div className="px-4 py-3 rounded-2xl max-w-[85%]"
                  dir={getTextDir(streamedText)}
                  style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", borderBottomLeftRadius: "6px" }}>
                  {formatMessage(streamedText, true)}
                </div>
              </motion.div>
            )}

            {/* Typing indicator */}
            {isLoading && !streamedText && (
              <div className="flex items-end gap-3">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 animate-pulse"
                  style={{ background: "linear-gradient(135deg, #00d4a1, #22d3ee)" }}>
                  <Brain size={13} className="text-white" />
                </div>
                <div className="px-4 py-3 rounded-2xl" style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)" }}>
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: "#00d4a1", animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            className="flex items-end gap-3 p-3 rounded-2xl"
            style={{ background: "var(--bg-card)", border: "2px solid rgba(0,212,161,0.25)" }}
          >
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
              placeholder={t("placeholder", isRTL)}
              rows={1}
              disabled={isLoading}
              dir={getTextDir(input)}
              className="flex-1 resize-none bg-transparent outline-none text-sm leading-relaxed py-1 disabled:opacity-40"
              style={{ color: "var(--text-primary)", maxHeight: "120px", caretColor: "#00d4a1", textAlign: isArabic(input) ? "right" : "left" }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 hover:scale-105 active:scale-95"
              style={{
                background: input.trim() && !isLoading ? "linear-gradient(135deg, #00d4a1, #22d3ee)" : "var(--bg-base)",
                boxShadow: input.trim() && !isLoading ? "0 0 16px rgba(0,212,161,0.4)" : "none",
                border: "1px solid rgba(0,212,161,0.2)",
              }}
            >
              <Send size={15} className="text-white" />
            </button>
          </div>
        </div>

        {/* Sidebar - Context & Notes */}
        <AnimatePresence>
          {showSidebar && (
            <motion.div
              initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRTL ? -20 : 20 }}
              className="w-72 flex-shrink-0 overflow-y-auto rounded-2xl p-4 space-y-5 hidden lg:block"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
            >
              <PlanContext plan={plan} isRTL={isRTL} />
              <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "12px" }}>
                <NotesPanel
                  notes={notes}
                  onAdd={handleAddNote}
                  onUpdate={handleUpdateNote}
                  onDelete={handleDeleteNote}
                  isRTL={isRTL}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
