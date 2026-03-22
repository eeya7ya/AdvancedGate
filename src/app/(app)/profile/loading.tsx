export default function ProfileLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
      {/* Profile header card */}
      <div className="rounded-2xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl flex-shrink-0" style={{ background: "var(--bg-base)" }} />
          <div className="space-y-2 flex-1">
            <div className="h-6 w-40 rounded-lg" style={{ background: "var(--bg-base)" }} />
            <div className="h-4 w-56 rounded-full" style={{ background: "var(--border-subtle)" }} />
            <div className="h-3 w-32 rounded-full" style={{ background: "var(--border-subtle)" }} />
          </div>
          <div className="h-9 w-28 rounded-xl" style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)" }} />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* AI summary */}
        <div className="lg:col-span-2 rounded-2xl p-6 space-y-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
          <div className="h-4 w-36 rounded-full" style={{ background: "var(--border-subtle)" }} />
          <div className="space-y-2">
            <div className="h-3 w-full rounded-full" style={{ background: "var(--bg-base)" }} />
            <div className="h-3 w-5/6 rounded-full" style={{ background: "var(--bg-base)" }} />
            <div className="h-3 w-4/5 rounded-full" style={{ background: "var(--bg-base)" }} />
          </div>
        </div>

        {/* Priorities */}
        <div className="rounded-2xl p-6 space-y-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
          <div className="h-4 w-28 rounded-full" style={{ background: "var(--border-subtle)" }} />
          {[92, 75, 58].map((w, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-24 rounded-full" style={{ background: "var(--bg-base)" }} />
              <div className="h-2 rounded-full" style={{ background: "var(--bg-base)" }}>
                <div className="h-full rounded-full" style={{ width: `${w}%`, background: "var(--border-subtle)" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Profile details card */}
      <div className="rounded-2xl p-6 space-y-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
        <div className="h-4 w-32 rounded-full" style={{ background: "var(--border-subtle)" }} />
        <div className="grid sm:grid-cols-2 gap-4">
          {[60, 45, 55, 40].map((w, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-20 rounded-full" style={{ background: "var(--border-subtle)" }} />
              <div className="h-10 rounded-xl" style={{ background: "var(--bg-base)" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
