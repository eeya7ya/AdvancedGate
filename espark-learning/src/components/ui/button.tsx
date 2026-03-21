"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "google" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const base =
      "inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

    const variants = {
      primary:
        "bg-[#4f9eff] hover:bg-[#2d7dd2] text-white shadow-lg hover:shadow-[0_0_20px_rgba(79,158,255,0.4)] focus-visible:ring-[#4f9eff]",
      secondary:
        "bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.12)] text-[#f1f5f9] border border-[rgba(255,255,255,0.12)] hover:border-[rgba(79,158,255,0.4)] focus-visible:ring-[#4f9eff]",
      ghost:
        "bg-transparent hover:bg-[rgba(255,255,255,0.06)] text-[#94a3b8] hover:text-[#f1f5f9] focus-visible:ring-[#4f9eff]",
      google:
        "bg-white hover:bg-gray-50 text-gray-800 shadow-lg hover:shadow-xl border border-gray-200 focus-visible:ring-gray-400",
      danger:
        "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40 focus-visible:ring-red-500",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm h-8",
      md: "px-5 py-2.5 text-sm h-10",
      lg: "px-7 py-3 text-base h-12",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export { Button };
