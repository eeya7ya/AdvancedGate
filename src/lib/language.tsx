"use client";

import { createContext, useContext, useState, useEffect, useLayoutEffect } from "react";

export type Lang = "en" | "ar";

interface LangContextValue {
  lang: Lang;
  toggle: () => void;
}

const LangContext = createContext<LangContextValue>({ lang: "en", toggle: () => {} });

// Run before paint on the client, but fall back to useEffect on the server so
// React doesn't warn that useLayoutEffect does nothing during SSR.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function LangProvider({ children }: { children: React.ReactNode }) {
  // Start as "en" so the FIRST client render matches the server-rendered HTML —
  // reading localStorage here instead would make the first render diverge and
  // throw React hydration error #418. The stored language is applied in the
  // layout effect below, before the browser paints, so there's no en→ar flash.
  const [lang, setLang] = useState<Lang>("en");

  useIsomorphicLayoutEffect(() => {
    const stored = localStorage.getItem("espark-lang");
    if (stored === "ar" || stored === "en") setLang(stored);
  }, []);

  // Keep the document dir/lang attribute in sync (before paint).
  useIsomorphicLayoutEffect(() => {
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
