"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { getLevelColor, getLevelTitle } from "@/lib/utils";
import { mockUserStats } from "@/lib/data";
import { useState } from "react";

const mobileNav = [
  { href: "/dashboard", icon: "⚡", label: "Dashboard" },
  { href: "/subjects", icon: "📚", label: "Subjects" },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const stats = mockUserStats;
  const levelColor = getLevelColor(stats.level);
  const levelTitle = getLevelTitle(stats.level);
  const user = session?.user;

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 lg:px-6 h-16 bg-[#0d1424]/90 backdrop-blur-xl border-b border-[rgba(255,255,255,0.06)]">
        {/* Mobile: logo */}
        <div className="flex items-center gap-3 lg:hidden">
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/10 flex items-center justify-center">
            <Image src="/logo.png" alt="eSpark" width={28} height={28} className="object-contain" />
          </div>
          <span className="text-white font-bold text-sm">eSpark KIT</span>
        </div>

        {/* Desktop: breadcrumb */}
        <div className="hidden lg:flex items-center gap-2 text-sm">
          <span className="text-[#475569]">eSpark KIT</span>
          <span className="text-[#475569]">/</span>
          <span className="text-[#f1f5f9] font-medium capitalize">
            {pathname.split("/")[1] || "Home"}
          </span>
        </div>

        {/* Right: XP + avatar */}
        <div className="flex items-center gap-3">
          {/* Level chip */}
          <div
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold"
            style={{
              backgroundColor: `${levelColor}15`,
              borderColor: `${levelColor}30`,
              color: levelColor,
            }}
          >
            <span>Lv.{stats.level}</span>
            <span className="opacity-70">{levelTitle}</span>
          </div>

          {/* XP */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(245,166,35,0.1)] border border-[rgba(245,166,35,0.2)] text-xs font-semibold text-[#f5a623]">
            <span>⚡</span>
            <span>{stats.xp.toLocaleString()} XP</span>
          </div>

          {/* Avatar dropdown */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] hover:border-[rgba(79,158,255,0.4)] transition-all"
            >
              <div className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-[#4f9eff] to-[#7c3aed] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {user?.image ? (
                  <Image
                    src={user.image}
                    alt={user.name ?? "User"}
                    width={28}
                    height={28}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  (user?.name?.[0] ?? "E").toUpperCase()
                )}
              </div>
              <span className="hidden md:block text-[#f1f5f9] text-sm font-medium max-w-[100px] truncate">
                {user?.name?.split(" ")[0] ?? "Engineer"}
              </span>
              <span className="text-[#94a3b8] text-xs">▾</span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-12 w-52 glass rounded-2xl border border-[rgba(255,255,255,0.08)] shadow-2xl overflow-hidden z-50">
                <div className="p-3 border-b border-[rgba(255,255,255,0.06)]">
                  <p className="text-[#f1f5f9] text-sm font-semibold truncate">
                    {user?.name ?? "Engineering Student"}
                  </p>
                  <p className="text-[#94a3b8] text-xs truncate">{user?.email ?? ""}</p>
                </div>
                <div className="p-2">
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-[#94a3b8] hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <span>🚪</span>
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden p-2 rounded-xl text-[#94a3b8] hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-all"
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
            className="absolute right-0 top-0 h-full w-64 bg-[#0d1424] border-l border-[rgba(255,255,255,0.06)] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-9 h-9 rounded-xl overflow-hidden bg-white/10 flex items-center justify-center">
                <Image src="/logo.png" alt="eSpark" width={32} height={32} className="object-contain" />
              </div>
              <span className="text-white font-bold">eSpark KIT</span>
            </div>
            <nav className="space-y-1">
              {mobileNav.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
                      active
                        ? "bg-[rgba(79,158,255,0.12)] text-[#4f9eff]"
                        : "text-[#94a3b8]"
                    )}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
