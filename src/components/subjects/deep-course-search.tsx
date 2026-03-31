"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Sparkles, Search, BookOpen, ChevronRight, Clock, Loader2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CourseSearchResult, CourseSearchResponse } from "@/app/api/ai/course-search/route";

const subjectColors: Record<string, string> = {
  "power-engineering": "#f5a623",
  networking: "#4f9eff",
  coding: "#a78bfa",
};

export default function DeepCourseSearch() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CourseSearchResult[] | null>(null);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setError("");
    setResults(null);
    setSummary("");

    try {
      const res = await fetch("/api/ai/course-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Search failed. Please try again.");
        return;
      }

      const data: CourseSearchResponse = await res.json();
      setResults(data.results);
      setSummary(data.summary);
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setQuery("");
    setResults(null);
    setSummary("");
    setError("");
    inputRef.current?.focus();
  }

  const hasResults = results !== null;

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <form onSubmit={handleSearch}>
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#475569] pointer-events-none"
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. I want to learn how solar panels work…"
              className="w-full bg-[#0d1424] border border-[rgba(255,255,255,0.07)] rounded-xl pl-10 pr-10 py-3 text-sm text-[#f1f5f9] placeholder-[#334155] outline-none focus:border-[rgba(167,139,250,0.4)] transition-colors"
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#475569] hover:text-[#94a3b8] transition-colors"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, #a78bfa 0%, #4f9eff 100%)",
              color: "#fff",
            }}
          >
            {loading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Sparkles size={15} />
            )}
            <span className="hidden sm:inline">Deep Search</span>
          </button>
        </div>
      </form>

      {/* Label */}
      <div className="flex items-center gap-1.5 text-[10px] text-[#334155]">
        <Sparkles size={10} style={{ color: "#a78bfa" }} />
        <span>Powered by Claude Sonnet — understands your intent, not just keywords</span>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Results */}
      {hasResults && !error && (
        <div className="space-y-3">
          {/* Summary */}
          {summary && (
            <p className="text-sm text-[#64748b] leading-relaxed">{summary}</p>
          )}

          {results!.length === 0 ? (
            <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0d1424] px-4 py-6 text-center text-sm text-[#475569]">
              No matching courses found. Try rephrasing your query.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {results!.map((course) => {
                const color = subjectColors[course.subjectId] ?? "#4f9eff";
                const available = !course.comingSoon;
                return (
                  <div
                    key={course.courseId}
                    className={`relative flex flex-col gap-3 p-4 rounded-2xl border transition-all ${
                      available
                        ? "bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.07)] hover:border-[rgba(167,139,250,0.3)] group cursor-pointer"
                        : "bg-[rgba(255,255,255,0.01)] border-[rgba(255,255,255,0.04)] opacity-60"
                    }`}
                  >
                    {available && (
                      <Link
                        href={`/learn/${course.courseId}`}
                        className="absolute inset-0 z-10"
                        aria-label={course.title}
                      />
                    )}

                    {/* Icon */}
                    <div className="flex items-center justify-between">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: `${color}12`, color }}
                      >
                        <BookOpen size={16} />
                      </div>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md" style={{ background: `${color}12`, color }}>
                        {course.subject.split(" ")[0]}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <h3
                        className={`font-semibold text-sm leading-snug mb-1 ${
                          available
                            ? "text-[#f1f5f9] group-hover:text-[#a78bfa] transition-colors"
                            : "text-[#334155]"
                        }`}
                      >
                        {course.title}
                      </h3>
                      <p className="text-[#475569] text-xs leading-relaxed line-clamp-2">
                        {course.matchReason}
                      </p>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            course.level === "Beginner"
                              ? "green"
                              : course.level === "Intermediate"
                              ? "blue"
                              : "purple"
                          }
                        >
                          {course.level}
                        </Badge>
                        <span className="text-[#1e293b] text-[10px]">{course.duration}</span>
                      </div>
                      {available ? (
                        <ChevronRight
                          size={14}
                          className="text-[#475569] group-hover:text-[#a78bfa] transition-colors flex-shrink-0"
                        />
                      ) : (
                        <div className="inline-flex items-center gap-1 text-[#1e293b] text-[10px]">
                          <Clock size={9} />
                          Soon
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
