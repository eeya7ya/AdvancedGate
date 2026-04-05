import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  trackClassName?: string;
  color?: "blue" | "gold" | "green" | "purple";
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Progress({
  value,
  max = 100,
  className,
  trackClassName,
  color = "blue",
  showLabel,
  size = "md",
}: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  const colors = {
    blue: "bg-[#f97316]",
    gold: "bg-[#f5a623]",
    green: "bg-[#4ade80]",
    purple: "bg-[#a78bfa]",
  };

  const heights = {
    sm: "h-1",
    md: "h-2",
    lg: "h-3",
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "w-full rounded-full bg-[rgba(255,255,255,0.08)] overflow-hidden",
          heights[size],
          trackClassName
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700 ease-out",
            colors[color]
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-[#94a3b8] mt-1 text-right">{Math.round(pct)}%</p>
      )}
    </div>
  );
}
