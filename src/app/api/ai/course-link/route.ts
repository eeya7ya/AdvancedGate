import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "~/auth";

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/** Return true if the URL looks like a specific course/content page (not a homepage). */
function isCoursePage(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    const path = u.pathname.toLowerCase();

    // Platform-specific rules
    if (host === "youtube.com" || host === "youtu.be") {
      return path.includes("/watch") || path.includes("/playlist") || host === "youtu.be";
    }
    if (host === "coursera.org") {
      return path.includes("/learn/") || path.includes("/specializations/") || path.includes("/professional-certificates/");
    }
    if (host === "udemy.com") {
      return path.includes("/course/");
    }
    if (host === "edx.org") {
      return path.includes("/course/") || path.includes("/professional-certificate/");
    }
    if (host === "linkedin.com") {
      return path.includes("/learning/");
    }
    if (host === "freecodecamp.org") {
      return path.includes("/learn/") || path.includes("/certification/");
    }
    if (host === "khanacademy.org") {
      return path.length > 5;
    }
    // Generic: path must have at least one segment beyond root
    return path.length > 3 && path !== "/";
  } catch {
    return false;
  }
}

const TRUSTED_PLATFORMS = new Set([
  "coursera.org", "udemy.com", "edx.org", "linkedin.com",
  "youtube.com", "youtu.be", "freecodecamp.org", "khanacademy.org",
  "pluralsight.com", "skillshare.com", "udacity.com", "codecademy.com",
  "cisco.com", "netacad.com", "microsoft.com", "learn.microsoft.com",
  "aws.amazon.com", "cloud.google.com", "comptia.org",
  "vmware.com", "paloaltonetworks.com",
]);

function isTrusted(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return TRUSTED_PLATFORMS.has(host) || [...TRUSTED_PLATFORMS].some((p) => host.endsWith("." + p));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ url: "" }, { status: 401 });
  }

  let title: string, platform: string, instructor: string;
  try {
    const body = await req.json();
    title = (body.title ?? "").trim();
    platform = (body.platform ?? "").trim();
    instructor = (body.instructor ?? "").trim();
  } catch {
    return NextResponse.json({ url: "" }, { status: 400 });
  }

  if (!title) {
    return NextResponse.json({ url: "" });
  }

  // Build a targeted search query — prefer English enrollment pages
  const searchQuery = [
    `"${title}"`,
    instructor ? `"${instructor}"` : "",
    platform || "online course",
    "enroll site:coursera.org OR site:udemy.com OR site:edx.org OR site:youtube.com OR site:freecodecamp.org OR site:linkedin.com/learning",
  ]
    .filter(Boolean)
    .join(" ");

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (client.chat.completions.create as any)({
      model: "groq/compound",
      messages: [
        {
          role: "system",
          content:
            "You are a course URL finder. Search the web and return the single best direct enrollment page URL for the requested course. " +
            "Prefer English-language pages on major platforms (Coursera, Udemy, edX, YouTube, freeCodeCamp, LinkedIn Learning, official vendor portals). " +
            "Return ONLY the raw URL — nothing else. No explanation, no punctuation around it. " +
            "If you cannot find a real specific course page, return the word NONE.",
        },
        {
          role: "user",
          content: searchQuery,
        },
      ],
    });

    const message = response.choices[0]?.message;
    const content: string = (message?.content ?? "").trim();

    // Collect URLs from structured tool results
    const urls: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const executedTools = (message as any)?.executed_tools;
    if (Array.isArray(executedTools)) {
      for (const tool of executedTools) {
        const results = tool.search_results?.results;
        if (Array.isArray(results)) {
          for (const r of results) {
            if (r.url) urls.push(r.url);
          }
        }
      }
    }

    // Also extract any URL the model returned as text
    const urlRegex = /https?:\/\/[^\s"'<>\])}]+/g;
    const textUrls = (content.match(urlRegex) ?? []).map((u) =>
      u.replace(/[.,;:!?)]+$/, "")
    );
    for (const u of textUrls) {
      if (!urls.includes(u)) urls.push(u);
    }

    // Pick the best trusted course-page URL
    const best =
      urls.find((u) => isTrusted(u) && isCoursePage(u)) ??
      urls.find((u) => isCoursePage(u)) ??
      urls[0] ??
      "";

    return NextResponse.json({ url: best });
  } catch (err) {
    console.error("[course-link] search error:", err);
    return NextResponse.json({ url: "" });
  }
}
