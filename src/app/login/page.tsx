import { GoogleSignInButton } from "@/components/auth/google-sign-in";
import { Lock, CheckCircle, Sparkles, Brain, Zap } from "lucide-react";

// Middleware redirects authenticated users away from /login
export default function LoginPage() {
  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#080c14]">
      {/* Preload the video */}
      <link rel="preload" as="video" href="/background.mp4" type="video/mp4" />

      {/* ─── LHS: Looping Video (clean, no text overlay) ─────────────── */}
      <div
        className="relative hidden lg:flex lg:w-3/5 xl:w-[60%] overflow-hidden"
        style={{ background: "linear-gradient(135deg,#0d1424 0%,#111827 100%)" }}
      >
        <video
          src="/background.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          // @ts-expect-error — fetchpriority is a valid HTML attribute not yet typed
          fetchpriority="high"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Subtle edge gradients only — no text overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#080c14]/80" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080c14]/40 via-transparent to-transparent" />
      </div>

      {/* ─── RHS: All Content + Login Panel ─────────────────────────── */}
      <div
        className="flex-1 flex items-center justify-center p-6 lg:p-12 relative overflow-auto"
        style={{
          background: "linear-gradient(160deg, #0a1628 0%, #0d2a1e 50%, #0a1628 100%)",
        }}
      >
        {/* Green glow accents */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full opacity-20"
            style={{
              background: "radial-gradient(circle, #00d4a1 0%, transparent 70%)",
              filter: "blur(80px)",
              transform: "translate(30%, -30%)",
            }}
          />
          <div
            className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-15"
            style={{
              background: "radial-gradient(circle, #22d3ee 0%, transparent 70%)",
              filter: "blur(80px)",
              transform: "translate(-30%, 30%)",
            }}
          />
          {/* Subtle green grid */}
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "linear-gradient(rgba(0,212,161,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,161,0.05) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        <div className="relative z-10 w-full max-w-[440px]">

          {/* ── Logo (icon-only, no image file) ── */}
          <div className="flex items-center gap-3 mb-8">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #00d4a1, #22d3ee)",
                boxShadow: "0 0 24px rgba(0,212,161,0.4)",
              }}
            >
              <Brain size={24} className="text-white" strokeWidth={2} />
            </div>
            <div>
              <div className="text-white font-bold text-xl leading-tight tracking-tight">
                eSpark AI
              </div>
              <div className="text-xs font-semibold tracking-widest uppercase" style={{ color: "#00d4a1" }}>
                Your intelligent AI workspace
              </div>
            </div>
          </div>

          {/* ── Live badge ── */}
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-6"
            style={{
              background: "rgba(0,212,161,0.1)",
              border: "1px solid rgba(0,212,161,0.3)",
            }}
          >
            <span className="w-2 h-2 rounded-full bg-[#00d4a1] animate-pulse" />
            <span className="text-sm font-medium" style={{ color: "#00d4a1" }}>
              Live · 4,300+ users
            </span>
          </div>

          {/* ── Headline ── */}
          <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight mb-3">
            Think smarter,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00d4a1] to-[#22d3ee]">
              work faster
            </span>
          </h1>
          <p className="leading-relaxed mb-6" style={{ color: "rgba(255,255,255,0.65)", fontSize: "15px" }}>
            eSpark AI brings intelligent assistance, automation, and insights
            into a single, powerful workspace.
          </p>

          {/* ── Stats ── */}
          <div
            className="flex items-center gap-0 mb-8 rounded-2xl overflow-hidden"
            style={{ border: "1px solid rgba(0,212,161,0.15)", background: "rgba(0,212,161,0.04)" }}
          >
            {[
              { value: "10+", label: "AI Tools" },
              { value: "Any", label: "Domain" },
              { value: "24/7", label: "Available" },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className="flex-1 py-3 text-center"
                style={{
                  borderRight: i < 2 ? "1px solid rgba(0,212,161,0.12)" : "none",
                }}
              >
                <div
                  className="text-xl font-bold text-transparent bg-clip-text"
                  style={{ backgroundImage: "linear-gradient(135deg, #00d4a1, #22d3ee)" }}
                >
                  {stat.value}
                </div>
                <div className="text-xs font-medium mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* ── Login card ── */}
          <div
            className="rounded-3xl p-7"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(0,212,161,0.2)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 8px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(0,212,161,0.1)",
            }}
          >
            <GoogleSignInButton />

            <div className="flex items-center gap-4 my-5">
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
                Secure sign-in
              </span>
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
            </div>

            <div className="space-y-2.5">
              {[
                {
                  icon: <Lock size={15} style={{ color: "#94a3b8" }} />,
                  text: "Your data is encrypted and secure",
                },
                {
                  icon: <CheckCircle size={15} style={{ color: "#00d4a1" }} />,
                  text: "Synced across all your devices",
                },
                {
                  icon: <Sparkles size={15} style={{ color: "#22d3ee" }} />,
                  text: "Personalised AI powered by eSpark",
                },
              ].map((item) => (
                <div
                  key={item.text}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <span className="flex items-center justify-center w-5 h-5 flex-shrink-0">
                    {item.icon}
                  </span>
                  <span className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-xs mt-5 leading-relaxed" style={{ color: "rgba(255,255,255,0.3)" }}>
            By signing in, you agree to the{" "}
            <span className="hover:underline cursor-pointer" style={{ color: "#00d4a1" }}>
              Terms of Service
            </span>{" "}
            and{" "}
            <span className="hover:underline cursor-pointer" style={{ color: "#00d4a1" }}>
              Privacy Policy
            </span>
          </p>

          {/* ── Powered by eSpark (icon-only) ── */}
          <div className="flex items-center justify-center mt-5">
            <div
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl"
              style={{
                background: "rgba(0,212,161,0.06)",
                border: "1px solid rgba(0,212,161,0.15)",
              }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #00d4a1, #22d3ee)" }}
              >
                <Zap size={14} className="text-white" fill="currentColor" />
              </div>
              <div>
                <p className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.85)" }}>
                  Powered by eSpark
                </p>
                <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                  eSpark AI © 2026
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
