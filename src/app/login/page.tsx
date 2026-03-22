import { GoogleSignInButton } from "@/components/auth/google-sign-in";
import Image from "next/image";
import { Lock, CheckCircle, Sparkles } from "lucide-react";

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
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-[#0d1424] relative overflow-auto">
        <div className="absolute inset-0 bg-grid-teal opacity-60 pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-72 h-72 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(0,212,161,0.05), transparent 70%)", filter: "blur(24px)" }} />
        <div className="absolute bottom-1/3 left-1/4 w-56 h-56 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(34,211,238,0.04), transparent 70%)", filter: "blur(24px)" }} />

        <div className="relative z-10 w-full max-w-[440px]">

          {/* ── Logo ── */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center" style={{ background: "linear-gradient(135deg, #00d4a1, #22d3ee)" }}>
              <Image src="/logo.png" alt="eSpark AI" width={34} height={34} className="object-contain" />
            </div>
            <div>
              <div className="text-white font-bold text-lg leading-tight">eSpark AI</div>
              <div className="text-xs font-medium" style={{ color: "#00d4a1" }}>
                Your intelligent AI workspace
              </div>
            </div>
          </div>

          {/* ── Live badge ── */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#00d4a1] animate-pulse" />
            <span className="text-white/80 text-sm font-medium">
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
          <p className="text-white/60 text-base leading-relaxed mb-6">
            eSpark AI brings intelligent assistance, automation, and insights
            into a single, powerful workspace.
          </p>

          {/* ── Stats ── */}
          <div className="flex items-center gap-8 mb-8">
            {[
              { value: "10+", label: "AI Tools" },
              { value: "3", label: "Domains" },
              { value: "24/7", label: "Available" },
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

          {/* ── Login card ── */}
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
                { icon: <CheckCircle size={16} style={{ color: "#00d4a1" }} />, text: "Synced across all your devices" },
                { icon: <Sparkles size={16} className="text-[#22d3ee]" />, text: "Personalised AI powered by eSpark" },
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

          {/* ── Powered by eSpark ── */}
          <div className="flex items-center justify-center mt-6">
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center" style={{ background: "linear-gradient(135deg, #00d4a1, #22d3ee)" }}>
                <Image src="/logo.png" alt="eSpark AI" width={20} height={20} className="object-contain" />
              </div>
              <div>
                <p className="text-white/90 text-xs font-semibold">Powered by eSpark</p>
                <p className="text-white/40 text-[10px]">eSpark AI © 2026</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
