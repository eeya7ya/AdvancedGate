import { Suspense } from "react";
import { getCourseById, subjects } from "@/lib/data";
import { Badge } from "@/components/ui/badge";

export async function generateStaticParams() {
  return subjects.flatMap((s) => s.courses.map((c) => ({ courseId: c.id })));
}
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, BookOpen, CheckCircle, Lock, PlayCircle, Clock } from "lucide-react";

function generateLessons(count: number, baseTitle: string) {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    title:
      i === 0
        ? `Introduction to ${baseTitle}`
        : i === count - 1
        ? "Final Assessment"
        : `Lesson ${i + 1}: ${["Core Concepts", "Deep Dive", "Practical Application", "Case Study", "Review & Practice"][i % 5]}`,
    duration: `${8 + (i % 7) * 3}m`,
    completed: false,
    locked: i > 0,
  }));
}

async function CourseContent({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const found = getCourseById(courseId);
  if (!found) notFound();
  const { course, subject } = found;
  const lessons = generateLessons(course.lessons, course.title);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pt-2">
      {/* Back */}
      <Link
        href={`/subjects/${subject.id}`}
        className="inline-flex items-center gap-1.5 text-[#475569] hover:text-[#94a3b8] text-sm font-medium transition-colors"
      >
        <ChevronLeft size={15} />
        {subject.shortTitle}
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main area */}
        <div className="lg:col-span-2 space-y-5">
          {/* Course hero */}
          <div
            className="relative overflow-hidden rounded-3xl p-6 lg:p-8 border"
            style={{
              background: `linear-gradient(135deg, ${subject.color}08 0%, #0d1424 70%)`,
              borderColor: `${subject.color}20`,
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${subject.color}12`, color: subject.color }}
              >
                <BookOpen size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge variant={course.level === "Beginner" ? "green" : course.level === "Intermediate" ? "blue" : "purple"}>
                    {course.level}
                  </Badge>
                  <span className="text-[#475569] text-xs">{course.duration}</span>
                  <span className="text-[#475569] text-xs">&middot; {course.lessons} lessons</span>
                </div>
                <h1 className="text-xl lg:text-2xl font-bold text-[#f1f5f9] mb-2">{course.title}</h1>
                <p className="text-[#64748b] text-sm leading-relaxed">{course.description}</p>
                <div className="flex gap-1.5 mt-3 flex-wrap">
                  {course.tags.map((tag: string) => (
                    <span key={tag} className="px-2 py-0.5 rounded-md bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] text-[#475569] text-[11px]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Lesson player placeholder */}
          <div className="rounded-2xl bg-[#0d1424] border border-[rgba(255,255,255,0.06)] overflow-hidden">
            <div className="aspect-video flex flex-col items-center justify-center relative bg-[#080c14]">
              <div className="absolute inset-0 bg-grid opacity-15 pointer-events-none" />
              <div className="relative z-10 text-center">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: `${subject.color}12`, color: subject.color }}
                >
                  <BookOpen size={28} />
                </div>
                <h3 className="text-[#f1f5f9] font-bold text-lg mb-1">{lessons[0].title}</h3>
                <p className="text-[#475569] text-sm">Select a lesson to begin</p>
              </div>
            </div>
            <div className="p-4 flex items-center justify-between border-t border-[rgba(255,255,255,0.06)]">
              <span className="text-[#475569] text-sm">Lesson 1 of {course.lessons}</span>
              <button className="px-5 py-2 rounded-xl bg-[#4f9eff] hover:bg-[#2d7dd2] text-white text-sm font-semibold transition-all hover:shadow-[0_0_20px_rgba(79,158,255,0.35)]">
                Start Course
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar: lessons */}
        <div className="space-y-4">
          {/* Enroll CTA */}
          <div className="p-4 rounded-2xl bg-[rgba(79,158,255,0.05)] border border-[rgba(79,158,255,0.15)]">
            <p className="text-[#f1f5f9] font-semibold text-sm mb-1">Not yet enrolled</p>
            <p className="text-[#475569] text-xs mb-3 leading-relaxed">
              Enroll to track progress, earn XP, and unlock the next courses in this discipline.
            </p>
            <button className="w-full py-2.5 rounded-xl bg-[#4f9eff] hover:bg-[#2d7dd2] text-white text-sm font-semibold transition-all">
              Enroll — Free
            </button>
          </div>

          {/* Progress placeholder */}
          <div className="p-4 rounded-2xl bg-[#0d1424] border border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#f1f5f9] font-semibold text-sm">Progress</span>
              <span className="text-[#475569] text-sm font-bold">0%</span>
            </div>
            <Progress value={0} color="gold" size="md" />
            <p className="text-[#334155] text-xs mt-2">0 of {course.lessons} lessons completed</p>
          </div>

          {/* Lesson list */}
          <div className="rounded-2xl bg-[#0d1424] border border-[rgba(255,255,255,0.06)] overflow-hidden">
            <div className="p-4 border-b border-[rgba(255,255,255,0.06)]">
              <h3 className="text-[#f1f5f9] font-bold text-sm">Course Content</h3>
            </div>
            <div className="divide-y divide-[rgba(255,255,255,0.04)] max-h-96 overflow-y-auto">
              {lessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                    lesson.locked
                      ? "opacity-40 cursor-not-allowed"
                      : "hover:bg-[rgba(255,255,255,0.03)] cursor-pointer"
                  }`}
                >
                  <div className="flex-shrink-0">
                    {lesson.completed ? (
                      <CheckCircle size={16} className="text-[#4ade80]" />
                    ) : lesson.locked ? (
                      <Lock size={14} className="text-[#334155]" />
                    ) : (
                      <PlayCircle size={16} className="text-[#4f9eff]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate ${lesson.completed ? "text-[#475569] line-through" : "text-[#f1f5f9]"}`}>
                      {lesson.title}
                    </p>
                    <div className="flex items-center gap-1 text-[#334155] text-[10px] mt-0.5">
                      <Clock size={9} />
                      {lesson.duration}
                    </div>
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
    <div className="max-w-6xl mx-auto space-y-6 animate-pulse pt-2">
      <div className="h-4 w-24 rounded bg-[#1a2540]" />
      <div className="h-48 rounded-3xl bg-[#0d1424]" />
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
      <CourseContent params={params} />
    </Suspense>
  );
}
