import { auth } from "~/auth";
import { getUserStats, getEnrolledCourses } from "@/lib/db";
import { subjects, getCourseById } from "@/lib/data";
import { getLevelColor, getLevelTitle } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Zap,
  BookOpen,
  Trophy,
  TrendingUp,
  ChevronRight,
  Network,
  Code2,
  ArrowRight,
  GraduationCap,
  Clock,
} from "lucide-react";

const subjectIcons: Record<string, React.ReactNode> = {
  "power-engineering": <Zap size={22} />,
  networking: <Network size={22} />,
  coding: <Code2 size={22} />,
};

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const firstName = session?.user?.name?.split(" ")[0] ?? "Engineer";

  const [stats, enrolled] = await Promise.all([
    userId ? getUserStats(userId) : null,
    userId ? getEnrolledCourses(userId) : [],
  ]);

  const isNewUser = !stats || (stats.totalCourses === 0 && stats.xp === 0);
  const levelColor = stats ? getLevelColor(stats.level) : "#94a3b8";
  const levelTitle = stats ? getLevelTitle(stats.level) : "Apprentice";

  return (
    <div className="max-w-6xl mx-auto space-y-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-2">
        <div>
          <p className="text-[#475569] text-xs font-semibold uppercase tracking-widest mb-1">
            Welcome back
          </p>
          <h1 className="text-3xl lg:text-4xl font-bold text-[#f1f5f9] tracking-tight">
            {firstName}&apos;s Dashboard
          </h1>
        </div>
        <Link
          href="/subjects"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4f9eff] hover:bg-[#2d7dd2] text-white text-sm font-semibold transition-all hover:shadow-[0_0_24px_rgba(79,158,255,0.4)]"
        >
          Browse Courses
          <ArrowRight size={15} />
        </Link>
      </div>

      {isNewUser ? (
        /* NEW USER EMPTY STATE */
        <div className="space-y-8">
          {/* Welcome card */}
          <div className="relative overflow-hidden rounded-3xl border border-[rgba(79,158,255,0.12)] bg-[#0d1424] p-8 lg:p-10">
            <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
            <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#4f9eff]/5 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-[#a78bfa]/5 blur-3xl pointer-events-none" />
            <div className="relative z-10 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgba(79,158,255,0.08)] border border-[rgba(79,158,255,0.15)] text-[#4f9eff] text-xs font-semibold uppercase tracking-wider mb-6">
                <GraduationCap size={13} />
                Getting Started
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold text-[#f1f5f9] mb-3 leading-snug">
                Your learning journey starts here.
              </h2>
              <p className="text-[#64748b] leading-relaxed mb-8 text-sm">
                Enroll in your first course to begin tracking progress, earning XP, and unlocking achievements. All disciplines are structured — no prerequisites, start from anywhere.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/subjects"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#4f9eff] hover:bg-[#2d7dd2] text-white text-sm font-semibold transition-all hover:shadow-[0_0_24px_rgba(79,158,255,0.4)]"
                >
                  Explore Disciplines
                  <ArrowRight size={15} />
                </Link>
                <Link
                  href="/profile"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.07)] border border-[rgba(255,255,255,0.07)] text-[#94a3b8] text-sm font-semibold transition-all"
                >
                  Complete Your Profile
                </Link>
              </div>
            </div>
          </div>

          {/* Discipline cards */}
          <div>
            <h2 className="text-xs font-semibold text-[#475569] uppercase tracking-widest mb-4">
              Available Disciplines
            </h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {subjects.map((subject) => {
                const openCourses = subject.courses.filter((c) => !c.comingSoon);
                const isLive = openCourses.length > 0;
                return (
                  <Link
                    key={subject.id}
                    href={isLive ? `/subjects/${subject.id}` : "#"}
                    className={`group relative overflow-hidden rounded-2xl border p-6 transition-all ${
                      isLive
                        ? "bg-[#0d1424] border-[rgba(255,255,255,0.07)] hover:border-[rgba(79,158,255,0.25)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)] cursor-pointer"
                        : "bg-[#080c14] border-[rgba(255,255,255,0.04)] cursor-default opacity-50"
                    }`}
                  >
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                      style={{ background: `radial-gradient(ellipse at top left, ${subject.color}06 0%, transparent 70%)` }}
                    />
                    <div className="relative z-10">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                        style={{ background: `${subject.color}12`, color: subject.color }}
                      >
                        {subjectIcons[subject.id]}
                      </div>
                      <h3 className="text-[#f1f5f9] font-semibold text-sm mb-1.5">
                        {subject.title}
                      </h3>
                      <p className="text-[#475569] text-xs leading-relaxed mb-4 line-clamp-2">
                        {subject.description}
                      </p>
                      {isLive ? (
                        <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: subject.color }}>
                          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: subject.color }} />
                          {openCourses.length} course{openCourses.length !== 1 ? "s" : ""} available
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-[#475569] text-xs font-medium">
                          <Clock size={11} />
                          Coming Soon
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* RETURNING USER VIEW */
        <div className="space-y-8">

          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Level", value: stats!.level, sub: levelTitle, icon: <TrendingUp size={18} />, color: levelColor },
              { label: "Total XP", value: stats!.xp.toLocaleString(), sub: `${(stats!.xpToNextLevel - stats!.xp).toLocaleString()} to next`, icon: <Zap size={18} />, color: "#f5a623" },
              { label: "Enrolled", value: stats!.totalCourses, sub: "courses", icon: <BookOpen size={18} />, color: "#4f9eff" },
              { label: "Completed", value: stats!.completedCourses, sub: "courses", icon: <Trophy size={18} />, color: "#4ade80" },
            ].map((s) => (
              <div
                key={s.label}
                className="relative overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#0d1424] p-5"
              >
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl opacity-10 pointer-events-none" style={{ background: s.color }} />
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${s.color}15`, color: s.color }}>
                  {s.icon}
                </div>
                <p className="text-[#475569] text-[10px] font-semibold uppercase tracking-widest mb-1">{s.label}</p>
                <p className="text-2xl font-bold text-[#f1f5f9]">{s.value}</p>
                <p className="text-[#475569] text-xs mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* XP progress */}
          <div className="rounded-2xl border p-5 lg:p-6" style={{ borderColor: `${levelColor}18`, background: `${levelColor}05` }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[#f1f5f9]">Level {stats!.level} — {levelTitle}</span>
                <Badge variant="gold">{stats!.xp.toLocaleString()} XP</Badge>
              </div>
              <span className="text-[#475569] text-xs hidden sm:block">
                {(stats!.xpToNextLevel - stats!.xp).toLocaleString()} XP to Level {stats!.level + 1}
              </span>
            </div>
            <Progress value={stats!.xp} max={stats!.xpToNextLevel} color="gold" size="lg" showLabel />
          </div>

          <div className="grid lg:grid-cols-5 gap-6">
            {/* My Courses */}
            <div className="lg:col-span-3 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#f1f5f9]">My Learning</h2>
                <Link href="/subjects" className="text-[#4f9eff] text-sm hover:underline font-medium flex items-center gap-1">
                  Browse all <ChevronRight size={14} />
                </Link>
              </div>

              <div className="space-y-3">
                {enrolled.length === 0 ? (
                  <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#0d1424] p-8 text-center">
                    <p className="text-[#475569] text-sm">No courses enrolled yet.</p>
                    <Link href="/subjects" className="inline-flex items-center gap-1.5 mt-3 text-[#4f9eff] text-sm font-semibold hover:underline">
                      Browse disciplines <ArrowRight size={14} />
                    </Link>
                  </div>
                ) : (
                  enrolled.map((enrollment) => {
                    const found = getCourseById(enrollment.courseId);
                    if (!found) return null;
                    const { course, subject } = found;
                    const progressColor =
                      enrollment.progress === 100 ? "green"
                      : subject.id === "power-engineering" ? "gold"
                      : subject.id === "coding" ? "purple"
                      : "blue";

                    return (
                      <Link
                        key={enrollment.courseId}
                        href={`/learn/${enrollment.courseId}`}
                        className="group flex items-center gap-4 p-4 rounded-2xl bg-[#0d1424] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(79,158,255,0.22)] transition-all"
                      >
                        <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${subject.color}15`, color: subject.color }}>
                          {subjectIcons[subject.id]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-[#f1f5f9] font-semibold text-sm truncate">{course.title}</h3>
                            {enrollment.progress === 100 && <Badge variant="green">Done</Badge>}
                          </div>
                          <p className="text-[#475569] text-xs mb-2">
                            {subject.shortTitle} &middot; {enrollment.completedLessons}/{course.lessons} lessons
                          </p>
                          <Progress value={enrollment.progress} color={progressColor} size="sm" />
                        </div>
                        <div className="flex-shrink-0 text-right min-w-[48px]">
                          <div className="text-[#f1f5f9] font-bold text-sm">{enrollment.progress}%</div>
                          <div className="text-[#475569] text-xs">progress</div>
                        </div>
                        <ChevronRight size={16} className="flex-shrink-0 text-[#475569] group-hover:text-[#4f9eff] transition-colors" />
                      </Link>
                    );
                  })
                )}
              </div>
            </div>

            {/* Disciplines sidebar */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-base font-bold text-[#f1f5f9]">Disciplines</h2>
              <div className="space-y-3">
                {subjects.map((subject) => {
                  const openCourses = subject.courses.filter((c) => !c.comingSoon);
                  const isLive = openCourses.length > 0;
                  return (
                    <Link
                      key={subject.id}
                      href={isLive ? `/subjects/${subject.id}` : "#"}
                      className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                        isLive
                          ? "bg-[#0d1424] border-[rgba(255,255,255,0.06)] hover:border-[rgba(79,158,255,0.22)] cursor-pointer"
                          : "bg-[#080c14] border-[rgba(255,255,255,0.04)] opacity-40 cursor-default"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${subject.color}12`, color: subject.color }}>
                        {subjectIcons[subject.id]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[#f1f5f9] text-sm font-semibold truncate">{subject.shortTitle}</p>
                        <p className="text-[#475569] text-xs">{isLive ? `${openCourses.length} open` : "Coming Soon"}</p>
                      </div>
                      {isLive && <ChevronRight size={15} className="text-[#475569] flex-shrink-0" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
