import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "~/auth";

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
async function findCourseLink(title: string, platform: string, instructor: string): Promise<string[]> {
  const platformHint = platform
    ? ` on ${platform}`
    : " on platforms like Udemy, Coursera, edX, YouTube, LinkedIn Learning, freeCodeCamp, Pluralsight, or Cisco NetAcad";
  const instructorHint = instructor ? ` by instructor "${instructor}"` : "";

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (anthropic.messages.create as any)({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      system:
        "You are a course search assistant. Use web search to find the direct enrollment or course page for the requested course. Prefer English-language pages on trusted educational platforms.",
      messages: [
        {
          role: "user",
          content:
            `Find the direct enrollment/course page URL for the course titled "${title}"${instructorHint}${platformHint}. ` +
            `Return the exact URL of the course page where someone can enroll or watch it.`,
        },
      ],
    });

    const urls: string[] = [];

    for (const block of response.content ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const b = block as any;

      // URLs from web_search_tool_result blocks (Anthropic built-in tool results)
      if (b.type === "web_search_tool_result") {
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

    return urls;
  } catch (err) {
    console.error("[course-link] Claude search error:", err);
    return [];
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

  const allUrls = await findCourseLink(title, platform, instructor);

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

  // Pick best: trusted platform course page first, then any course page, then first URL
  const best =
    deduped.find((u) => isTrusted(u) && isCoursePage(u)) ??
    deduped.find((u) => isCoursePage(u)) ??
    deduped[0] ??
    "";

  // Fall back to a Google search if nothing was found
  const finalUrl = best || platformSearchUrl(title, platform);

  console.log(`[course-link] "${title}" → ${best ? best : "(fallback google search)"}`);
  return NextResponse.json({ url: finalUrl });
}
