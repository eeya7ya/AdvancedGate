import { Suspense } from "react";
import { getCourseById, mockEnrolledCourses } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { notFound } from "next/navigation";

// Mock lesson generator (pure function, no async)
function generateLessons(count: number, baseTitle: string) {
  const types = ["📖 Reading", "🎥 Video", "💡 Quiz", "🛠️ Exercise"];
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    title:
      i === 0
        ? `Introduction to ${baseTitle}`
        : i === count - 1
        ? `Final Assessment`
        : `Lesson ${i + 1}: ${["Core Concepts", "Deep Dive", "Practical Application", "Case Study", "Review & Practice"][i % 5]}`,
    type: types[i % types.length],
    duration: `${8 + (i % 7) * 3}m`,
    completed: i < 3,
    locked: i > 5,
  }));
}

async function CourseContent({ courseId }: { courseId: string }) {
  "use cache";
  const found = getCourseById(courseId);
  if (!found) notFound();

  const { course, subject } = found;
  const enrollment = mockEnrolledCourses.find((e) => e.courseId === courseId);
  const lessons = generateLessons(course.lessons, course.title);
  const completedLessons = enrollment?.completedLessons ?? 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href={`/subjects/${subject.id}`}
        className="inline-flex items-center gap-2 text-[#94a3b8] hover:text-[#f1f5f9] text-sm font-medium transition-colors"
      >
        ← {subject.shortTitle}
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── Main content area ──────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Course hero */}
          <div
            className="relative overflow-hidden rounded-3xl p-6 lg:p-8 border"
            style={{
              background: `linear-gradient(135deg, ${subject.color}10 0%, rgba(13,20,36,0.98) 70%)`,
              borderColor: `${subject.color}25`,
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                style={{ background: `${subject.color}20` }}
              >
                {course.thumbnail}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
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
                  <Badge variant="default">⏱ {course.duration}</Badge>
                  <Badge variant="default">📖 {course.lessons} lessons</Badge>
                </div>
                <h1 className="text-xl lg:text-2xl font-bold text-[#f1f5f9] mb-2">
                  {course.title}
                </h1>
                <p className="text-[#94a3b8] text-sm leading-relaxed">
                  {course.description}
                </p>
                <div className="flex gap-1 mt-3 flex-wrap">
                  {course.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-md bg-[rgba(255,255,255,0.06)] text-[#94a3b8] text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Current lesson player area */}
          <div className="rounded-3xl bg-[#111827] border border-[rgba(255,255,255,0.06)] overflow-hidden">
            <div className="aspect-video bg-gradient-to-br from-[#0d1424] to-[#111827] flex flex-col items-center justify-center relative">
              <div className="text-7xl mb-4 animate-float">{course.thumbnail}</div>
              <h3 className="text-[#f1f5f9] font-bold text-lg mb-2">
                {lessons[completedLessons]?.title ?? lessons[0].title}
              </h3>
              <p className="text-[#94a3b8] text-sm">
                Click a lesson below to start
              </p>
              <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
            </div>
            <div className="p-4 flex items-center justify-between border-t border-[rgba(255,255,255,0.06)]">
              <div className="text-[#94a3b8] text-sm">
                Lesson {Math.min(completedLessons + 1, course.lessons)} of{" "}
                {course.lessons}
              </div>
              <button className="px-5 py-2 rounded-xl bg-[#4f9eff] hover:bg-[#2d7dd2] text-white text-sm font-semibold transition-all hover:shadow-[0_0_20px_rgba(79,158,255,0.4)]">
                ▶ Continue Learning
              </button>
            </div>
          </div>
        </div>

        {/* ── Sidebar: lessons list ────────────────────────── */}
        <div className="space-y-4">
          {/* Progress */}
          {enrollment && (
            <div className="p-4 rounded-2xl bg-[#111827] border border-[rgba(255,255,255,0.06)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#f1f5f9] font-semibold text-sm">
                  Your Progress
                </span>
                <span className="text-[#f5a623] font-bold text-sm">
                  {enrollment.progress}%
                </span>
              </div>
              <Progress value={enrollment.progress} color="gold" size="md" />
              <p className="text-[#94a3b8] text-xs mt-2">
                {enrollment.completedLessons} of {course.lessons} lessons done
              </p>
            </div>
          )}

          {!enrollment && (
            <div className="p-4 rounded-2xl bg-[rgba(79,158,255,0.05)] border border-[rgba(79,158,255,0.2)]">
              <p className="text-[#f1f5f9] font-semibold text-sm mb-1">
                Not yet enrolled
              </p>
              <p className="text-[#94a3b8] text-xs mb-3">
                Enroll to track your progress and earn XP
              </p>
              <button className="w-full py-2 rounded-xl bg-[#4f9eff] text-white text-sm font-semibold hover:bg-[#2d7dd2] transition-all">
                Enroll for Free
              </button>
            </div>
          )}

          {/* Lesson list */}
          <div className="rounded-2xl bg-[#111827] border border-[rgba(255,255,255,0.06)] overflow-hidden">
            <div className="p-4 border-b border-[rgba(255,255,255,0.06)]">
              <h3 className="text-[#f1f5f9] font-bold text-sm">
                Course Content
              </h3>
            </div>
            <div className="divide-y divide-[rgba(255,255,255,0.04)] max-h-[420px] overflow-y-auto">
              {lessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                    lesson.locked
                      ? "opacity-40 cursor-not-allowed"
                      : "hover:bg-[rgba(255,255,255,0.03)] cursor-pointer"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 ${
                      lesson.completed
                        ? "bg-[rgba(74,222,128,0.2)] text-[#4ade80]"
                        : lesson.locked
                        ? "bg-[rgba(255,255,255,0.05)] text-[#475569]"
                        : "bg-[rgba(79,158,255,0.15)] text-[#4f9eff]"
                    }`}
                  >
                    {lesson.completed ? "✓" : lesson.locked ? "🔒" : lesson.id}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs font-medium truncate ${
                        lesson.completed
                          ? "text-[#94a3b8] line-through"
                          : "text-[#f1f5f9]"
                      }`}
                    >
                      {lesson.title}
                    </p>
                    <p className="text-[#475569] text-[10px]">
                      {lesson.type} · {lesson.duration}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CourseSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
      <div className="h-4 w-24 rounded bg-[#1a2540]" />
      <div className="h-48 rounded-3xl bg-[#111827]" />
    </div>
  );
}

export default function LearnPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  return (
    <Suspense fallback={<CourseSkeleton />}>
      {params.then(({ courseId }) => (
        <CourseContent courseId={courseId} />
      ))}
    </Suspense>
  );
}
