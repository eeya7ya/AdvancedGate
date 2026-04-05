import { auth } from "~/auth";
import { getUserRoadmap, getScheduleTracking } from "@/lib/db";
import { ScheduleClient } from "./schedule-client";
import Link from "next/link";
import { Brain, ArrowRight } from "lucide-react";

export default async function SchedulePage() {
  const session = await auth();
  const userId = session?.user?.id;
  const roadmapData = userId ? await getUserRoadmap(userId) : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plan = roadmapData?.planJson as any ?? null;

  if (!plan) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
          style={{ background: "linear-gradient(135deg, #f97316, #fb923c)", boxShadow: "0 0 40px rgba(249,115,22,0.3)" }}
        >
          <Brain size={36} className="text-white" strokeWidth={1.5} />
        </div>
        <h1 className="text-3xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>
          No Schedule Yet
        </h1>
        <p className="text-base mb-8 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Start a session with your AI Advisor to generate a personalized learning schedule.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg, #f97316, #fb923c)", boxShadow: "0 0 32px rgba(249,115,22,0.35)" }}
        >
          <Brain size={16} />
          Start AI Session
          <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  // Fetch tracking data for the current month range
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString().split("T")[0];
  const tracking = userId ? await getScheduleTracking(userId, startDate, endDate) : [];

  const emailSettings = {
    emailRemindersEnabled: roadmapData?.emailRemindersEnabled ?? false,
    reminderEmail: roadmapData?.reminderEmail ?? "",
  };

  return <ScheduleClient plan={plan} initialTracking={tracking} emailSettings={emailSettings} />;
}
