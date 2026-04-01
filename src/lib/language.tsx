"use client";

import { createContext, useContext, useState, useLayoutEffect } from "react";

export type Lang = "en" | "ar";

interface LangContextValue {
  lang: Lang;
  toggle: () => void;
}

const LangContext = createContext<LangContextValue>({ lang: "en", toggle: () => {} });

export function LangProvider({ children }: { children: React.ReactNode }) {
  // Read localStorage synchronously on first render so there is no en→ar flash
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("espark-lang");
      if (stored === "ar" || stored === "en") return stored;
    }
    return "en";
  });

  // useLayoutEffect runs before paint → dir/lang attribute set before first pixel drawn
  useLayoutEffect(() => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang]);

  const toggle = () => {
    setLang((prev) => {
      const next: Lang = prev === "en" ? "ar" : "en";
      localStorage.setItem("espark-lang", next);
      return next;
    });
  };

  return <LangContext.Provider value={{ lang, toggle }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}
