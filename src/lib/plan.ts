// Shared plan validator. Server pages (roadmap, schedule, analysis, profile)
// hand the stored planJson blob straight to client components — a malformed
// blob from an earlier broken generation would tear the page down on render.
// Call isValidPlan(plan) before rendering and fall through to the "no plan"
// state if it returns false.
export function isValidPlan(x: unknown): boolean {
  if (!x || typeof x !== "object") return false;
  const p = x as Record<string, unknown>;
  if (p.type !== "LEARNING_PLAN") return false;

  const profile = p.profile as Record<string, unknown> | undefined;
  if (!profile || typeof profile.name !== "string" || typeof profile.summary !== "string") return false;

  const tf = p.todaysFocus as Record<string, unknown> | undefined;
  if (!tf || typeof tf.topic !== "string" || typeof tf.reason !== "string" ||
      typeof tf.duration !== "string" || typeof tf.action !== "string") return false;

  if (!Array.isArray(p.priorities)) return false;
  for (const item of p.priorities) {
    if (!item || typeof item !== "object") return false;
    const pr = item as Record<string, unknown>;
    if (typeof pr.topic !== "string") return false;
  }

  if (!Array.isArray(p.timeAllocation)) return false;
  if (!Array.isArray(p.topicConnections)) return false;
  if (!Array.isArray(p.nextSteps)) return false;

  return true;
}
