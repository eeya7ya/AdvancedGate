import { subjects } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Zap, Network, Code2, Clock, ChevronRight, BookOpen } from "lucide-react";
import DeepCourseSearch from "@/components/subjects/deep-course-search";

const subjectIcons: Record<string, React.ReactNode> = {
  "power-engineering": <Zap size={24} />,
  networking: <Network size={24} />,
  coding: <Code2 size={24} />,
};

export default function SubjectsPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-10">
      {/* Header */}
      <div className="pt-2">
        <p className="text-[#475569] text-xs font-semibold uppercase tracking-widest mb-1">Browse</p>
        <h1 className="text-3xl font-bold text-[#f1f5f9] tracking-tight">Learning Disciplines</h1>
        <p className="text-[#64748b] mt-2 text-sm max-w-xl leading-relaxed">
          Three structured engineering disciplines. Courses within each discipline build on one another. Start with any open course and progress at your own pace.
        </p>
      </div>

      {/* Deep Course Search */}
      <DeepCourseSearch />

      {/* Disciplines */}
      <div className="space-y-6">
        {subjects.map((subject) => {
          const openCourses = subject.courses.filter((c) => !c.comingSoon);
          const isLive = openCourses.length > 0;

          return (
            <div
              key={subject.id}
              className="rounded-3xl border border-[rgba(255,255,255,0.06)] overflow-hidden bg-[#0d1424]"
              style={isLive ? { borderColor: `${subject.color}18` } : {}}
            >
              {/* Subject header */}
              <div
                className="relative p-6 lg:p-8"
                style={isLive ? { background: `linear-gradient(135deg, ${subject.color}08 0%, transparent 60%)` } : {}}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-13 h-13 w-[52px] h-[52px] rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={isLive
                      ? { background: `${subject.color}12`, color: subject.color }
                      : { background: "rgba(255,255,255,0.04)", color: "#334155" }}
                  >
                    {subjectIcons[subject.id]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <h2 className={`text-xl font-bold ${isLive ? "text-[#f1f5f9]" : "text-[#475569]"}`}>
                        {subject.title}
                      </h2>
                      {isLive ? (
                        <Badge variant="blue">{openCourses.length} open</Badge>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-[#475569] text-xs font-medium">
                          <Clock size={11} />
                          Coming Soon
                        </div>
                      )}
                    </div>
                    <p className={`text-sm leading-relaxed max-w-2xl ${isLive ? "text-[#64748b]" : "text-[#334155]"}`}>
                      {subject.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Courses */}
              <div className="px-4 pb-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {subject.courses.map((course, idx) => {
                  const available = !course.comingSoon;
                  return (
                    <div
                      key={course.id}
                      className={`relative flex flex-col gap-3 p-4 rounded-2xl border transition-all ${
                        available
                          ? "bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.07)] hover:border-[rgba(79,158,255,0.25)] group cursor-pointer"
                          : "bg-[rgba(255,255,255,0.01)] border-[rgba(255,255,255,0.04)] opacity-50"
                      }`}
                    >
                      {available ? (
                        <Link href={`/learn/${course.id}`} className="absolute inset-0 z-10" aria-label={course.title} />
                      ) : null}

                      {/* Icon + index */}
                      <div className="flex items-center justify-between">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={available
                            ? { background: `${subject.color}12`, color: subject.color }
                            : { background: "rgba(255,255,255,0.04)", color: "#334155" }}
                        >
                          <BookOpen size={16} />
                        </div>
                        <span className="text-[#1e293b] text-[10px] font-semibold">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1">
                        <h3 className={`font-semibold text-sm leading-snug mb-1 ${available ? "text-[#f1f5f9] group-hover:text-[#4f9eff] transition-colors" : "text-[#334155]"}`}>
                          {course.title}
                        </h3>
                        <p className="text-[#334155] text-xs leading-relaxed line-clamp-2">
                          {course.description}
                        </p>
                      </div>

                      {/* Meta */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              course.level === "Beginner" ? "green"
                              : course.level === "Intermediate" ? "blue"
                              : "purple"
                            }
                          >
                            {course.level}
                          </Badge>
                          <span className="text-[#1e293b] text-[10px]">{course.duration}</span>
                        </div>
                        {available ? (
                          <ChevronRight size={14} className="text-[#475569] group-hover:text-[#4f9eff] transition-colors flex-shrink-0" />
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
