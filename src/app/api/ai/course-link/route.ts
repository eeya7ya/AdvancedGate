import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "~/auth";

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

/* ── URL helpers (mirrors the logic in /api/ai/chat) ────────────────── */

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

const TRUSTED_PLATFORMS = new Set([
  "coursera.org", "udemy.com", "edx.org", "linkedin.com", "youtube.com",
  "youtu.be", "freecodecamp.org", "khanacademy.org", "pluralsight.com",
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

/* ── Single compound-model search — same pattern as /api/ai/chat ─────── */
interface SearchResult { urls: string[] }

async function webSearch(query: string): Promise<SearchResult> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (client.chat.completions.create as any)({
      model: "groq/compound",
      messages: [
        {
          role: "system",
          content:
            "You are a course search assistant. Find the direct enrollment page for the course described in the query. " +
            "Return the exact page URL. Prefer English-language pages.",
        },
        { role: "user", content: query },
      ],
    });

    const message = response.choices[0]?.message;
    const content: string = message?.content ?? "";
    const urls: string[] = [];

    // Primary source: structured tool results from compound model
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const executedTools = (message as any)?.executed_tools;
    if (Array.isArray(executedTools)) {
      for (const tool of executedTools) {
        const results = tool.search_results?.results;
        if (Array.isArray(results)) {
          for (const r of results) {
            if (r.url) urls.push(r.url.replace(/[.,;:!?)]+$/, ""));
          }
        }
      }
    }

    // Secondary: URLs cited inline in the model's text response
    const urlRegex = /https?:\/\/[^\s"'<>\])}]+/g;
    for (const u of content.match(urlRegex) ?? []) {
      const clean = u.replace(/[.,;:!?)]+$/, "");
      if (!urls.includes(clean)) urls.push(clean);
    }

    return { urls };
  } catch (err) {
    console.error("[course-link] search error for query:", err);
    return { urls: [] };
  }
}

/* ── Google search fallback — platform-targeted, never an AI chatbot ─── */
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

  // Build multiple parallel queries — same strategy as the working chat route.
  // Each query targets one platform using site: so the compound model's web
  // search returns results from the right domain.
  const titleQ = `"${title}"${instructor ? ` "${instructor}"` : ""}`;

  const queries: string[] = [];

  // Platform-specific targeted query (highest priority — most relevant)
  if (platform) {
    const p = platform.toLowerCase();
    if (p.includes("udemy"))        queries.push(`${titleQ} course site:udemy.com`);
    else if (p.includes("coursera")) queries.push(`${titleQ} course site:coursera.org`);
    else if (p.includes("edx"))     queries.push(`${titleQ} course site:edx.org`);
    else if (p.includes("youtube")) queries.push(`${titleQ} tutorial site:youtube.com`);
    else if (p.includes("linkedin")) queries.push(`${titleQ} course site:linkedin.com/learning`);
    else if (p.includes("freecodecamp")) queries.push(`${titleQ} site:freecodecamp.org`);
    else if (p.includes("pluralsight")) queries.push(`${titleQ} course site:pluralsight.com`);
    else if (p.includes("cisco") || p.includes("netacad")) queries.push(`${titleQ} course site:netacad.com`);
    else if (p.includes("microsoft")) queries.push(`${titleQ} course site:learn.microsoft.com`);
    else if (p.includes("aws") || p.includes("amazon")) queries.push(`${titleQ} course site:skillbuilder.aws`);
    else if (p.includes("google cloud") || p.includes("gcp")) queries.push(`${titleQ} course site:cloudskillsboost.google`);
    else queries.push(`${titleQ} course ${platform} enroll`); // unknown platform — open query
  }

  // Broad cross-platform queries — always run these as additional coverage
  queries.push(`${titleQ} course site:udemy.com`);
  queries.push(`${titleQ} course site:coursera.org`);
  queries.push(`${titleQ} tutorial full course site:youtube.com`);
  queries.push(`${titleQ} course site:edx.org OR site:linkedin.com/learning`);
  queries.push(`${titleQ} course site:freecodecamp.org OR site:khanacademy.org`);

  // De-duplicate queries (platform-specific might equal a broad one)
  const uniqueQueries = [...new Set(queries)];

  // Fire all searches in parallel
  const results = await Promise.all(uniqueQueries.map(webSearch));

  // Collect, deduplicate, and rank URLs
  const seen = new Set<string>();
  const allUrls: string[] = [];
  for (const r of results) {
    for (const url of r.urls) {
      const norm = normalizeUrl(url);
      if (!seen.has(norm)) {
        seen.add(norm);
        allUrls.push(url);
      }
    }
  }

  // Pick best: trusted platform course page first, then any course page, then first URL
  const best =
    allUrls.find((u) => isTrusted(u) && isCoursePage(u)) ??
    allUrls.find((u) => isCoursePage(u)) ??
    allUrls[0] ??
    "";

  // If we found nothing at all, fall back to a Google search (NOT Grok)
  const finalUrl = best || platformSearchUrl(title, platform);

  console.log(`[course-link] "${title}" → ${best ? best : "(fallback google search)"}`);
  return NextResponse.json({ url: finalUrl });
}
