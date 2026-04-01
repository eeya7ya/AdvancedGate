import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "~/auth";
import { getCachedCourseLink, setCachedCourseLink, getApiSpent, addApiCost } from "@/lib/db";

// Daily budget cap in USD
const DAILY_BUDGET_USD = 0.70;

// Claude Sonnet 4.6 pricing
const COST_PER_INPUT_TOKEN  = 3    / 1_000_000; // $3 / MTok
const COST_PER_OUTPUT_TOKEN = 15   / 1_000_000; // $15 / MTok
const COST_PER_WEB_SEARCH   = 10   / 1_000;     // $10 / 1k searches

function calcCost(inputTokens: number, outputTokens: number, webSearches: number): number {
  return (
    inputTokens  * COST_PER_INPUT_TOKEN +
    outputTokens * COST_PER_OUTPUT_TOKEN +
    webSearches  * COST_PER_WEB_SEARCH
  );
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/* ── URL helpers ─────────────────────────────────────────────────────── */

function isCoursePage(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    const path = u.pathname.toLowerCase();

    if (host === "youtube.com" || host === "youtu.be") {
      return path.includes("/watch") || path.includes("/playlist") || host === "youtu.be";
    }
    if (host === "coursera.org")  return path.includes("/learn/") || path.includes("/specializations/") || path.includes("/professional-certificates/");
    if (host === "udemy.com")     return path.includes("/course/");
    if (host === "edx.org")       return path.includes("/course/") || path.includes("/professional-certificate/");
    if (host === "linkedin.com")  return path.includes("/learning/");
    if (host === "freecodecamp.org") return path.includes("/learn/") || path.includes("/certification/");
    if (host === "khanacademy.org")  return path.length > 5;
    if (host === "pluralsight.com")  return path.includes("/courses/") || path.includes("/paths/");
    if (host === "udacity.com")      return path.includes("/course/") || path.includes("/nanodegree/");
    if (host === "skillshare.com")   return path.includes("/en/classes/");
    if (host === "codecademy.com")   return path.includes("/learn/") || path.includes("/courses/");
    if (host.includes("cisco.com") || host === "netacad.com")         return path.length > 5;
    if (host === "learn.microsoft.com" || host.includes("microsoft.com")) return path.length > 5;
    if (host.includes("aws.amazon.com") || host === "skillbuilder.aws")   return path.length > 5;
    if (host.includes("google.com") || host === "cloudskillsboost.google") return path.length > 5;

    return path.length > 3 && path !== "/";
  } catch {
    return false;
  }
}

// Official product/technology sites — ranked above general educational platforms
const OFFICIAL_DOMAINS = new Set([
  "python.org", "docs.python.org",
  "react.dev", "reactjs.org",
  "vuejs.org", "angular.io",
  "nodejs.org", "developer.mozilla.org",
  "docs.microsoft.com", "learn.microsoft.com",
  "developer.apple.com", "developer.android.com",
  "developers.google.com", "cloud.google.com", "cloudskillsboost.google",
  "docs.aws.amazon.com", "skillbuilder.aws",
  "kubernetes.io", "docker.com", "docs.docker.com",
  "tensorflow.org", "pytorch.org", "keras.io",
  "php.net", "ruby-lang.org", "go.dev", "golang.org", "rust-lang.org",
  "swift.org", "kotlinlang.org", "typescriptlang.org",
  "netacad.com", "cisco.com",
  "oracle.com", "docs.oracle.com",
  "linux.org", "kernel.org",
  "git-scm.com", "github.com",
  "postgresql.org", "mysql.com", "mongodb.com", "redis.io",
]);

function isOfficial(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return OFFICIAL_DOMAINS.has(host) ||
      [...OFFICIAL_DOMAINS].some((d) => host.endsWith("." + d));
  } catch { return false; }
}

// YouTube — used for free tier ranking
function isYouTube(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return host === "youtube.com" || host === "youtu.be";
  } catch { return false; }
}

const TRUSTED_PLATFORMS = new Set([
  "coursera.org", "udemy.com", "edx.org", "linkedin.com",
  "freecodecamp.org", "khanacademy.org", "pluralsight.com",
  "skillshare.com", "udacity.com", "codecademy.com",
  "cisco.com", "netacad.com", "learn.microsoft.com", "microsoft.com",
  "aws.amazon.com", "skillbuilder.aws", "cloud.google.com",
  "cloudskillsboost.google", "comptia.org", "vmware.com",
  "paloaltonetworks.com", "juniper.net", "redhat.com", "oracle.com",
]);

function isTrusted(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return TRUSTED_PLATFORMS.has(host) ||
      [...TRUSTED_PLATFORMS].some((p) => host.endsWith("." + p));
  } catch { return false; }
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    const path = u.pathname.toLowerCase().replace(/\/$/, "");
    // Keep YouTube ?v= param — it IS the video identity
    const query = host === "youtube.com" && u.searchParams.has("v")
      ? `?v=${u.searchParams.get("v")}` : "";
    return `${host}${path}${query}`;
  } catch { return url; }
}

