import { subjects } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function SubjectsPage() {
  const activeSubjects = subjects.filter((s) => s.category !== "coming-soon");
  const comingSoon = subjects.filter((s) => s.category === "coming-soon");

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      {/* Header */}
      <div>
        <p className="text-[#94a3b8] text-sm font-medium mb-1">Browse</p>
        <h1 className="text-2xl lg:text-3xl font-bold text-[#f1f5f9]">
          Learning Disciplines
        </h1>
        <p className="text-[#94a3b8] mt-2 max-w-2xl">
          Choose a discipline to explore courses. Earn XP, level up, and build
          real-world engineering skills.
        </p>
      </div>

      {/* Active Subjects */}
      <div className="space-y-6">
        {activeSubjects.map((subject) => (
          <div
            key={subject.id}
            className="rounded-3xl bg-[#111827] border border-[rgba(255,255,255,0.06)] overflow-hidden"
            style={{ borderColor: `${subject.color}20` }}
          >
            {/* Subject header */}
            <div
              className="relative p-6 lg:p-8"
              style={{
                background: `linear-gradient(135deg, ${subject.color}10 0%, transparent 60%)`,
              }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                  style={{ background: `${subject.color}15` }}
                >
                  {subject.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    <h2 className="text-xl font-bold text-[#f1f5f9]">
                      {subject.title}
                    </h2>
                    <Badge variant="blue">{subject.courses.length} courses</Badge>
                    <Badge variant="default">
                      {subject.totalStudents.toLocaleString()} students
                    </Badge>
                  </div>
                  <p className="text-[#94a3b8] text-sm leading-relaxed max-w-2xl">
                    {subject.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Courses grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-4 pt-0">
              {subject.courses.map((course) => (
                <Link
                  key={course.id}
                  href={`/learn/${course.id}`}
                  className="group relative flex flex-col gap-3 p-4 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(79,158,255,0.3)] card-hover"
                >
                  {/* Thumbnail icon */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                    style={{ background: `${subject.color}15` }}
                  >
                    {course.thumbnail}
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <h3 className="text-[#f1f5f9] font-semibold text-sm leading-snug mb-1 group-hover:text-[#4f9eff] transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-[#94a3b8] text-xs leading-relaxed line-clamp-2">
                      {course.description}
                    </p>
                  </div>

                  {/* Meta */}
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
                    <span className="text-[#475569] text-xs">{course.duration}</span>
                    <span className="text-[#475569] text-xs">
                      · {course.lessons} lessons
                    </span>
                  </div>

                  {/* Tags */}
                  <div className="flex gap-1 flex-wrap">
                    {course.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-md bg-[rgba(255,255,255,0.05)] text-[#94a3b8] text-[10px]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* CTA arrow */}
                  <div className="absolute top-4 right-4 text-[#475569] group-hover:text-[#4f9eff] text-sm transition-colors">
                    →
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Coming Soon */}
      {comingSoon.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-[#f1f5f9] flex items-center gap-2">
            <span>🚀</span> Coming Soon
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {comingSoon.map((subject) => (
              <div
                key={subject.id}
                className="flex items-center gap-4 p-5 rounded-2xl bg-[#111827] border border-[rgba(255,255,255,0.06)] opacity-60"
              >
                <div className="w-12 h-12 rounded-xl bg-[rgba(255,255,255,0.05)] flex items-center justify-center text-2xl">
                  {subject.icon}
                </div>
                <div>
                  <h3 className="text-[#f1f5f9] font-semibold">{subject.title}</h3>
                  <p className="text-[#475569] text-sm">{subject.description}</p>
                </div>
                <Badge variant="outline" className="ml-auto flex-shrink-0">
                  Soon
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
