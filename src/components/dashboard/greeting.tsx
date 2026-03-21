"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import type { UserStats } from "@/types";

interface DashboardGreetingProps {
  stats: UserStats;
}

export function DashboardGreeting({ stats }: DashboardGreetingProps) {
  const { data: session } = useSession();
  const name = session?.user?.name?.split(" ")[0] ?? "Engineer";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <p className="text-[#94a3b8] text-sm font-medium mb-1">
          Welcome back 👋
        </p>
        <h1 className="text-2xl lg:text-3xl font-bold text-[#f1f5f9]">
          {name}&apos;s Dashboard
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[rgba(74,222,128,0.1)] border border-[rgba(74,222,128,0.2)] text-[#4ade80] text-sm font-semibold">
          <span className="text-lg">🔥</span>
          {stats.streak}-day streak
        </div>
        <Link
          href="/subjects"
          className="px-4 py-2 rounded-xl bg-[#4f9eff] hover:bg-[#2d7dd2] text-white text-sm font-semibold transition-all hover:shadow-[0_0_20px_rgba(79,158,255,0.4)]"
        >
          + Enroll New
        </Link>
      </div>
    </div>
  );
}
