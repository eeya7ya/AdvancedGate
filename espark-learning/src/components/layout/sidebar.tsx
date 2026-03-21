"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", icon: "⚡", label: "Dashboard" },
  { href: "/subjects", icon: "📚", label: "Subjects" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-[#0d1424] border-r border-[rgba(255,255,255,0.06)] flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-[rgba(255,255,255,0.06)]">
        <div className="w-9 h-9 rounded-xl overflow-hidden bg-white/10 flex items-center justify-center flex-shrink-0">
          <Image src="/logo.png" alt="eSpark" width={32} height={32} className="object-contain" />
        </div>
        <div>
          <div className="text-white font-bold text-sm leading-tight">eSpark-Learning</div>
          <div className="text-[#4f9eff] text-[10px] font-medium uppercase tracking-wide">KIT</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        <p className="text-[#475569] text-[10px] font-semibold uppercase tracking-widest px-3 mb-3">
          Navigation
        </p>
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                active
                  ? "bg-[rgba(79,158,255,0.12)] text-[#4f9eff] border border-[rgba(79,158,255,0.2)]"
                  : "text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-[rgba(255,255,255,0.05)]"
              )}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#4f9eff]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom info */}
      <div className="p-4 border-t border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse" />
          <span className="text-[#475569] text-xs">Platform v2026.1</span>
        </div>
      </div>
    </aside>
  );
}
