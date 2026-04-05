import { getSubjectById, subjects } from "@/lib/data";

export async function generateStaticParams() {
  return subjects.map((s) => ({ subjectId: s.id }));
}
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Zap, Network, Code2, BookOpen, Clock, ChevronLeft, ChevronRight } from "lucide-react";

const subjectIcons: Record<string, React.ReactNode> = {
  "power-engineering": <Zap size={26} />,
  networking: <Network size={26} />,
  coding: <Code2 size={26} />,
};

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const { subjectId } = await params;
  const subject = getSubjectById(subjectId);
  if (!subject) notFound();

  return (
    <div className="max-w-5xl mx-auto space-y-8 pt-2">
      {/* Back */}
      <Link
        href="/subjects"
        className="inline-flex items-center gap-1.5 text-[#475569] hover:text-[#94a3b8] text-sm font-medium transition-colors"
      >
        <ChevronLeft size={15} />
        All Disciplines
      </Link>

      {/* Subject hero */}
      <div
        className="relative overflow-hidden rounded-3xl p-7 lg:p-9 border"
        style={{
          background: `linear-gradient(135deg, ${subject.color}08 0%, #0d1424 70%)`,
          borderColor: `${subject.color}20`,
        }}
      >
        <div
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl opacity-8 pointer-events-none"
          style={{ background: subject.color }}
        />
        <div className="relative flex items-center gap-5">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${subject.color}15`, color: subject.color }}
          >
            {subjectIcons[subject.id]}
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-2xl lg:text-3xl font-bold text-[#f1f5f9] tracking-tight">
                {subject.title}
              </h1>
              <Badge variant="blue">{subject.courses.length} courses</Badge>
            </div>
            <p className="text-[#64748b] max-w-2xl leading-relaxed text-sm">
              {subject.description}
            </p>
          </div>
        </div>
      </div>

      {/* Courses list */}
      <div>
        <h2 className="text-xs font-semibold text-[#475569] uppercase tracking-widest mb-4">
          Course Catalogue
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {subject.courses.map((course, idx) => {
            const available = !course.comingSoon;
            return (
              <div
                key={course.id}
                className={`relative group flex flex-col gap-4 p-5 rounded-2xl border transition-all ${
                  available
                    ? "bg-[#0d1424] border-[rgba(255,255,255,0.07)] hover:border-[rgba(79,158,255,0.25)] cursor-pointer"
                    : "bg-[#080c14] border-[rgba(255,255,255,0.04)] opacity-50"
                }`}
              >
                {available && (
                  <Link href={`/learn/${course.id}`} className="absolute inset-0 z-10" aria-label={course.title} />
                )}

                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={available
                      ? { background: `${subject.color}12`, color: subject.color }
                      : { background: "rgba(255,255,255,0.03)", color: "#334155" }}
                  >
                    <BookOpen size={17} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-bold text-sm leading-snug ${available ? "text-[#f1f5f9] group-hover:text-[#4f9eff] transition-colors" : "text-[#334155]"}`}>
                      {course.title}
                    </h3>
                    <p className="text-[#334155] text-xs mt-0.5">
                      Course {idx + 1} of {subject.courses.length}
                    </p>
                  </div>
                  {available ? (
                    <ChevronRight size={16} className="text-[#475569] group-hover:text-[#4f9eff] transition-colors flex-shrink-0" />
                  ) : (
                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] text-[#334155] text-[10px] font-medium flex-shrink-0">
                      <Clock size={9} />
                      Soon
                    </div>
                  )}
                </div>

                <p className="text-[#475569] text-sm leading-relaxed">
                  {course.description}
                </p>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant={
                      course.level === "Beginner" ? "green"
                      : course.level === "Intermediate" ? "blue"
                      : "purple"
                    }
                  >
                    {course.level}
                  </Badge>
                  <span className="text-[#334155] text-xs">{course.duration}</span>
                  <span className="text-[#334155] text-xs">&middot; {course.lessons} lessons</span>
                </div>

                <div className="flex gap-1 flex-wrap">
                  {course.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-md bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] text-[#334155] text-[10px]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
