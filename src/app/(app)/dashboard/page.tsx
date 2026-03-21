import {
  mockUserStats,
  mockEnrolledCourses,
  achievements,
  subjects,
  getCourseById,
} from "@/lib/data";
import { getLevelColor, getLevelTitle } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { DashboardGreeting } from "@/components/dashboard/greeting";
import Link from "next/link";

export default async function DashboardPage() {
  "use cache";
  const stats = mockUserStats;
  const enrolled = mockEnrolledCourses;
  const levelColor = getLevelColor(stats.level);
  const levelTitle = getLevelTitle(stats.level);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* ── Hero greeting (client — needs session) ───────── */}
      <DashboardGreeting stats={stats} />

      {/* ── Level & XP card ──────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-3xl p-6 lg:p-8 border border-[rgba(255,255,255,0.08)]"
        style={{
          background: `linear-gradient(135deg, ${levelColor}08 0%, rgba(13,20,36,0.9) 60%)`,
          borderColor: `${levelColor}20`,
        }}
      >
        <div
          className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ background: levelColor }}
        />
        <div className="relative flex flex-col lg:flex-row gap-6 items-start lg:items-center">
          {/* Level badge */}
          <div
            className="flex-shrink-0 w-20 h-20 rounded-2xl flex flex-col items-center justify-center border"
            style={{
              background: `${levelColor}15`,
              borderColor: `${levelColor}30`,
            }}
          >
            <span className="text-2xl font-black" style={{ color: levelColor }}>
              {stats.level}
            </span>
            <span className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wide">
              Level
            </span>
          </div>

          {/* XP progress */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold text-[#f1f5f9]">{levelTitle}</h2>
              <Badge variant="gold">⚡ {stats.xp.toLocaleString()} XP</Badge>
            </div>
            <p className="text-[#94a3b8] text-sm mb-3">
              {(stats.xpToNextLevel - stats.xp).toLocaleString()} XP to Level{" "}
              {stats.level + 1}
            </p>
            <Progress
              value={stats.xp}
              max={stats.xpToNextLevel}
              color="gold"
              size="lg"
              showLabel
            />
          </div>

          {/* Stats */}
          <div className="flex gap-6 flex-shrink-0">
            {[
              { label: "enrolled", value: stats.totalCourses, icon: "📚" },
              { label: "finished", value: stats.completedCourses, icon: "🎓" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="text-2xl font-bold text-[#f1f5f9]">{s.value}</div>
                <div className="text-[#94a3b8] text-xs">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* ── Enrolled Courses ─────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#f1f5f9]">My Learning</h2>
            <Link
              href="/subjects"
              className="text-[#4f9eff] text-sm hover:underline font-medium"
            >
              Browse all →
            </Link>
          </div>

          <div className="space-y-3">
            {enrolled.map((enrollment) => {
              const found = getCourseById(enrollment.courseId);
              if (!found) return null;
              const { course, subject } = found;

              return (
                <Link
                  key={enrollment.courseId}
                  href={`/learn/${enrollment.courseId}`}
                  className="group flex items-center gap-4 p-4 rounded-2xl bg-[#111827] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(79,158,255,0.3)] card-hover"
                >
                  <div
                    className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                    style={{ background: `${subject.color}15` }}
                  >
                    {course.thumbnail}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-[#f1f5f9] font-semibold text-sm truncate">
                        {course.title}
                      </h3>
                      {enrollment.progress === 100 && (
                        <Badge variant="green">✓ Done</Badge>
                      )}
                    </div>
                    <p className="text-[#94a3b8] text-xs mb-2 truncate">
                      {subject.shortTitle} · {enrollment.completedLessons}/
                      {course.lessons} lessons
                    </p>
                    <Progress
                      value={enrollment.progress}
                      color={
                        enrollment.progress === 100
                          ? "green"
                          : subject.id === "power-engineering"
                          ? "gold"
                          : subject.id === "coding"
                          ? "purple"
                          : "blue"
                      }
                      size="sm"
                    />
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="text-[#f1f5f9] font-bold text-sm">
                      {enrollment.progress}%
                    </div>
                    <div className="text-[#94a3b8] text-xs">progress</div>
                  </div>
                  <div className="flex-shrink-0 text-[#475569] group-hover:text-[#4f9eff] transition-colors text-sm">
                    →
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── Achievements ─────────────────────────────────── */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-[#f1f5f9]">Achievements</h2>
          <div className="space-y-2">
            {achievements.map((ach) => (
              <div
                key={ach.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  ach.locked
                    ? "bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.04)] opacity-50"
                    : "bg-[rgba(245,166,35,0.05)] border-[rgba(245,166,35,0.2)]"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                    ach.locked
                      ? "bg-[rgba(255,255,255,0.05)] grayscale"
                      : "bg-[rgba(245,166,35,0.1)]"
                  }`}
                >
                  {ach.locked ? "🔒" : ach.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-semibold truncate ${
                      ach.locked ? "text-[#475569]" : "text-[#f1f5f9]"
                    }`}
                  >
                    {ach.title}
                  </p>
                  <p className="text-[#475569] text-xs truncate">
                    {ach.description}
                  </p>
                </div>
                {!ach.locked && (
                  <Badge variant="gold" className="flex-shrink-0">
                    +{ach.xp}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Disciplines strip ────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-[#f1f5f9]">
          Available Disciplines
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {subjects.map((subject) => (
            <Link
              key={subject.id}
              href={
                subject.category !== "coming-soon"
                  ? `/subjects/${subject.id}`
                  : "#"
              }
              className={`group relative overflow-hidden rounded-2xl p-4 border border-[rgba(255,255,255,0.06)] bg-[#111827] text-center card-hover ${
                subject.category === "coming-soon"
                  ? "opacity-50 cursor-not-allowed pointer-events-none"
                  : ""
              }`}
            >
              <div
                className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity"
                style={{ background: subject.gradient }}
              />
              <div className="relative z-10">
                <div className="text-3xl mb-2">{subject.icon}</div>
                <p className="text-[#f1f5f9] text-xs font-semibold leading-tight">
                  {subject.shortTitle}
                </p>
                {subject.category !== "coming-soon" ? (
                  <p className="text-[#94a3b8] text-[10px] mt-1">
                    {subject.courses.length} courses
                  </p>
                ) : (
                  <Badge variant="outline" className="mt-1 text-[10px]">
                    Soon
                  </Badge>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
