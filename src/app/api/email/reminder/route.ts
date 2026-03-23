import { auth } from "~/auth";
import { getUserRoadmap, getScheduleTracking, logEmailReminder, getLastReminderSent } from "@/lib/db";
import { NextResponse } from "next/server";

// POST: Trigger a reminder check for the current user
// In production, this would be called by a cron job (e.g., Vercel Cron)
// For now, the client can call it periodically to check if reminders are needed
export async function POST() {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roadmap = await getUserRoadmap(session.user.id);
  if (!roadmap || !roadmap.emailRemindersEnabled || !roadmap.reminderEmail) {
    return NextResponse.json({ reminder: false, reason: "reminders_disabled" });
  }

  // Check if we already sent a reminder today
  const lastSent = await getLastReminderSent(session.user.id, "study_reminder");
  if (lastSent) {
    const lastDate = new Date(lastSent).toISOString().split("T")[0];
    const today = new Date().toISOString().split("T")[0];
    if (lastDate === today) {
      return NextResponse.json({ reminder: false, reason: "already_sent_today" });
    }
  }

  // Check if user has completed today's tasks
  const today = new Date().toISOString().split("T")[0];
  const tracking = await getScheduleTracking(session.user.id, today, today);
  const hasCompletedToday = tracking.some((t) => t.completed);

  if (hasCompletedToday) {
    return NextResponse.json({ reminder: false, reason: "already_studied" });
  }

  // User hasn't studied today — send reminder
  const email = roadmap.reminderEmail;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plan = roadmap.planJson as any;
  const userName = plan?.profile?.name ?? "Learner";
  const todayFocus = plan?.todaysFocus?.topic ?? "your learning goals";

  // Log the reminder attempt
  await logEmailReminder(session.user.id, "study_reminder");

  // Build the email content (in production, use Resend/SendGrid/etc.)
  const emailContent = {
    to: email,
    subject: `eSpark Reminder: Don't forget your study session today!`,
    body: `Hi ${userName},\n\nThis is a friendly reminder that you haven't completed your study session today.\n\nToday's Focus: ${todayFocus}\n\nStaying consistent is key to achieving your goals. Even 30 minutes of focused study makes a difference!\n\nKeep going — you're building something amazing.\n\n— Your eSpark AI Advisor`,
  };

  // In production, integrate with email service here:
  // await sendEmail(emailContent);

  return NextResponse.json({
    reminder: true,
    emailContent,
    message: "Reminder queued. Configure SMTP/Resend to send actual emails.",
  });
}

// GET: Check reminder status and recent logs
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roadmap = await getUserRoadmap(session.user.id);
  const lastStudyReminder = await getLastReminderSent(session.user.id, "study_reminder");
  const lastAchievement = await getLastReminderSent(session.user.id, "achievement");

  return NextResponse.json({
    emailRemindersEnabled: roadmap?.emailRemindersEnabled ?? false,
    reminderEmail: roadmap?.reminderEmail ?? null,
    lastStudyReminder,
    lastAchievement,
  });
}
