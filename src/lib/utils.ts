import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getLevelTitle(level: number): string {
  if (level < 5) return "Apprentice";
  if (level < 10) return "Practitioner";
  if (level < 20) return "Engineer";
  if (level < 35) return "Senior Engineer";
  if (level < 50) return "Principal Engineer";
  return "Distinguished Engineer";
}

export function getLevelColor(level: number): string {
  if (level < 5) return "#94a3b8";
  if (level < 10) return "#4ade80";
  if (level < 20) return "#f97316";
  if (level < 35) return "#a78bfa";
  if (level < 50) return "#f5a623";
  return "#ef4444";
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
