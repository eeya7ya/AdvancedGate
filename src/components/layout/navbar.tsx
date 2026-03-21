"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { getLevelColor, getLevelTitle } from "@/lib/utils";
import { useState, useEffect } from "react";
import { LogOut, User, Zap, TrendingUp, LayoutDashboard, BookOpen } from "lucide-react";
import type { UserStats } from "@/types";

const mobileNav = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/subjects",  icon: BookOpen,         label: "Subjects"  },
  { href: "/profile",   icon: User,              label: "Profile"   },
];

const BREADCRUMB_MAP: Record<string, string> = {
  dashboard: "Dashboard",
  subjects: "Subjects",
  learn: "Course",
  profile: "Profile",
};

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(null);
  const user = session?.user;

  useEffect(() => {
    if (!user?.id) return;
    fetch("/api/user/stats")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setStats(data); })
      .catch(() => {});
  }, [user?.id]);

  const levelColor = stats ? getLevelColor(stats.level) : "#4f9eff";
  const levelTitle = stats ? getLevelTitle(stats.level) : null;
  const segment = pathname.split("/")[1] || "dashboard";
  const crumb = BREADCRUMB_MAP[segment] ?? segment;

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 lg:px-6 h-16 bg-[#080c14]/95 backdrop-blur-xl border-b border-[rgba(255,255,255,0.05)]">
        {/* Mobile logo */}
        <div className="flex items-center gap-3 lg:hidden">
          <div className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center">
            <Image src="/logo.png" alt="eSpark" width={24} height={24} className="object-contain" />
          </div>
          <span className="text-white font-bold text-sm">eSpark KIT</span>
        </div>

        {/* Desktop breadcrumb */}
        <div className="hidden lg:flex items-center gap-2 text-sm">
          <span className="text-[#334155] text-xs">eSpark KIT</span>
          <span className="text-[#1e293b]">/</span>
          <span className="text-[#94a3b8] text-sm font-medium">{crumb}</span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2.5">
          {/* Level chip */}
          {stats && (
            <div
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold"
              style={{ backgroundColor: `${levelColor}12`, borderColor: `${levelColor}25`, color: levelColor }}
            >
              <TrendingUp size={11} />
              <span>Lv.{stats.level}</span>
              {levelTitle && <span className="opacity-60">{levelTitle}</span>}
            </div>
          )}

          {/* XP chip */}
          {stats && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(245,166,35,0.08)] border border-[rgba(245,166,35,0.18)] text-xs font-semibold text-[#f5a623]">
              <Zap size={11} />
              <span>{stats.xp.toLocaleString()} XP</span>
            </div>
          )}

          {/* Avatar + dropdown */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(79,158,255,0.3)] transition-all"
            >
              <div className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-[#4f9eff] to-[#7c3aed] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {user?.image ? (
                  <Image src={user.image} alt={user.name ?? "User"} width={28} height={28} className="object-cover w-full h-full" />
                ) : (
                  (user?.name?.[0] ?? "E").toUpperCase()
                )}
              </div>
              <span className="hidden md:block text-[#cbd5e1] text-sm font-medium max-w-[100px] truncate">
                {user?.name?.split(" ")[0] ?? "Engineer"}
              </span>
              <svg className="w-3 h-3 text-[#475569]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-12 w-52 rounded-2xl bg-[#0d1424] border border-[rgba(255,255,255,0.08)] shadow-2xl overflow-hidden z-50">
                <div className="p-3 border-b border-[rgba(255,255,255,0.05)]">
                  <p className="text-[#f1f5f9] text-sm font-semibold truncate">{user?.name ?? "Engineering Student"}</p>
                  <p className="text-[#475569] text-xs truncate">{user?.email ?? ""}</p>
                </div>
                <div className="p-2 space-y-0.5">
                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-[rgba(255,255,255,0.05)] transition-all"
                  >
                    <User size={14} />
                    Profile
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-[#94a3b8] hover:text-red-400 hover:bg-red-500/8 transition-all"
                  >
                    <LogOut size={14} />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden p-2 rounded-xl text-[#64748b] hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-all"
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
        <div className="lg:hidden fixed inset-0 z-30 bg-black/70 backdrop-blur-sm" onClick={() => setMenuOpen(false)}>
          <div
            className="absolute right-0 top-0 h-full w-64 bg-[#0d1424] border-l border-[rgba(255,255,255,0.06)] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-8">
              <Image src="/logo.png" alt="eSpark" width={28} height={28} className="object-contain" />
              <span className="text-white font-bold text-sm">eSpark KIT</span>
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
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
                      active ? "bg-[rgba(79,158,255,0.1)] text-[#4f9eff]" : "text-[#64748b] hover:text-[#cbd5e1]"
                    )}
                  >
                    <Icon size={16} />
                    {item.label}
                  </Link>
                );
              })}
              <div className="pt-4 mt-4 border-t border-[rgba(255,255,255,0.06)] space-y-1">
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#64748b] hover:text-red-400 transition-all"
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
