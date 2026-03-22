export default function DashboardLoading() {
  return (
    <div className="max-w-4xl mx-auto flex items-center justify-center" style={{ minHeight: "60vh" }}>
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-14 h-14 rounded-2xl animate-pulse"
          style={{ background: "linear-gradient(135deg, rgba(0,212,161,0.3), rgba(34,211,238,0.3))" }}
        />
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full animate-bounce"
              style={{
                background: "#00d4a1",
                animationDelay: `${i * 0.15}s`,
                opacity: 0.7,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
