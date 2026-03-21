import { GoogleSignInButton } from "@/components/auth/google-sign-in";
import Image from "next/image";

// Middleware redirects authenticated users away from /login
export default function LoginPage() {
  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#080c14]">
      {/* ─── LHS: Looping Video ─────────────────────────────────────── */}
      <div className="relative hidden lg:flex lg:w-3/5 xl:w-[60%] overflow-hidden">
        <video
          src="/background.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#080c14]/40 via-transparent to-[#080c14]/90" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080c14]/60 via-transparent to-transparent" />

        <div className="relative z-10 flex flex-col justify-between h-full p-12">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <Image src="/logo.png" alt="eSpark" width={36} height={36} className="object-contain" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">eSpark</span>
          </div>

          {/* Tagline */}
          <div className="max-w-lg">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6">
              <span className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse" />
              <span className="text-white/80 text-sm font-medium">
                Live platform · 4,300+ learners
              </span>
            </div>
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
              Engineer your{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4f9eff] to-[#a78bfa]">
                future
              </span>
            </h1>
            <p className="text-white/70 text-lg leading-relaxed">
              Master Power Engineering, Networking, and Software Development
              through structured, industry-aligned learning paths.
            </p>
            <div className="flex items-center gap-8 mt-8">
              {[
                { value: "10+", label: "Courses" },
                { value: "3", label: "Disciplines" },
                { value: "∞", label: "Growth" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-white/50 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── RHS: Login Panel ────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-[#0d1424] relative overflow-auto">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full bg-[#4f9eff]/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 rounded-full bg-[#7c3aed]/5 blur-3xl pointer-events-none" />

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
              <div className="text-[#4f9eff] text-xs font-medium">
                Engineering Education Platform
              </div>
            </div>
          </div>

          {/* Welcome */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-[#f1f5f9] mb-2">
              Welcome back 👋
            </h2>
            <p className="text-[#94a3b8] leading-relaxed">
              Sign in to continue your learning journey and track your
              engineering progress.
            </p>
          </div>

          {/* Login card */}
          <div className="glass rounded-3xl p-8 border border-[rgba(255,255,255,0.08)]">
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
                { icon: "🔒", text: "Your data is encrypted and secure" },
                { icon: "✅", text: "Progress synced across all devices" },
                { icon: "🎓", text: "Access all enrolled courses instantly" },
              ].map((item) => (
                <div
                  key={item.text}
                  className="flex items-center gap-3 p-3 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]"
                >
                  <span className="text-base">{item.icon}</span>
                  <span className="text-[#94a3b8] text-sm">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-[#475569] text-xs mt-6 leading-relaxed">
            By signing in, you agree to the{" "}
            <span className="text-[#4f9eff] hover:underline cursor-pointer">
              Terms of Service
            </span>{" "}
            and{" "}
            <span className="text-[#4f9eff] hover:underline cursor-pointer">
              Privacy Policy
            </span>
          </p>

          <div className="flex items-center justify-center mt-6">
            <div className="flex items-center gap-1.5 text-[#475569] text-xs">
              <div className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
              <span>Powered by eSpark 2026</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
