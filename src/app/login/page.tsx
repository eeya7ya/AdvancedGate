import { GoogleSignInButton } from "@/components/auth/google-sign-in";
import Image from "next/image";
import { Lock, CheckCircle, GraduationCap, Sparkles } from "lucide-react";

// Middleware redirects authenticated users away from /login
export default function LoginPage() {
  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#080c14]">
      {/* Preload the video */}
      <link rel="preload" as="video" href="/background.mp4" type="video/mp4" />

      {/* ─── LHS: Looping Video ─────────────────────────────────────── */}
      <div
        className="relative hidden lg:flex lg:w-3/5 xl:w-[60%] overflow-hidden items-center justify-center"
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
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#080c14]/50 via-transparent to-[#080c14]/90" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080c14]/70 via-transparent to-[#080c14]/20" />

        {/* Centered content */}
        <div className="relative z-10 flex flex-col items-start justify-center h-full px-12 max-w-lg">
          {/* Live badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-8">
            <span className="w-2 h-2 rounded-full bg-[#00d4a1] animate-pulse" />
            <span className="text-white/80 text-sm font-medium">
              Live platform · 4,300+ learners
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-5">
            Engineer your{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00d4a1] to-[#22d3ee]">
              future
            </span>
          </h1>
          <p className="text-white/70 text-lg leading-relaxed mb-8">
            Master Power Engineering, Networking, and Software Development
            through AI-guided, industry-aligned learning paths.
          </p>

          {/* Stats */}
          <div className="flex items-center gap-10">
            {[
              { value: "10+", label: "Courses" },
              { value: "3", label: "Disciplines" },
              { value: "AI", label: "Advisor" },
            ].map((stat) => (
              <div key={stat.label}>
                <div
                  className="text-2xl font-bold text-transparent bg-clip-text"
                  style={{ backgroundImage: "linear-gradient(135deg, #00d4a1, #22d3ee)" }}
                >
                  {stat.value}
                </div>
                <div className="text-white/50 text-sm mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* AI badge */}
          <div className="mt-10 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #00d4a1, #22d3ee)" }}>
              <Sparkles size={13} className="text-white" />
            </div>
            <div>
              <p className="text-white/90 text-xs font-semibold">Powered by Claude AI</p>
              <p className="text-white/40 text-[10px]">Personalized career guidance</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── RHS: Login Panel ────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-[#0d1424] relative overflow-auto">
        <div className="absolute inset-0 bg-grid-teal opacity-60 pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-72 h-72 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(0,212,161,0.05), transparent 70%)", filter: "blur(24px)" }} />
        <div className="absolute bottom-1/3 left-1/4 w-56 h-56 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(34,211,238,0.04), transparent 70%)", filter: "blur(24px)" }} />

        <div className="relative z-10 w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-3 mb-10 lg:hidden">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/10 flex items-center justify-center">
              <Image src="/logo.png" alt="eSpark" width={36} height={36} className="object-contain" />
            </div>
            <span className="text-white font-bold text-xl">eSpark</span>
          </div>

          {/* Desktop logo */}
          <div className="hidden lg:flex items-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white/10 backdrop-blur flex items-center justify-center border border-white/10">
              <Image src="/logo.png" alt="eSpark" width={42} height={42} className="object-contain" />
            </div>
            <div>
              <div className="text-white font-bold text-lg leading-tight">
                eSpark-Learning KIT
              </div>
              <div className="text-xs font-medium" style={{ color: "#00d4a1" }}>
                Engineering Education Platform
              </div>
            </div>
          </div>

          {/* Welcome */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-[#f1f5f9] mb-2">
              Welcome back
            </h2>
            <p className="text-[#94a3b8] leading-relaxed">
              Sign in to continue your AI-guided learning journey.
            </p>
          </div>

          {/* Login card */}
          <div className="glass rounded-3xl p-8 border border-[rgba(0,212,161,0.12)]">
            <GoogleSignInButton />

            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-[rgba(255,255,255,0.08)]" />
              <span className="text-[#475569] text-xs font-medium uppercase tracking-wider">
                Secure sign-in
              </span>
              <div className="flex-1 h-px bg-[rgba(255,255,255,0.08)]" />
            </div>

            <div className="space-y-3">
              {[
                { icon: <Lock size={16} className="text-[#94a3b8]" />, text: "Your data is encrypted and secure" },
                { icon: <CheckCircle size={16} style={{ color: "#00d4a1" }} />, text: "Progress synced across all devices" },
                { icon: <GraduationCap size={16} className="text-[#22d3ee]" />, text: "AI-powered personalized roadmap" },
              ].map((item) => (
                <div
                  key={item.text}
                  className="flex items-center gap-3 p-3 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]"
                >
                  <span className="flex items-center justify-center w-5 h-5">{item.icon}</span>
                  <span className="text-[#94a3b8] text-sm">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-[#475569] text-xs mt-6 leading-relaxed">
            By signing in, you agree to the{" "}
            <span className="hover:underline cursor-pointer" style={{ color: "#00d4a1" }}>
              Terms of Service
            </span>{" "}
            and{" "}
            <span className="hover:underline cursor-pointer" style={{ color: "#00d4a1" }}>
              Privacy Policy
            </span>
          </p>

          <div className="flex items-center justify-center mt-6">
            <div className="flex items-center gap-1.5 text-[#475569] text-xs">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#00d4a1" }} />
              <span>Powered by eSpark 2026</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
