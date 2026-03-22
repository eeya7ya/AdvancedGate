"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useState } from "react";
import { LogOut, User, LayoutDashboard, Map } from "lucide-react";
import { useLang } from "@/lib/language";

const mobileNav = [
  { href: "/dashboard", icon: LayoutDashboard, en: "AI Advisor",  ar: "المستشار الذكي" },
  { href: "/roadmap",   icon: Map,              en: "My Roadmap",  ar: "خارطة طريقي"   },
  { href: "/profile",   icon: User,             en: "Profile",     ar: "الملف الشخصي"  },
];

const BREADCRUMB_MAP: Record<string, string> = {
  dashboard: "AI Advisor",
  roadmap:   "My Roadmap",
  subjects:  "Subjects",
  learn:     "Course",
  profile:   "Profile",
};

const BREADCRUMB_MAP_AR: Record<string, string> = {
  dashboard: "المستشار الذكي",
  roadmap:   "خارطة طريقي",
  subjects:  "المواد",
  learn:     "الدورة",
  profile:   "الملف الشخصي",
};

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const { lang, toggle: toggleLang } = useLang();
  const user = session?.user;
  const segment = pathname.split("/")[1] || "dashboard";
  const crumb = lang === "ar"
    ? (BREADCRUMB_MAP_AR[segment] ?? segment)
    : (BREADCRUMB_MAP[segment] ?? segment);

  return (
    <>
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 lg:px-6 h-16 backdrop-blur-xl border-b"
        style={{
          background: "color-mix(in srgb, var(--bg-base) 92%, transparent)",
          borderColor: "var(--border-subtle)",
        }}
      >
        {/* Mobile logo */}
        <div className="flex items-center gap-3 lg:hidden">
          <div className="w-7 h-7 rounded-lg overflow-hidden">
            <Image src="/logo.png" alt="eSpark" width={24} height={24} className="object-contain" />
          </div>
          <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
            eSpark AI
          </span>
        </div>

        {/* Desktop breadcrumb */}
        <div className="hidden lg:flex items-center gap-2 text-sm">
          <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>eSpark AI</span>
          <span style={{ color: "var(--border-medium)" }}>/</span>
          <span className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>{crumb}</span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2.5">
          {/* Language toggle */}
          <button
            onClick={toggleLang}
            title={lang === "en" ? "Switch to Arabic" : "التبديل إلى الإنجليزية"}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-80"
            style={{
              background: "var(--bg-card)",
              border: "1px solid rgba(0,212,161,0.3)",
              color: "#00d4a1",
              letterSpacing: "0.04em",
            }}
          >
            {lang === "en" ? "عربي" : "EN"}
          </button>

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Avatar + dropdown */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full transition-all"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div
                className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #00d4a1, #22d3ee)" }}
              >
                {user?.image ? (
                  <Image src={user.image} alt={user.name ?? "User"} width={28} height={28} className="object-cover w-full h-full" />
                ) : (
                  (user?.name?.[0] ?? "E").toUpperCase()
                )}
              </div>
              <span
                className="hidden md:block text-sm font-medium max-w-[100px] truncate"
                style={{ color: "var(--text-secondary)" }}
              >
                {user?.name?.split(" ")[0] ?? "Engineer"}
              </span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--text-muted)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-12 w-52 rounded-2xl shadow-2xl overflow-hidden z-50"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-medium)",
                }}
              >
                <div className="p-3" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                    {user?.name ?? "Engineering Student"}
                  </p>
                  <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                    {user?.email ?? ""}
                  </p>
                </div>
                <div className="p-2 space-y-0.5">
                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <User size={14} />
                    {lang === "ar" ? "الملف الشخصي" : "Profile"}
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <LogOut size={14} />
                    {lang === "ar" ? "تسجيل خروج" : "Sign out"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden p-2 rounded-xl transition-all"
            style={{ color: "var(--text-muted)" }}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile nav drawer */}
      {menuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
        >
          <div
            dir={lang === "ar" ? "rtl" : "ltr"}
            className="absolute right-0 top-0 h-full w-64 p-6"
            style={{
              background: "var(--bg-surface)",
              borderLeft: "1px solid var(--border-subtle)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-8">
              <Image src="/logo.png" alt="eSpark" width={28} height={28} className="object-contain" />
              <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                eSpark AI
              </span>
            </div>
            <nav className="space-y-1">
              {mobileNav.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                    )}
                    style={
                      active
                        ? { background: "rgba(0,212,161,0.1)", color: "#00d4a1", border: "1px solid rgba(0,212,161,0.15)" }
                        : { color: "var(--text-muted)" }
                    }
                  >
                    <Icon size={16} />
                    {lang === "ar" ? item.ar : item.en}
                  </Link>
                );
              })}
              <div
                className="pt-4 mt-4 space-y-1"
                style={{ borderTop: "1px solid var(--border-subtle)" }}
              >
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 transition-all"
                >
                  <LogOut size={15} />
                  Sign out
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
