"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Map, User, Brain, Sparkles, Terminal, CalendarDays, TrendingUp, Zap, FileText } from "lucide-react";
import { useSession } from "next-auth/react";
import { useLang } from "@/lib/language";

interface NavItem {
  href: string;
  icon: React.ElementType;
  en: string;
  ar: string;
  adminOnly?: boolean;
}

const nav: NavItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, en: "Dashboard",        ar: "لوحة التحكم"   },
  { href: "/analysis",  icon: TrendingUp,      en: "Advice Analysis",  ar: "تحليل النصائح" },
  { href: "/roadmap",   icon: Map,              en: "My Roadmap",       ar: "خارطة طريقي"  },
  { href: "/schedule",  icon: CalendarDays,     en: "Schedule",         ar: "جدولي"         },
  { href: "/quotations",icon: FileText,         en: "Quotations",       ar: "عروض الأسعار" },
  { href: "/profile",   icon: User,             en: "Profile",          ar: "الملف الشخصي" },
  { href: "/pricing",   icon: Zap,              en: "Upgrade / Quota",  ar: "الترقية / الحصة" },
  { href: "/console",   icon: Terminal,         en: "Console",          ar: "وحدة التحكم",  adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { lang, toggle: toggleLang } = useLang();
  const { data: session } = useSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isUserAdmin = (session?.user as any)?.isAdmin === true;

  return (
    <aside
      dir={lang === "ar" ? "rtl" : "ltr"}
      className="hidden lg:flex flex-col w-60 h-screen sticky top-0 flex-shrink-0 overflow-y-auto"
      style={{
        background: "linear-gradient(180deg, #0d0700 0%, #150900 100%)",
        borderInlineEnd: "1px solid rgba(249,115,22,0.12)",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-5 py-5"
        style={{ borderBottom: "1px solid rgba(249,115,22,0.1)" }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, #f97316, #fb923c)",
            boxShadow: "0 0 16px rgba(249,115,22,0.35)",
          }}
        >
          <Brain size={18} className="text-white" strokeWidth={2} />
        </div>
        <div>
          <div className="font-bold text-sm leading-tight text-white">
            eSpark AI
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#f97316" }}>
            Workspace
          </div>
        </div>
      </div>

      {/* AI badge */}
      <div className="px-4 pt-4 pb-1">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{
            background: "rgba(249,115,22,0.08)",
            border: "1px solid rgba(249,115,22,0.2)",
          }}
        >
          <div
            className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #f97316, #fb923c)" }}
          >
            <Sparkles size={11} className="text-white" />
          </div>
          <span className="text-xs font-semibold" style={{ color: "#f97316" }}>
            eSpark AI
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 mt-2">
        <p
          className="text-[9px] font-bold uppercase tracking-[0.12em] px-3 mb-3"
          style={{ color: "rgba(255,255,255,0.3)" }}
        >
          {lang === "ar" ? "التنقل" : "Navigation"}
        </p>
        {nav.filter((item) => !item.adminOnly || isUserAdmin).map((item) => {
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
                      background: "rgba(249,115,22,0.15)",
                      color: "#ffffff",
                      border: "1px solid rgba(249,115,22,0.3)",
                      boxShadow: "0 2px 12px rgba(249,115,22,0.15)",
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
                style={{ color: active ? "#f97316" : "rgba(255,255,255,0.45)" }}
              />
              {lang === "ar" ? item.ar : item.en}
              {active && (
                <span
                  className="ms-auto w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: "#f97316", boxShadow: "0 0 6px #f97316" }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 space-y-3" style={{ borderTop: "1px solid rgba(249,115,22,0.08)" }}>
        {/* Language toggle */}
        <button
          onClick={toggleLang}
          title={lang === "en" ? "Switch to Arabic" : "التبديل إلى الإنجليزية"}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all hover:opacity-80"
          style={{
            background: "rgba(249,115,22,0.08)",
            border: "1px solid rgba(249,115,22,0.2)",
          }}
        >
          <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>
            {lang === "en" ? "Language" : "اللغة"}
          </span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ background: "rgba(249,115,22,0.15)", color: "#f97316" }}>
            {lang === "en" ? "عربي" : "EN"}
          </span>
        </button>

        <div className="flex items-center gap-2 px-2 py-1.5">
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: "#f97316", boxShadow: "0 0 6px #f97316" }}
          />
          <span className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.3)" }}>
            Beta v1.0A
          </span>
        </div>
      </div>
    </aside>
  );
}
