"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { LayoutDashboard, BookOpen, User, Brain } from "lucide-react";

const nav = [
  { href: "/dashboard", icon: LayoutDashboard, label: "AI Dashboard" },
  { href: "/subjects",  icon: BookOpen,         label: "Subjects"    },
  { href: "/profile",   icon: User,              label: "Profile"     },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="hidden lg:flex flex-col w-60 min-h-screen flex-shrink-0"
      style={{
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border-subtle)",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-5 py-5"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
          <Image src="/logo.png" alt="eSpark" width={28} height={28} className="object-contain" />
        </div>
        <div>
          <div className="font-bold text-sm leading-tight" style={{ color: "var(--text-primary)" }}>
            eSpark AI
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--brand-teal)" }}>
            Workspace
          </div>
        </div>
      </div>

      {/* AI badge */}
      <div className="px-4 pt-4 pb-1">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{
            background: "rgba(0,212,161,0.06)",
            border: "1px solid rgba(0,212,161,0.15)",
          }}
        >
          <div
            className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #00d4a1, #22d3ee)" }}
          >
            <Brain size={11} className="text-white" />
          </div>
          <span className="text-xs font-semibold" style={{ color: "#00d4a1" }}>
            AI-Powered Advisor
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5">
        <p
          className="text-[9px] font-bold uppercase tracking-[0.12em] px-3 mb-3 mt-3"
          style={{ color: "var(--text-muted)" }}
        >
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
              )}
              style={
                active
                  ? {
                      background: "rgba(0, 212, 161, 0.1)",
                      color: "#00d4a1",
                      border: "1px solid rgba(0, 212, 161, 0.15)",
                    }
                  : {
                      color: "var(--text-muted)",
                      border: "1px solid transparent",
                    }
              }
            >
              <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
              {item.label}
              {active && (
                <span
                  className="ml-auto w-1.5 h-1.5 rounded-full"
                  style={{ background: "#00d4a1" }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#00d4a1" }} />
          <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
            Platform v2026.1
          </span>
        </div>
      </div>
    </aside>
  );
}
