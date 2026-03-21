import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "gold" | "blue" | "green" | "purple" | "outline";
  className?: string;
}

export function Badge({
  children,
  variant = "default",
  className,
}: BadgeProps) {
  const variants = {
    default: "bg-[rgba(255,255,255,0.08)] text-[#94a3b8]",
    gold: "bg-[rgba(245,166,35,0.15)] text-[#f5a623] border border-[rgba(245,166,35,0.3)]",
    blue: "bg-[rgba(79,158,255,0.15)] text-[#4f9eff] border border-[rgba(79,158,255,0.3)]",
    green:
      "bg-[rgba(74,222,128,0.15)] text-[#4ade80] border border-[rgba(74,222,128,0.3)]",
    purple:
      "bg-[rgba(167,139,250,0.15)] text-[#a78bfa] border border-[rgba(167,139,250,0.3)]",
    outline:
      "bg-transparent border border-[rgba(255,255,255,0.12)] text-[#94a3b8]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
