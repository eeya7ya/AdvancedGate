/**
 * In-memory runtime store for API budget and course link cache.
 * All data lives in process memory — it resets automatically on every server restart.
 * This is intentional: each restart gives a fresh $0.70 budget and forces
 * fresh course-link lookups via Claude.
 */

const DAILY_BUDGET_USD = 0.70;

let budgetSpent = 0;

export function getRuntimeSpent(): number {
  return budgetSpent;
}

export function addRuntimeCost(amount: number): void {
  budgetSpent += amount;
}

export function isBudgetExhausted(): boolean {
  return budgetSpent >= DAILY_BUDGET_USD;
}

export { DAILY_BUDGET_USD };

// ── Course link cache ──────────────────────────────────────────────────────
const linkCache = new Map<string, string>();

export function getCachedLink(key: string): string | null {
  return linkCache.get(key) ?? null;
}

export function setCachedLink(key: string, url: string): void {
  linkCache.set(key, url);
}
