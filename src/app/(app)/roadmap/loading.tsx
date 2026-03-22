export default function RoadmapLoading() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-3 w-24 rounded-full" style={{ background: "var(--border-subtle)" }} />
          <div className="h-8 w-56 rounded-xl" style={{ background: "var(--bg-card)" }} />
        </div>
        <div className="h-9 w-28 rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }} />
      </div>

      {/* Today's focus card */}
      <div className="rounded-2xl p-6 space-y-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
        <div className="h-4 w-32 rounded-full" style={{ background: "var(--border-subtle)" }} />
        <div className="h-6 w-3/4 rounded-lg" style={{ background: "var(--bg-base)" }} />
        <div className="h-3 w-full rounded-full" style={{ background: "var(--bg-base)" }} />
        <div className="h-3 w-2/3 rounded-full" style={{ background: "var(--bg-base)" }} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Priorities card */}
        <div className="rounded-2xl p-6 space-y-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
          <div className="h-4 w-36 rounded-full" style={{ background: "var(--border-subtle)" }} />
          {[92, 75, 58, 38].map((w, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between">
                <div className="h-3 w-28 rounded-full" style={{ background: "var(--bg-base)" }} />
                <div className="h-3 w-8 rounded-full" style={{ background: "var(--bg-base)" }} />
              </div>
              <div className="h-2.5 rounded-full" style={{ background: "var(--bg-base)" }}>
                <div className="h-full rounded-full" style={{ width: `${w}%`, background: "var(--border-subtle)" }} />
              </div>
            </div>
          ))}
        </div>

        {/* Time allocation card */}
        <div className="rounded-2xl p-6 space-y-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
          <div className="h-4 w-44 rounded-full" style={{ background: "var(--border-subtle)" }} />
          <div className="flex items-center gap-6">
            <div className="w-[120px] h-[120px] rounded-full flex-shrink-0" style={{ background: "var(--bg-base)" }} />
            <div className="space-y-3 flex-1">
              {[50, 70, 40].map((w, i) => (
                <div key={i} className="space-y-1">
                  <div className="h-3 rounded-full" style={{ width: `${w}%`, background: "var(--bg-base)" }} />
                  <div className="h-2 rounded-full" style={{ width: `${w - 10}%`, background: "var(--border-subtle)" }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Next steps card */}
      <div className="rounded-2xl p-6 space-y-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
        <div className="h-4 w-24 rounded-full" style={{ background: "var(--border-subtle)" }} />
        {[80, 60, 70].map((w, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5" style={{ background: "var(--bg-base)" }} />
            <div className="h-4 rounded-full flex-1" style={{ width: `${w}%`, background: "var(--bg-base)" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
