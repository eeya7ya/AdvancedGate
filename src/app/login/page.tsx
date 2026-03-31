import { GoogleSignInButton } from "@/components/auth/google-sign-in";
import { Lock, CheckCircle, Sparkles, Brain, Zap, Users, Globe, Clock } from "lucide-react";
import { VideoPanel } from "./video-panel";

// Middleware redirects authenticated users away from /login
export default function LoginPage() {
  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#07091a]">
      {/* ─── LHS: Looping Video (fades in smoothly once buffered) ───── */}
      <VideoPanel />

      {/* ─── RHS: Login Panel ────────────────────────────────────────── */}
      <div
        className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 relative overflow-auto"
        style={{
          background: "linear-gradient(160deg, #07091a 0%, #0d0f2b 40%, #10082a 70%, #07091a 100%)",
        }}
      >
        {/* Ambient glow accents */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 65%)",
              filter: "blur(60px)",
            }}
          />
          <div
            className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(0,212,161,0.12) 0%, transparent 65%)",
              filter: "blur(60px)",
            }}
          />
          {/* Dot grid */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
        </div>

        <div className="relative z-10 w-full max-w-[400px]">

          {/* ── Brand block ── */}
          <div className="flex items-center gap-3.5 mb-10">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                boxShadow: "0 0 28px rgba(99,102,241,0.45)",
              }}
            >
              <Brain size={22} className="text-white" strokeWidth={1.8} />
            </div>
            <div>
              <div className="text-white font-extrabold text-xl leading-none tracking-tight">
                eSpark <span style={{ color: "#6366f1" }}>AI</span>
              </div>
              <div className="text-[11px] font-semibold tracking-widest uppercase mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                Intelligent workspace
              </div>
            </div>
          </div>

          {/* ── Headline ── */}
          <div className="mb-8">
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-5"
              style={{
                background: "rgba(99,102,241,0.12)",
                border: "1px solid rgba(99,102,241,0.25)",
                color: "#818cf8",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#6366f1] animate-pulse" />
              Live · 4,300+ engineers & learners
            </div>

            <h1 className="text-4xl font-black leading-none tracking-tight mb-3 text-white">
              Think smarter.{" "}
              <span
                className="text-transparent bg-clip-text"
                style={{ backgroundImage: "linear-gradient(120deg, #6366f1 0%, #a78bfa 50%, #00d4a1 100%)" }}
              >
                Grow faster.
              </span>
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
              Your AI-powered learning companion — builds personalized roadmaps,
              recommends courses, and guides every step of your journey.
            </p>
          </div>

          {/* ── Stats row ── */}
          <div className="grid grid-cols-3 gap-2 mb-8">
            {[
              { icon: <Zap size={14} />, value: "10+", label: "AI Tools" },
              { icon: <Globe size={14} />, value: "Any", label: "Domain" },
              { icon: <Clock size={14} />, value: "24/7", label: "Available" },
            ].map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center gap-1 py-3 rounded-xl"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <span style={{ color: "#6366f1" }}>{s.icon}</span>
                <span className="text-base font-bold text-white leading-none">{s.value}</span>
                <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* ── Login card ── */}
          <div
            className="rounded-2xl p-6 mb-5"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(99,102,241,0.2)",
              backdropFilter: "blur(24px)",
              boxShadow: "0 8px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,102,241,0.08) inset",
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest mb-4 text-center" style={{ color: "rgba(255,255,255,0.3)" }}>
              Sign in to continue
            </p>

            <GoogleSignInButton />

            <div className="mt-5 pt-4 space-y-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              {[
                { icon: <Lock size={13} />, color: "rgba(148,163,184,0.8)", text: "Your data is encrypted end-to-end" },
                { icon: <CheckCircle size={13} />, color: "#00d4a1", text: "Synced across all your devices" },
                { icon: <Sparkles size={13} />, color: "#818cf8", text: "Personalised AI powered by eSpark" },
                { icon: <Users size={13} />, color: "#f59e0b", text: "Join 4,300+ learners worldwide" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-2.5">
                  <span className="flex-shrink-0" style={{ color: item.color }}>{item.icon}</span>
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Footer ── */}
          <p className="text-center text-[11px]" style={{ color: "rgba(255,255,255,0.22)" }}>
            By signing in you agree to our{" "}
            <span className="hover:underline cursor-pointer" style={{ color: "rgba(99,102,241,0.7)" }}>Terms</span>
            {" & "}
            <span className="hover:underline cursor-pointer" style={{ color: "rgba(99,102,241,0.7)" }}>Privacy Policy</span>
            {" · eSpark AI © 2026"}
          </p>
        </div>
      </div>
    </div>
  );
}
