/**
 * In-memory course link cache for fast repeat lookups within a session.
 * Resets on server restart, which is fine — Claude simply re-fetches.
 * Budget tracking is per-user in the database (see db.ts).
 */
const linkCache = new Map<string, string>();

export function getCachedLink(key: string): string | null {
  return linkCache.get(key) ?? null;
}

export function setCachedLink(key: string, url: string): void {
  linkCache.set(key, url);
}