/* ── Google search fallback ──────────────────────────────────────────── */
function platformSearchUrl(title: string, platform: string): string {
  const site = (() => {
    const p = platform.toLowerCase();
    if (p.includes("udemy"))           return "site:udemy.com";
    if (p.includes("coursera"))        return "site:coursera.org";
    if (p.includes("edx"))             return "site:edx.org";
    if (p.includes("youtube"))         return "site:youtube.com";
    if (p.includes("freecodecamp"))    return "site:freecodecamp.org";
    if (p.includes("linkedin"))        return "site:linkedin.com/learning";
    if (p.includes("pluralsight"))     return "site:pluralsight.com";
    if (p.includes("udacity"))         return "site:udacity.com";
    if (p.includes("codecademy"))      return "site:codecademy.com";
    if (p.includes("cisco") || p.includes("netacad")) return "site:netacad.com OR site:cisco.com";
    if (p.includes("microsoft"))       return "site:learn.microsoft.com";
    if (p.includes("aws") || p.includes("amazon"))    return "site:skillbuilder.aws OR site:aws.amazon.com";
    if (p.includes("google cloud") || p.includes("gcp")) return "site:cloudskillsboost.google";
    return "";
  })();

  const q = [title, "enroll course", site].filter(Boolean).join(" ");
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

/* ── Claude Sonnet 4.6 web search ────────────────────────────────────── */
async function findCourseLink(title: string, platform: string, instructor: string): Promise<{ urls: string[]; cost: number }> {
  const query = [title, instructor, platform].filter(Boolean).join(" ");

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (anthropic.messages.create as any)({
      model: "claude-sonnet-4-6",
      max_tokens: 128,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 1 }],
      system: "You find course URLs. Do ONE search. Reply with only the bare URL, nothing else.",
      messages: [{ role: "user", content: `Find the enrollment or watch URL for this course: ${query}` }],
    }) as Anthropic.Message;

    const urls: string[] = [];
    let webSearchCount = 0;

    for (const block of response.content ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const b = block as any;

      // URLs from web_search_tool_result blocks (Anthropic built-in tool results)
      if (b.type === "web_search_tool_result") {
        webSearchCount++;
        const content = b.content;
        if (Array.isArray(content)) {
          for (const item of content) {
            if (item.url) urls.push(item.url.replace(/[.,;:!?)]+$/, ""));
          }
        }
      }

      // URLs cited inline in Claude's text response
      if (b.type === "text") {
        const urlRegex = /https?:\/\/[^\s"'<>\])}]+/g;
        for (const u of (b.text as string).match(urlRegex) ?? []) {
          const clean = u.replace(/[.,;:!?)]+$/, "");
          if (!urls.includes(clean)) urls.push(clean);
        }
      }
    }

    const cost = calcCost(
      response.usage?.input_tokens ?? 0,
      response.usage?.output_tokens ?? 0,
      webSearchCount,
    );

    return { urls, cost };
  } catch (err) {
    console.error("[course-link] Claude search error:", err);
    return { urls: [], cost: 0 };
  }
}

/* ── Main handler ─────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ url: "" }, { status: 401 });

  let title: string, platform: string, instructor: string;
  try {
    const body = await req.json();
    title      = (body.title      ?? "").trim();
    platform   = (body.platform   ?? "").trim();
    instructor = (body.instructor ?? "").trim();
  } catch {
    return NextResponse.json({ url: "" }, { status: 400 });
  }

  if (!title) return NextResponse.json({ url: "" });

  // Cache key is based on title + platform (instructor is secondary, skip to maximise hits)
  const cacheKey = `${title.toLowerCase()}|${platform.toLowerCase()}`;
  const cached = await getCachedCourseLink(cacheKey);
  if (cached) {
    console.log(`[course-link] cache hit: "${title}" → ${cached}`);
    return NextResponse.json({ url: cached });
  }

  // Budget guard — check before spending
  const spent = await getApiSpent();
  if (spent >= DAILY_BUDGET_USD) {
    console.warn(`[course-link] daily budget exhausted ($${spent.toFixed(4)} / $${DAILY_BUDGET_USD})`);
    return NextResponse.json({ url: "", quota_exceeded: true });
  }

  const { urls: allUrls, cost } = await findCourseLink(title, platform, instructor);

  // Record cost immediately after the call
  if (cost > 0) await addApiCost(cost);

  // De-duplicate by normalised URL
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const url of allUrls) {
    const norm = normalizeUrl(url);
    if (!seen.has(norm)) {
      seen.add(norm);
      deduped.push(url);
    }
  }

  // Priority: official site course page → official site → trusted (non-YT) course page →
  //           trusted course page (incl. YT) → any course page → YT → first URL
  const best =
    deduped.find((u) => isOfficial(u) && isCoursePage(u)) ??
    deduped.find((u) => isOfficial(u)) ??
    deduped.find((u) => isTrusted(u) && isCoursePage(u) && !isYouTube(u)) ??
    deduped.find((u) => isTrusted(u) && isCoursePage(u)) ??
    deduped.find((u) => isCoursePage(u)) ??
    deduped.find((u) => isYouTube(u)) ??
    deduped[0] ??
    "";

  // Fall back to a Google search if nothing was found
  const finalUrl = best || platformSearchUrl(title, platform);

  // Persist to cache so future requests skip Claude entirely
  if (finalUrl) await setCachedCourseLink(cacheKey, finalUrl);

  console.log(`[course-link] "${title}" → ${best ? best : "(fallback google search)"}`);
  return NextResponse.json({ url: finalUrl });
}
