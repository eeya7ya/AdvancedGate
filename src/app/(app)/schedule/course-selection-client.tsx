"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/language";
import {
  BookOpen, ExternalLink, Plus, Trash2, Zap, Clock,
  CheckCircle, Circle, Link2, Sparkles, ChevronRight,
  AlertCircle,
} from "lucide-react";

/* ── Types ──────────────────────────────────────────────────── */
interface CourseRec {
  title: string;
  platform: string;
  instructor?: string;
  estimatedHours: number;
  level: string;
  focus: string;
  phase: string;
  url?: string;
  selected?: boolean;
}

interface CustomCourse {
  id: string;
  title: string;
  url: string;
  estimatedHours: number;
  platform: string;
  phase: string;
  focus: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Plan = any;

interface CourseSelectionClientProps {
  plan: Plan;
}

/* ── Helpers ─────────────────────────────────────────────────── */
const PHASE_COLORS = ["#f97316", "#a78bfa", "#f59e0b", "#f87171", "#34d399", "#60a5fa"];

function phaseColor(phase: string, idx: number): string {
  void phase;
  return PHASE_COLORS[idx % PHASE_COLORS.length];
}

/* ── Main Component ─────────────────────────────────────────── */
export function CourseSelectionClient({ plan }: CourseSelectionClientProps) {
  const { lang } = useLang();
  const isRTL = lang === "ar";
  const router = useRouter();

  const courses: CourseRec[] = plan.courseRecommendations ?? [];

  /* Default study hours from plan's timeAllocation sum */
  const defaultHours = useMemo(() => {
    const sum = (plan.timeAllocation ?? []).reduce(
      (acc: number, t: { hours: number }) => acc + (t.hours ?? 0),
      0,
    );
    return Math.round(sum) || 6;
  }, [plan]);

  /* Selected course titles */
  const [selected, setSelected] = useState<Set<string>>(() => {
    // Pre-select courses that were previously marked selected, or all if none
    const preSelected = courses.filter((c) => c.selected ?? false);
    return new Set((preSelected.length > 0 ? preSelected : courses).map((c) => c.title));
  });

  /* Editable URLs per course title */
  const [urlOverrides, setUrlOverrides] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const c of courses) {
      if (c.url) map[c.title] = c.url;
    }
    return map;
  });

  /* Custom courses added by user */
  const [customCourses, setCustomCourses] = useState<CustomCourse[]>([]);
  const [customForm, setCustomForm] = useState({ title: "", url: "", hours: "" });

  /* Study hours per week */
  const [studyHours, setStudyHours] = useState(defaultHours);

  /* Generation state */
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  /* Group recommended courses by phase */
  const phases = useMemo(() => {
    const order: string[] = [];
    const map: Record<string, CourseRec[]> = {};
    for (const c of courses) {
      const key = c.phase || "General";
      if (!map[key]) { map[key] = []; order.push(key); }
      map[key].push(c);
    }
    return order.map((k, i) => ({ phase: k, color: phaseColor(k, i), courses: map[k] }));
  }, [courses]);

  const selectedCount = selected.size + customCourses.length;

  function toggleCourse(title: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }

  function addCustomCourse() {
    if (!customForm.title.trim()) return;
    const newCourse: CustomCourse = {
      id: Date.now().toString(),
      title: customForm.title.trim(),
      url: customForm.url.trim(),
      estimatedHours: parseFloat(customForm.hours) || 10,
      platform: isRTL ? "رابط مخصص" : "Custom",
      phase: phases[0]?.phase ?? "Month 1",
      focus: isRTL ? "مادة مضافة يدويًا" : "Manually added course",
    };
    setCustomCourses((prev) => [...prev, newCourse]);
    setCustomForm({ title: "", url: "", hours: "" });
  }

  function removeCustomCourse(id: string) {
    setCustomCourses((prev) => prev.filter((c) => c.id !== id));
  }

  async function handleGenerate() {
    if (selectedCount === 0) {
      setError(isRTL ? "اختر دورة واحدة على الأقل" : "Select at least one course");
      return;
    }
    setError("");
    setGenerating(true);

    const selectedRecommended = courses
      .filter((c) => selected.has(c.title))
      .map((c) => ({
        title: c.title,
        platform: c.platform,
        estimatedHours: c.estimatedHours,
        phase: c.phase,
        focus: c.focus,
        url: urlOverrides[c.title] ?? c.url ?? "",
        level: c.level,
        instructor: c.instructor ?? "",
      }));

    const allCourses = [
      ...selectedRecommended,
      ...customCourses.map((c) => ({
        title: c.title,
        platform: c.platform,
        estimatedHours: c.estimatedHours,
        phase: c.phase,
        focus: c.focus,
        url: c.url,
        level: "Beginner",
        instructor: "",
      })),
    ];

    try {
      const res = await fetch("/api/ai/generate-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courses: allCourses, studyHoursPerWeek: studyHours }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to generate schedule");
      }
      // Refresh the server component to load the new plan with scheduleGenerated: true
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setGenerating(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6" dir={isRTL ? "rtl" : "ltr"}>

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-3"
          style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.25)", color: "#f97316" }}
        >
          <BookOpen size={11} />
          {isRTL ? "اختيار الدورات" : "Course Selection"}
        </div>
        <h1 className="text-2xl lg:text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
          {isRTL ? "ابنِ جدول دراستك" : "Build Your Learning Schedule"}
        </h1>
        <p className="text-sm mt-1.5" style={{ color: "var(--text-muted)" }}>
          {isRTL
            ? "اختر الدورات التي ستدرسها وسنبني لك جدولًا أسبوعيًا مخصصًا بمساعدة الذكاء الاصطناعي"
            : "Select the courses you'll study and we'll build your personalized weekly schedule using AI"}
        </p>
      </motion.div>

      {/* ── Recommended Courses ── */}
      {phases.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl p-5"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={14} style={{ color: "#a78bfa" }} />
            <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              {isRTL ? "الدورات المقترحة من خطتك" : "Suggested Courses from Your Plan"}
            </h2>
            <span
              className="ms-auto text-[10px] px-2 py-0.5 rounded-md font-semibold"
              style={{ background: "rgba(167,139,250,0.12)", color: "#a78bfa" }}
            >
              {selected.size} / {courses.length} {isRTL ? "محدد" : "selected"}
            </span>
          </div>

          <div className="space-y-5">
            {phases.map(({ phase, color, courses: phaseCourses }) => (
              <div key={phase}>
                {/* Phase label */}
                <div className="flex items-center gap-2 mb-2.5">
                  <span
                    className="text-[10px] font-bold px-2.5 py-0.5 rounded-lg"
                    style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}
                  >
                    {phase}
                  </span>
                  <div className="flex-1 h-px" style={{ background: "var(--border-subtle)" }} />
                </div>

                {/* Courses in this phase */}
                <div className="space-y-2">
                  {phaseCourses.map((course) => {
                    const isSelected = selected.has(course.title);
                    return (
                      <motion.div
                        key={course.title}
                        layout
                        className="rounded-xl overflow-hidden"
                        style={{
                          border: `1px solid ${isSelected ? color + "50" : "var(--border-subtle)"}`,
                          background: isSelected ? `${color}08` : "var(--bg-base)",
                        }}
                      >
                        {/* Course row */}
                        <div className="flex items-center gap-3 p-3">
                          <button
                            onClick={() => toggleCourse(course.title)}
                            className="flex-shrink-0 transition-transform hover:scale-110"
                          >
                            {isSelected
                              ? <CheckCircle size={18} style={{ color }} />
                              : <Circle size={18} style={{ color: "var(--text-muted)" }} />}
                          </button>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                              {course.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                                {course.platform}
                              </span>
                              <span className="w-1 h-1 rounded-full" style={{ background: "var(--text-muted)" }} />
                              <span className="flex items-center gap-0.5 text-[10px]" style={{ color: "#fb923c" }}>
                                <Clock size={9} />
                                {course.estimatedHours}h
                              </span>
                              <span className="w-1 h-1 rounded-full" style={{ background: "var(--text-muted)" }} />
                              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{course.level}</span>
                            </div>
                          </div>

                          {/* Open link button */}
                          {(urlOverrides[course.title] || course.url) && (
                            <a
                              href={urlOverrides[course.title] ?? course.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex-shrink-0 flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-all hover:opacity-75"
                              style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}
                            >
                              <ExternalLink size={9} />
                              {isRTL ? "افتح" : "Open"}
                            </a>
                          )}
                        </div>

                        {/* URL field — visible when selected */}
                        <AnimatePresence>
                          {isSelected && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div
                                className="px-3 pb-3 pt-0"
                                style={{ borderTop: `1px solid ${color}20` }}
                              >
                                <div className="flex items-center gap-2 mt-2">
                                  <Link2 size={11} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                                  <input
                                    type="url"
                                    value={urlOverrides[course.title] ?? course.url ?? ""}
                                    onChange={(e) =>
                                      setUrlOverrides((prev) => ({ ...prev, [course.title]: e.target.value }))
                                    }
                                    placeholder={isRTL ? "الصق رابط الدورة هنا..." : "Paste course URL here..."}
                                    className="flex-1 text-xs px-2.5 py-1.5 rounded-lg bg-transparent outline-none"
                                    style={{
                                      border: "1px solid var(--border-subtle)",
                                      color: "var(--text-primary)",
                                    }}
                                    dir="ltr"
                                  />
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Add Custom Course ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl p-5"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Plus size={14} style={{ color: "#f59e0b" }} />
          <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            {isRTL ? "أضف دورة بنفسك" : "Add Your Own Course"}
          </h2>
        </div>

        {/* Custom course form */}
        <div className="flex flex-wrap gap-2 mb-3">
          <input
            type="text"
            value={customForm.title}
            onChange={(e) => setCustomForm((f) => ({ ...f, title: e.target.value }))}
            placeholder={isRTL ? "اسم الدورة *" : "Course name *"}
            className="flex-1 min-w-[160px] text-sm px-3 py-2 rounded-xl bg-transparent outline-none"
            style={{ border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
          />
          <input
            type="url"
            value={customForm.url}
            onChange={(e) => setCustomForm((f) => ({ ...f, url: e.target.value }))}
            placeholder={isRTL ? "رابط الدورة" : "Course URL"}
            className="flex-1 min-w-[160px] text-sm px-3 py-2 rounded-xl bg-transparent outline-none"
            style={{ border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
            dir="ltr"
          />
          <input
            type="number"
            value={customForm.hours}
            onChange={(e) => setCustomForm((f) => ({ ...f, hours: e.target.value }))}
            placeholder={isRTL ? "الساعات" : "Hours"}
            min="1"
            max="500"
            className="w-24 text-sm px-3 py-2 rounded-xl bg-transparent outline-none"
            style={{ border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
          />
          <button
            onClick={addCustomCourse}
            disabled={!customForm.title.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-40"
            style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}
          >
            <Plus size={13} />
            {isRTL ? "إضافة" : "Add"}
          </button>
        </div>

        {/* Custom course list */}
        <AnimatePresence>
          {customCourses.map((c) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-2 overflow-hidden"
              style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}
            >
              <CheckCircle size={15} style={{ color: "#f59e0b", flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{c.title}</p>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  {c.estimatedHours}h
                  {c.url && (
                    <>
                      {" · "}
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                        style={{ color: "#f59e0b" }}
                      >
                        {c.url.length > 40 ? c.url.slice(0, 40) + "…" : c.url}
                      </a>
                    </>
                  )}
                </p>
              </div>
              <button
                onClick={() => removeCustomCourse(c.id)}
                className="flex-shrink-0 p-1 rounded-lg transition-all hover:opacity-70"
                style={{ color: "var(--text-muted)" }}
              >
                <Trash2 size={13} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {customCourses.length === 0 && (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {isRTL
              ? "أضف أي دورة بإدخال اسمها ورابطها وعدد ساعاتها"
              : "Add any course by entering its name, link, and estimated hours"}
          </p>
        )}
      </motion.div>

      {/* ── Study Hours ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-2xl p-5"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Clock size={14} style={{ color: "#fb923c" }} />
          <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            {isRTL ? "ساعات الدراسة الأسبوعية" : "Weekly Study Hours"}
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={1}
            max={40}
            value={studyHours}
            onChange={(e) => setStudyHours(Number(e.target.value))}
            className="flex-1 accent-orange-500"
            style={{ accentColor: "#f97316" }}
          />
          <div
            className="w-16 text-center text-lg font-black rounded-xl py-2"
            style={{ background: "rgba(249,115,22,0.12)", color: "#f97316" }}
          >
            {studyHours}h
          </div>
        </div>
        <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
          {isRTL
            ? `الوقت الموصى به بناءً على خطتك هو ${defaultHours} ساعة/أسبوع`
            : `Your plan recommends ${defaultHours}h/week based on your goals`}
        </p>
      </motion.div>

      {/* ── Error ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 px-4 py-3 rounded-xl"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}
          >
            <AlertCircle size={14} style={{ color: "#ef4444", flexShrink: 0 }} />
            <p className="text-sm" style={{ color: "#ef4444" }}>{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Generate Button ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <button
          onClick={handleGenerate}
          disabled={generating || selectedCount === 0}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-base font-bold transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: generating
              ? "rgba(249,115,22,0.2)"
              : "linear-gradient(135deg, #f97316, #fb923c)",
            color: generating ? "#f97316" : "#0f0600",
            boxShadow: generating ? "none" : "0 0 32px rgba(249,115,22,0.35)",
          }}
        >
          {generating ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Zap size={18} />
              </motion.div>
              {isRTL ? "جارٍ توليد جدولك..." : "Generating your schedule..."}
            </>
          ) : (
            <>
              <Sparkles size={18} />
              {isRTL ? "ولّد جدولي الأسبوعي" : "Generate My Schedule"}
              <ChevronRight size={16} />
            </>
          )}
        </button>

        {selectedCount > 0 && !generating && (
          <p className="text-xs text-center mt-2" style={{ color: "var(--text-muted)" }}>
            {isRTL
              ? `سيتم توليد جدول أسبوعي مخصص لـ ${selectedCount} دورة بناءً على ${studyHours} ساعة/أسبوع`
              : `Generating a personalized weekly plan for ${selectedCount} course${selectedCount > 1 ? "s" : ""} at ${studyHours}h/week`}
          </p>
        )}
      </motion.div>
    </div>
  );
}
