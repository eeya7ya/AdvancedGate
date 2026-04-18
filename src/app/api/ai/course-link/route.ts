import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "~/auth";
import { getCachedLink, setCachedLink } from "@/lib/runtime-cache";
import { getUserApiSpent, addUserApiCost, getCachedCourseLink, setCachedCourseLink } from "@/lib/db";

// Per-user budget cap in USD
const USER_BUDGET_USD = 0.70;

// Claude Haiku 4.5 pricing
const COST_PER_INPUT_TOKEN  = 1.00 / 1_000_000; // $1.00 / MTok
const COST_PER_OUTPUT_TOKEN = 5.00 / 1_000_000; // $5.00 / MTok

function calcCost(inputTokens: number, outputTokens: number): number {
  return (
    inputTokens  * COST_PER_INPUT_TOKEN +
    outputTokens * COST_PER_OUTPUT_TOKEN
  );
}

const client = new Anthropic();
const MODEL = "claude-haiku-4-5";

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

const ARABIC_COUNTRIES = new Set([
  "jordan", "egypt", "saudi arabia", "uae", "united arab emirates",
  "kuwait", "bahrain", "qatar", "oman", "iraq", "syria", "lebanon",
  "morocco", "algeria", "tunisia", "libya", "sudan", "yemen", "palestine",
]);

function isArabicCountry(country: string): boolean {
  return ARABIC_COUNTRIES.has(country.toLowerCase().trim());
}

/* ── Claude Haiku + web_search tool ──────────────────────────────────── */
async function findCourseLink(
  title: string,
  platform: string,
  instructor: string,
  country?: string,
): Promise<{ urls: string[]; modelUrl: string; cost: number }> {
  const isArabic = country ? isArabicCountry(country) : false;
  const langHint = isArabic ? "Arabic language (preferred) or English" : "English";

  const query = [title, instructor, platform].filter(Boolean).join(" ");

  const systemPrompt =
    "You are a course URL finder. Use the web_search tool to find the exact enrollment or watch URL for the requested course. " +
    "Priority: (1) official vendor site (cisco.com/learning, learn.microsoft.com, aws.amazon.com/training, cloudskillsboost.google, netacad.com), " +
    "(2) trusted platforms (Coursera, Udemy, edX, LinkedIn Learning, YouTube). " +
    (isArabic ? "Prefer Arabic-language versions when available on official sites or YouTube. " : "") +
    "After searching, output ONLY the single best URL — one line, no explanation, no markdown, no quotes.";

  const userMessage =
    `Find the direct enrollment or watch URL for this course: "${query}". ` +
    `Language preference: ${langHint}. ` +
    `Return only the URL.`;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (client.messages.create as any)({
      model: MODEL,
      max_tokens: 512,
      system: systemPrompt,
      tools: [
        { type: "web_search_20250305", name: "web_search", max_uses: 2 },
      ],
      messages: [{ role: "user", content: userMessage }],
    });

    let textContent = "";
    const searchUrls: string[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const block of response.content as any[]) {
      if (block.type === "text") {
        textContent += block.text ?? "";
      } else if (block.type === "web_search_tool_result") {
        const items = block.content;
        if (Array.isArray(items)) {
          for (const item of items) {
            if (item?.url && typeof item.url === "string") {
              searchUrls.push(item.url.replace(/[.,;:!?)]+$/, ""));
            }
          }
        }
      }
    }

    // The model's explicitly chosen URL (first URL in text) — highest confidence
    let modelUrl = "";
    const URL_RE = /https?:\/\/[^\s"'<>\])}]+/g;
    const matches = textContent.match(URL_RE) ?? [];
    for (const u of matches) {
      const clean = u.replace(/[.,;:!?)]+$/, "");
      if (!modelUrl) modelUrl = clean;
      if (!searchUrls.includes(clean)) searchUrls.push(clean);
    }

    const cost = calcCost(
      response.usage?.input_tokens  ?? 0,
      response.usage?.output_tokens ?? 0,
    );

    return { urls: searchUrls, modelUrl, cost };
  } catch (err) {
    console.error("[course-link] Claude web_search error:", err);
    return { urls: [], modelUrl: "", cost: 0 };
  }
}

/* ── Main handler ─────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ url: "" }, { status: 401 });

  let title: string, platform: string, instructor: string, country: string;
  try {
    const body = await req.json();
    title      = (body.title      ?? "").trim();
    platform   = (body.platform   ?? "").trim();
    instructor = (body.instructor ?? "").trim();
    country    = (body.country    ?? "").trim();
  } catch {
    return NextResponse.json({ url: "" }, { status: 400 });
  }

  if (!title) return NextResponse.json({ url: "" });

  const userId = session.user.id!;

  // Cache key is per-user so each user's links reset independently with their Advisor.
  // Instructor excluded to maximise hit rate across equivalent requests.
  const cacheKey = `${userId}|${title.toLowerCase()}|${platform.toLowerCase()}`;

  // L1: in-memory (free, instant — survives only until server restart)
  const memHit = getCachedLink(cacheKey);
  if (memHit) {
    console.log(`[course-link] mem-cache hit: "${title}" → ${memHit}`);
    return NextResponse.json({ url: memHit });
  }

  // L2: database (persists across restarts, cleared on Advisor reset)
  const dbHit = await getCachedCourseLink(cacheKey);
  if (dbHit) {
    setCachedLink(cacheKey, dbHit); // warm L1
    console.log(`[course-link] db-cache hit: "${title}" → ${dbHit}`);
    return NextResponse.json({ url: dbHit });
  }

  // Per-user budget guard
  const spent = await getUserApiSpent(userId);
  if (spent >= USER_BUDGET_USD) {
    console.warn(`[course-link] user ${userId} budget exhausted ($${spent.toFixed(4)} / $${USER_BUDGET_USD})`);
    return NextResponse.json({ url: "", quota_exceeded: true });
  }

  const { urls: allUrls, modelUrl, cost } = await findCourseLink(title, platform, instructor, country);

  // Record cost against this user's budget
  if (cost > 0) await addUserApiCost(userId, cost);

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

  // Model's explicit text response is its highest-confidence selection —
  // use it directly if it's a real URL (not a homepage / root path).
  // Fall back to ranked pool only if the model's pick looks wrong.
  const modelPickIsGood = modelUrl && isCoursePage(modelUrl);

  // Priority: official site course page → official site → trusted (non-YT) course page →
  //           trusted course page (incl. YT) → any course page → YT → first URL
  const rankedBest =
    deduped.find((u) => isOfficial(u) && isCoursePage(u)) ??
    deduped.find((u) => isOfficial(u)) ??
    deduped.find((u) => isTrusted(u) && isCoursePage(u) && !isYouTube(u)) ??
    deduped.find((u) => isTrusted(u) && isCoursePage(u)) ??
    deduped.find((u) => isCoursePage(u)) ??
    deduped.find((u) => isYouTube(u)) ??
    deduped[0] ??
    "";

  const best = modelPickIsGood ? modelUrl : (rankedBest || modelUrl);

  // Fall back to a Google search if nothing was found
  const finalUrl = best || platformSearchUrl(title, platform);

  // Persist to both layers — DB survives restarts, mem avoids DB round-trips
  if (finalUrl) {
    setCachedLink(cacheKey, finalUrl);
    void setCachedCourseLink(cacheKey, finalUrl); // fire-and-forget, non-blocking
  }

  console.log(`[course-link] "${title}" → ${best ? best : "(fallback google search)"}`);
  return NextResponse.json({ url: finalUrl });
}
