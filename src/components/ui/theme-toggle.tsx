"use client";

import { useTheme } from "@/lib/theme";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="relative flex items-center justify-center w-9 h-9 rounded-xl border transition-all duration-300 hover:scale-105"
      style={{
        background: theme === "dark"
          ? "rgba(0, 212, 161, 0.08)"
          : "rgba(0, 168, 130, 0.1)",
        borderColor: theme === "dark"
          ? "rgba(0, 212, 161, 0.2)"
          : "rgba(0, 168, 130, 0.25)",
        color: theme === "dark" ? "#00d4a1" : "#00a882",
      }}
    >
      <span
        className="absolute inset-0 rounded-xl opacity-0 hover:opacity-100 transition-opacity"
        style={{ background: "var(--brand-teal-glow)" }}
      />
      {theme === "dark" ? (
        <Sun size={15} strokeWidth={2} />
      ) : (
        <Moon size={15} strokeWidth={2} />
      )}
    </button>
  );
}
