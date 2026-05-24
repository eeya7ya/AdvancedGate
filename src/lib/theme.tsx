"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useState, useCallback } from "react";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  toggle: () => {},
});

// Run before paint on the client, but fall back to useEffect on the server so
// React doesn't warn that useLayoutEffect does nothing during SSR.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Start at the server default ("dark") so the FIRST client render matches the
  // server-rendered HTML — reading localStorage here instead would make the
  // first render diverge and throw React hydration error #418. The stored theme
  // is applied in the layout effect below, before the browser paints, so
  // returning light-mode users still don't see a dark→light flash.
  const [theme, setTheme] = useState<Theme>("dark");

  useIsomorphicLayoutEffect(() => {
    const stored = localStorage.getItem("espark-theme");
    if (stored === "light" || stored === "dark") setTheme(stored);
  }, []);

  useIsomorphicLayoutEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("espark-theme", theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
