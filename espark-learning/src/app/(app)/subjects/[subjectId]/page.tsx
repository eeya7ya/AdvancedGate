import { Suspense } from "react";
import { getSubjectById } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { notFound } from "next/navigation";

async function SubjectContent({ subjectId }: { subjectId: string }) {
  "use cache";
  const subject = getSubjectById(subjectId);
  if (!subject) notFound();

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Back */}
      <Link
        href="/subjects"
        className="inline-flex items-center gap-2 text-[#94a3b8] hover:text-[#f1f5f9] text-sm font-medium transition-colors"
      >
        ← Back to Subjects
      </Link>

      {/* Subject hero */}
      <div
        className="relative overflow-hidden rounded-3xl p-8 border"
        style={{
          background: `linear-gradient(135deg, ${subject.color}10 0%, rgba(13,20,36,0.95) 70%)`,
          borderColor: `${subject.color}25`,
        }}
      >
        <div
          className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-10 pointer-events-none"
          style={{ background: subject.color }}
        />
        <div className="relative flex items-center gap-5">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0"
            style={{ background: `${subject.color}20` }}
          >
            {subject.icon}
          </div>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl lg:text-3xl font-bold text-[#f1f5f9]">
                {subject.title}
              </h1>
              <Badge variant="blue">{subject.courses.length} courses</Badge>
            </div>
            <p className="text-[#94a3b8] max-w-2xl leading-relaxed">
              {subject.description}
            </p>
          </div>
        </div>
      </div>

      {/* Courses list */}
      <div>
        <h2 className="text-lg font-bold text-[#f1f5f9] mb-4">
          All Courses in {subject.shortTitle}
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {subject.courses.map((course, idx) => (
            <Link
              key={course.id}
              href={`/learn/${course.id}`}
              className="group flex flex-col gap-4 p-5 rounded-2xl bg-[#111827] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(79,158,255,0.3)] card-hover"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: `${subject.color}15` }}
                >
                  {course.thumbnail}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[#f1f5f9] font-bold text-sm leading-snug group-hover:text-[#4f9eff] transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-[#94a3b8] text-xs mt-0.5">
                    Course {idx + 1} of {subject.courses.length}
                  </p>
                </div>
              </div>

              <p className="text-[#94a3b8] text-sm leading-relaxed">
                {course.description}
              </p>

              <div className="flex items-center gap-2 flex-wrap">
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
                <span className="text-[#475569] text-xs">
                  ⏱ {course.duration}
                </span>
                <span className="text-[#475569] text-xs">
                  📖 {course.lessons} lessons
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex gap-1 flex-wrap">
                  {course.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-md bg-[rgba(255,255,255,0.05)] text-[#94a3b8] text-[10px]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <span className="text-[#4f9eff] text-sm font-semibold group-hover:translate-x-1 transition-transform">
                  Enroll →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function SubjectSkeleton() {
  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-pulse">
      <div className="h-4 w-32 rounded bg-[#1a2540]" />
      <div className="h-40 rounded-3xl bg-[#111827]" />
    </div>
  );
}

export default function SubjectPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  return (
    <Suspense fallback={<SubjectSkeleton />}>
      {params.then(({ subjectId }) => (
        <SubjectContent subjectId={subjectId} />
      ))}
    </Suspense>
  );
}
