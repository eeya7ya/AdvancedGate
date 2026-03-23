"use client";

import { useLang } from "@/lib/language";

export function AppLayoutClient({ children }: { children: React.ReactNode }) {
  const { lang } = useLang();
  return (
    <div
      className="flex min-h-screen"
      dir={lang === "ar" ? "rtl" : "ltr"}
      style={{ background: "var(--bg-base)" }}
    >
      {children}
    </div>
  );
}
