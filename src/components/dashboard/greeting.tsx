"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function DashboardGreeting() {
  const { data: session } = useSession();
  const name = session?.user?.name?.split(" ")[0] ?? "Engineer";

  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <p className="text-[#475569] text-xs font-semibold uppercase tracking-widest mb-1">
          Welcome back
        </p>
        <h1 className="text-3xl lg:text-4xl font-bold text-[#f1f5f9] tracking-tight">
          {name}&apos;s Dashboard
        </h1>
      </div>
      <Link
        href="/subjects"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white text-sm font-semibold transition-all hover:shadow-[0_0_24px_rgba(249,115,22,0.4)]"
      >
        Browse Courses
        <ArrowRight size={15} />
      </Link>
    </div>
  );
}
