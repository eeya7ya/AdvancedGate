"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Map, User, Brain, Sparkles, Terminal } from "lucide-react";

const nav = [
  { href: "/dashboard", icon: LayoutDashboard, label: "AI Advisor"  },
  { href: "/roadmap",   icon: Map,              label: "My Roadmap"  },
  { href: "/profile",   icon: User,             label: "Profile"     },
  { href: "/console",   icon: Terminal,         label: "Console"     },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="hidden lg:flex flex-col w-60 min-h-screen flex-shrink-0"
      style={{
        background: "linear-gradient(180deg, #0a1628 0%, #0d2a1e 100%)",
        borderRight: "1px solid rgba(0,212,161,0.12)",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-5 py-5"
        style={{ borderBottom: "1px solid rgba(0,212,161,0.1)" }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, #00d4a1, #22d3ee)",
            boxShadow: "0 0 16px rgba(0,212,161,0.35)",
          }}
        >
          <Brain size={18} className="text-white" strokeWidth={2} />
        </div>
        <div>
          <div className="font-bold text-sm leading-tight text-white">
            eSpark AI
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#00d4a1" }}>
            Workspace
          </div>
        </div>
      </div>

      {/* AI badge */}
      <div className="px-4 pt-4 pb-1">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{
            background: "rgba(0,212,161,0.08)",
            border: "1px solid rgba(0,212,161,0.2)",
          }}
        >
          <div
            className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #00d4a1, #22d3ee)" }}
          >
            <Sparkles size={11} className="text-white" />
          </div>
          <span className="text-xs font-semibold" style={{ color: "#00d4a1" }}>
            AI-Powered Advisor
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 mt-2">
        <p
          className="text-[9px] font-bold uppercase tracking-[0.12em] px-3 mb-3"
          style={{ color: "rgba(255,255,255,0.3)" }}
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
                      background: "rgba(0,212,161,0.15)",
                      color: "#ffffff",
                      border: "1px solid rgba(0,212,161,0.3)",
                      boxShadow: "0 2px 12px rgba(0,212,161,0.15)",
                    }
                  : {
                      color: "rgba(255,255,255,0.55)",
                      border: "1px solid transparent",
                    }
              }
            >
              <Icon
                size={16}
                strokeWidth={active ? 2.2 : 1.8}
                style={{ color: active ? "#00d4a1" : "rgba(255,255,255,0.45)" }}
              />
              {item.label}
              {active && (
                <span
                  className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: "#00d4a1", boxShadow: "0 0 6px #00d4a1" }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4" style={{ borderTop: "1px solid rgba(0,212,161,0.08)" }}>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: "#00d4a1", boxShadow: "0 0 6px #00d4a1" }}
          />
          <span className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.3)" }}>
            Platform v2026.1
          </span>
        </div>
      </div>
    </aside>
  );
}
