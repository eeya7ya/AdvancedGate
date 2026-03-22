"use client";

import { createContext, useContext, useState, useEffect } from "react";

export type Lang = "en" | "ar";

interface LangContextValue {
  lang: Lang;
  toggle: () => void;
}

const LangContext = createContext<LangContextValue>({ lang: "en", toggle: () => {} });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    const stored = localStorage.getItem("espark-lang") as Lang | null;
    if (stored === "ar" || stored === "en") setLang(stored);
  }, []);

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
