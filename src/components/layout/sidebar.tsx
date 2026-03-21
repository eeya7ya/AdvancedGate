"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { LayoutDashboard, BookOpen, User } from "lucide-react";

const nav = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/subjects",  icon: BookOpen,         label: "Subjects"   },
  { href: "/profile",   icon: User,              label: "Profile"    },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-[#080c14] border-r border-[rgba(255,255,255,0.05)] flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[rgba(255,255,255,0.05)]">
        <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
          <Image src="/logo.png" alt="eSpark" width={28} height={28} className="object-contain" />
        </div>
        <div>
          <div className="text-white font-bold text-sm leading-tight">eSpark-Learning</div>
          <div className="text-[#4f9eff] text-[10px] font-semibold uppercase tracking-widest">KIT</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5">
        <p className="text-[#334155] text-[9px] font-bold uppercase tracking-[0.12em] px-3 mb-3 mt-2">
          Navigation
        </p>
        {nav.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                active
                  ? "bg-[rgba(79,158,255,0.1)] text-[#4f9eff] border border-[rgba(79,158,255,0.15)]"
                  : "text-[#64748b] hover:text-[#cbd5e1] hover:bg-[rgba(255,255,255,0.04)]"
              )}
            >
              <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
              {item.label}
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#4f9eff]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[rgba(255,255,255,0.05)]">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
          <span className="text-[#334155] text-[10px] font-medium">Platform v2026.1</span>
        </div>
      </div>
    </aside>
  );
}
