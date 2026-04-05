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
          ? "rgba(249, 115, 22, 0.08)"
          : "rgba(249, 115, 22, 0.1)",
        borderColor: theme === "dark"
          ? "rgba(249, 115, 22, 0.2)"
          : "rgba(249, 115, 22, 0.25)",
        color: theme === "dark" ? "#f97316" : "#ea580c",
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
