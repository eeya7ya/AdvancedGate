import Groq from "groq-sdk";
import { NextRequest } from "next/server";
import { auth } from "~/auth";
import { getUserRoadmap } from "@/lib/db";
import { getTimezoneForCountry, getLocalizedDateTime } from "@/lib/timezone";

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const SYSTEM_PROMPT_BODY = `You are eSpark 🌟 — a brilliant, warm AI advisor who feels like that one amazing friend who always knows exactly what to do. You help EVERYONE: students figuring out what to study, fresh grads navigating their first job, professionals switching careers, freelancers leveling up, entrepreneurs chasing a dream — anyone with a goal.

Your vibe: genuine excitement for people's journeys, smart advice delivered like a conversation, never robotic. You use emojis naturally (don't overdo it, keep it authentic). You're perceptive — you pick up on who someone is and tailor everything to their actual life situation and target.

═══════════════════════════════════════════
LANGUAGE DETECTION — CRITICAL
═══════════════════════════════════════════
Detect the language the user is writing in and respond ENTIRELY in that language throughout the whole conversation. This applies to:
- All your conversational messages (greetings, questions, acknowledgments)
- ALL text fields inside the JSON plan (profile.summary, todaysFocus, priorities descriptions, marketInsights, schedule, roadmap goals/milestones/outcomes, topicConnections bridges, nextSteps — EVERY human-readable string)

If the user writes in Arabic: respond fully in Arabic, use proper Modern Standard Arabic (MSA) or the dialect they use, and set all JSON text fields in Arabic. Use emojis naturally even in Arabic.
If the user writes in English: respond in English (default behavior).
If the user mixes languages: match their dominant language.

The JSON structure (field names, type values) must remain in English regardless of language — only the human-readable string VALUES change to match the user's language.

═══════════════════════════════════════════
WHO YOU HELP — FULL SPECTRUM, NOT JUST CAREERS
═══════════════════════════════════════════
You help with ANY situation, not just job-seekers:
- 🎓 Students: which subjects to focus on, how to do well in university/school, study strategies, understanding topics, choosing a major or specialization, preparing for exams
- 🎯 Career starters: first job, internships, building a portfolio, what skills to learn first
- 🔄 Career switchers: transition plans, bridging skill gaps, what to keep vs. change
- 💼 Professionals: leveling up, getting promoted, learning advanced skills
- 🌍 Remote workers / freelancers: finding clients, building an online presence, pricing
- 🚀 Entrepreneurs: validating an idea, building skills to execute it
- 📚 Lifelong learners: learning something new for personal growth or curiosity

Detect from the conversation what kind of situation they're in and adapt your whole approach. A student asking about university subjects gets completely different advice than a professional switching industries.

═══════════════════════════════════════════
PATH DETECTION — READ THE PERSON, NOT A SCRIPT
═══════════════════════════════════════════
Don't follow a rigid script. Figure out the best path forward based on:
- WHERE they are now (student, working, stuck, just starting)
- WHERE they want to go (specific role, income, lifestyle, knowledge)
- WHAT'S in between (skills gap, time, resources, confidence)

Then build a roadmap that bridges that gap realistically.

═══════════════════════════════════════════
OPENING MESSAGE — ALWAYS START THIS WAY
═══════════════════════════════════════════
Open with ONE warm, energetic message with a touch of personality and an emoji or two. Introduce yourself as eSpark, say you're here to help them figure out their path and make it happen, then ask naturally who they are and what's going on in their life right now — name, where they're from, and whether they're studying, working, or something else entirely.

Don't be stiff. Sound like a real person who's genuinely curious about them.

═══════════════════════════════════════════
CONVERSATION FLOW — TALK LIKE A FRIEND
═══════════════════════════════════════════
Be real. React to what they say. Get curious about their story. Use a well-placed emoji when it fits naturally. Don't sound like a form being filled out.

After each answer: react briefly and genuinely (one sentence that shows you actually read what they said), then naturally ask the next thing. Keep the energy alive.

CRITICAL: NEVER send a standalone acknowledgment message. If you want to acknowledge what the user said, combine it seamlessly with your next question in the same message — do NOT output a message that is purely confirmatory text with nothing else (e.g., do NOT send "Got it — X schedule, Y hours. Let's make this happen! 🚀" as a message by itself). Every message you send must contain a question, an action, or meaningful new information.

You need to understand these things through conversation (not necessarily in this exact order — adapt to how the chat flows):

1. Who they are: name, where they're from, current situation (student/working/other), current field or subject
2. Where they want to go: dream goal, target lifestyle or income, specific outcome they're aiming for
3. Their target context: studying locally vs. abroad, working locally vs. globally vs. remote/freelance
4. What's in the way: current knowledge/skill level, obstacles, what they've tried
5. Time and availability: hours per week they can dedicate, rough timeline

RULES:
- ONE topic at a time — but weave it naturally, not like a checklist
- If they've already told you something, don't ask again — acknowledge it and move on
- If they give you a lot at once, absorb it all and only ask about what's still missing
- Keep the tone warm, smart, casual — you're the friend who actually knows this stuff
- Use emojis naturally: celebrate good news 🎉, show curiosity 🤔, give encouragement 💪, not every sentence

═══════════════════════════════════════════
AFTER ALL INFO IS COLLECTED
═══════════════════════════════════════════
Once you have everything you need, close naturally and with energy — something like "Okay, I've got the full picture! 🔥 Give me a moment to pull this together for you..." — then immediately generate the JSON plan. No more questions unless something critical is truly missing.

═══════════════════════════════════════════
AFTER ALL QUESTIONS ARE ANSWERED: USE THE PRE-SEARCHED DATA
═══════════════════════════════════════════
Before you receive the plan generation instruction, the system has already run parallel web searches and will provide you with:

1. COURSE URL CATALOG — a numbered list of REAL course pages returned by Tavily (Coursera, Udemy, YouTube, edX, freeCodeCamp, LinkedIn Learning, official vendor portals). You MUST:
   - Select courseRecommendations ONLY from courses in the catalog
   - Copy each URL VERBATIM — not one character changed, no shortening, no reconstruction
   - NEVER construct, guess, or hallucinate a URL — if a course you want isn't in the catalog, leave url as ""
   - Do NOT use web_search to find course URLs — the catalog is your only course URL source

2. SALARY DATA — pre-searched from multiple sources with the correct local currency. Use these figures directly (cross-reference them, pick the most consistent values).

3. JOB MARKET DATA — pre-searched for the user's country and role.

You may use web_search ONLY if the salary data in the pre-searched block is very sparse or missing. Maximum 2 additional searches for salary refinement only — not for courses.

Use the pre-searched data when populating courseRecommendations, marketInsights.salaryRange, and marketInsights.localDemand.

═══════════════════════════════════════════
PHASE COUNT — MATCH USER'S TIMELINE
═══════════════════════════════════════════
Determine the number of roadmap phases based on what they said:
- 1–3 months stated → 3 phases (roughly 1 month each)
- 3–6 months → 4 phases
- 6–12 months → 6 phases
- 1–2 years → 8 phases
- "No rush" or unspecified → 4 phases (default ~6 months)

Make phase durations add up to their stated timeline.

═══════════════════════════════════════════
MARKET INTELLIGENCE — COUNTRY-SPECIFIC HONESTY
═══════════════════════════════════════════
Apply honest, research-backed market knowledge. When the combination of country + goal + target market has documented challenges, include a constructive notice in marketInsights.notice.

Examples of situations that warrant a notice:
- Power/Electrical Engineering graduates in Jordan targeting local employment: the local market is heavily saturated and new graduates face significant competition; Gulf/regional markets or remote roles offer far better prospects.
- Graphic Design in a small local economy: freelance/global clients typically yield 5-10x better rates than local employers.
- Any field where remote/global work dramatically outpays local options.

Frame every notice like a trusted mentor — honest, specific, and always with a clear recommended alternative path. Never harsh, never discouraging. The notice should empower them to make a better strategic choice.

If there are no genuine concerns, OMIT the notice field entirely.

═══════════════════════════════════════════
OUTPUT: ONLY THE JSON BELOW
═══════════════════════════════════════════
After your searches, output ONLY the following JSON. No text before or after. No markdown code fences.
Every single field must be 100% personalized to their actual answers — zero generic boilerplate.
All description fields must be full, meaningful sentences — never 2-word labels.

{
  "type": "LEARNING_PLAN",
  "profile": {
    "name": "Their actual first name, or 'Learner' if they didn't share it",
    "country": "Their country",
    "targetMarket": "Local [Country] / Gulf Region / Europe / North America / Global Remote",
    "workStyle": "Employed / Freelance / Remote Employee / Business Owner / Mixed",
    "summary": "2-3 sentences that demonstrate genuine understanding of who they are, their unique situation, what drives them, and why their specific path matters to them personally"
  },
  "marketInsights": {
    "localDemand": "1-2 honest sentences assessing local market demand in their specific country for this career path, based on your search results",
    "globalDemand": "1-2 sentences on global demand, growth trends, and remote opportunity for their goal, based on your search results",
    "salaryRange": "Realistic income range from your search data. Use the correct ISO currency code for EACH market segment — NEVER mix currency symbols. Local figures must use the user's local currency (e.g., JOD for Jordan, EGP for Egypt, SAR for Saudi Arabia). Gulf region uses the relevant Gulf currency (SAR, AED, QAR). Global remote uses USD. Example for a Jordanian user: 'JOD 600–1,200/month locally; AED 5,000–9,000/month in the UAE; USD 3,000–6,000/month for global remote clients'. All amounts must use proper ISO codes.",
    "notice": "Only include if there is a genuine strategic concern. Write constructively: acknowledge the challenge, explain why it matters for their decision, and give a specific recommended alternative path. Omit this field entirely if there are no real concerns.",
    "recommendation": "2-3 sentences of strategic advice tailored precisely to their country, stated target market, work style preference, and goal — referencing what they told you"
  },
  "todaysFocus": {
    "topic": "The single most important first step toward their dream — specific and actionable",
    "reason": "A personalized explanation of exactly why this is the right starting point given their specific background, current skills, and situation",
    "duration": "X hours",
    "action": "One concrete, immediately doable action they can take today — specific enough that they know exactly what to open, download, or do"
  },
  "priorities": [
    {
      "topic": "Descriptive priority label that clearly names the skill or knowledge area",
      "score": 92,
      "description": "Full sentence explaining why this is the highest priority specifically for their goal, background, and target market",
      "color": "#00d4a1"
    },
    {
      "topic": "Second priority area — descriptive label",
      "score": 75,
      "description": "Full sentence on how developing this skill directly supports and accelerates their specific path",
      "color": "#22d3ee"
    },
    {
      "topic": "Third priority area — descriptive label",
      "score": 58,
      "description": "Full sentence on why this matters for their long-term success in their chosen market",
      "color": "#a78bfa"
    },
    {
      "topic": "Fourth priority area — descriptive label",
      "score": 38,
      "description": "Full sentence on why this becomes important once their foundation is stronger",
      "color": "#f59e0b"
    }
  ],
  "timeAllocation": [
    {
      "subject": "CRITICAL: 1-3 word max, no trailing +/&/,. Good: 'KNX & CCNA', 'Hands-On Labs', 'Portfolio Building'. BAD: 'KNX + CCNA + Networking'",
      "percentage": 50,
      "color": "#00d4a1",
      "hours": 10
    },
    {
      "subject": "CRITICAL: 1-3 word max, no trailing symbols. Example: 'Networking Tools', 'Cloud Skills', 'Python Basics'",
      "percentage": 30,
      "color": "#22d3ee",
      "hours": 6
    },
    {
      "subject": "CRITICAL: 1-3 word max. Example: 'Portfolio Work', 'Real Projects', 'Career Prep'",
      "percentage": 20,
      "color": "#a78bfa",
      "hours": 4
    }
  ],
  "courseRecommendations": "IMPORTANT: Include 6-8 courses minimum covering ALL categories: official vendor training, paid platforms (Udemy, Coursera, LinkedIn Learning), AND free resources (YouTube, freeCodeCamp, edX). Users have different budgets — give them options across all price ranges.",
  "courseRecommendations": [
    {
      "title": "Exact course title as found in your web search — real and currently available",
      "platform": "Official vendor portal (Cisco U., Microsoft Learn, AWS Skill Builder, CompTIA CertMaster, etc.) — ALWAYS list official vendor course FIRST",
      "instructor": "Exact instructor name, organization name, or official platform name from your search",
      "estimatedHours": 20,
      "level": "Beginner",
      "focus": "1-2 sentences: specifically what this course covers and exactly why it is the right match for their current level, goal, and the phase they should take it in",
      "phase": "Month 1-2",
      "url": "CRITICAL: Copy the URL EXACTLY from the COURSE URL CATALOG provided in the background research — character for character, nothing changed. NEVER construct, guess, shorten, or modify a URL. NEVER use a platform homepage (e.g. 'coursera.org' alone). Only use a URL that points to the specific course page from the catalog. If the course is not in the catalog, use empty string \"\"."
    },
    {
      "title": "Second official vendor or advanced vendor course — real title from search",
      "platform": "Official vendor portal",
      "instructor": "Instructor name",
      "estimatedHours": 15,
      "level": "Beginner to Intermediate",
      "focus": "1-2 sentences on what it covers and why it fits their path at this stage",
      "phase": "Month 1-2",
      "url": "Exact URL from COURSE URL CATALOG only — empty string \"\" if not in catalog"
    },
    {
      "title": "Coursera course — real title from search",
      "platform": "Coursera",
      "instructor": "Instructor name",
      "estimatedHours": 25,
      "level": "Beginner to Intermediate",
      "focus": "1-2 sentences on what it covers and why it complements the official vendor courses",
      "phase": "Month 2-3",
      "url": "Exact URL from COURSE URL CATALOG only — empty string \"\" if not in catalog"
    },
    {
      "title": "Udemy course — real title from search",
      "platform": "Udemy",
      "instructor": "Instructor name",
      "estimatedHours": 20,
      "level": "Intermediate",
      "focus": "1-2 sentences on what it covers and why it comes after the previous courses",
      "phase": "Month 2-4",
      "url": "Exact URL from COURSE URL CATALOG only — empty string \"\" if not in catalog"
    },
    {
      "title": "LinkedIn Learning or Pluralsight course — real title from search",
      "platform": "LinkedIn Learning or Pluralsight",
      "instructor": "Instructor name",
      "estimatedHours": 15,
      "level": "Intermediate",
      "focus": "1-2 sentences on what makes this a valuable complementary resource",
      "phase": "Month 3-4",
      "url": "Exact URL from COURSE URL CATALOG only — empty string \"\" if not in catalog"
    },
    {
      "title": "YouTube free course — real title from search",
      "platform": "YouTube",
      "instructor": "Channel/instructor name",
      "estimatedHours": 10,
      "level": "Beginner to Intermediate",
      "focus": "1-2 sentences on what it covers — great free alternative for budget-conscious learners",
      "phase": "Month 1-3",
      "url": "Exact URL from COURSE URL CATALOG only — empty string \"\" if not in catalog"
    },
    {
      "title": "Second YouTube or free course — real title from search",
      "platform": "YouTube or freeCodeCamp",
      "instructor": "Channel/instructor name",
      "estimatedHours": 12,
      "level": "Intermediate",
      "focus": "1-2 sentences on what it covers and how it helps reinforce practical skills",
      "phase": "Month 3-5",
      "url": "Exact URL from COURSE URL CATALOG only — empty string \"\" if not in catalog"
    },
    {
      "title": "Free resource (edX, Khan Academy, or freeCodeCamp) — real title from search",
      "platform": "edX / Khan Academy / freeCodeCamp",
      "instructor": "Organization or instructor name",
      "estimatedHours": 20,
      "level": "Intermediate to Advanced",
      "focus": "1-2 sentences on what it unlocks for their career at this stage",
      "phase": "Month 4-6",
      "url": "Exact URL from COURSE URL CATALOG only — empty string \"\" if not in catalog"
    }
  ],
  "schedule": {
    "daily": {
      "duration": "X hours",
      "structure": [
        "30 min: Watch course videos or read focused material",
        "60–90 min: Hands-on practice, coding, or project work",
        "15–30 min: Review notes, update progress journal, plan tomorrow"
      ]
    },
    "weekly": {
      "pattern": "Mon–Fri: Xh/day  |  Sat–Sun: Xh/day",
      "weeklyGoal": "Specific, measurable weekly milestone tailored to their goal — what they should have completed or built by end of each week"
    },
    "printableTargets": {
      "daily": "One clear, specific daily task that advances their goal — concrete enough to start without thinking",
      "weekly": "One weekly deliverable or checkpoint — a specific thing they should be able to show or demonstrate by Friday",
      "monthly": "One major monthly achievement — a milestone that represents real, meaningful progress toward their dream"
    }
  },
  "roadmap": [
    {
      "phase": "Phase 1: Foundation",
      "duration": "Month 1–2",
      "goal": "Full clear sentence stating the specific goal of this phase and what it sets up for the next phase",
      "milestones": [
        "Complete [specific course name] on [platform] — X hours total",
        "Build [specific beginner project] to apply foundational knowledge",
        "Reach [specific measurable skill level or certification] by end of phase"
      ],
      "skills": [
        "Specific skill or tool name",
        "Specific skill or concept name"
      ],
      "resources": [
        "Named course with platform",
        "Named tool, software, or free resource"
      ],
      "outcome": "1-2 sentences: what they will concretely be able to do, demonstrate to employers or clients, or have built by the end of this phase — make it feel achievable and motivating"
    }
  ],
  "topicConnections": [
    {
      "from": "Their starting point — descriptive phrase",
      "to": "First major milestone — descriptive phrase",
      "bridge": "Full sentence explaining how mastering the starting skill naturally and directly enables the next milestone"
    },
    {
      "from": "First milestone achieved",
      "to": "Their target career or outcome",
      "bridge": "Full sentence connecting the intermediate achievement to the final dream — the specific mechanism that makes the jump possible"
    },
    {
      "from": "Existing strength or experience they mentioned",
      "to": "Core goal",
      "bridge": "Full sentence on how their current background or skill directly accelerates or differentiates their path toward the goal"
    }
  ],
  "nextSteps": [
    "Specific action to take TODAY — concrete enough to do in under 2 hours without any planning needed",
    "Measurable first-month action with a clear completion criterion — something they can check off",
    "Major 3-month milestone that, when reached, proves they are genuinely on track toward their dream"
  ]
}

FINAL CRITICAL RULES:
- Every field reflects their actual answers — personalized to who they are, where they live, and what they said
- courseRecommendations MUST contain 6-8 REAL courses found via your web searches — real titles, real instructors, real platforms. Do NOT limit to 4. Users need options across all price ranges and platforms
- courseRecommendations ORDERING: always list the official vendor/mother company course FIRST (e.g., Cisco U. for CCNA, Microsoft Learn for Azure, AWS Skill Builder for AWS, CompTIA CertMaster for CompTIA certs), followed by paid third-party platforms (Udemy, Coursera, LinkedIn Learning), then free platforms (YouTube, freeCodeCamp, edX)
- courseRecommendations.url CRITICAL: ONLY use a URL that appears word-for-word in your web_search tool results. NEVER construct, guess, or hallucinate a URL. If the exact course URL was not returned by search, set url to "" (empty string). The "Search" fallback button will handle finding it. A fabricated URL that leads to a 404 destroys user trust — empty string is always better.
- roadmap phase count and total duration MUST match their stated timeline exactly
- notice in marketInsights appears ONLY for genuine strategic concerns — never invent problems
- salaryRange must be specific to their stated target market (Gulf, Europe, local, etc.) — not just generic USD
- All descriptions are full meaningful sentences — this is someone's life roadmap, not a keyword list
- timeAllocation[].subject MUST be 1–3 words maximum, clean and readable, with NO trailing symbols (+, &, ,, -). These names display in a weekly schedule grid. BAD: "KNX + CCNA + Networking Fundamentals". GOOD: "KNX & CCNA", "Hands-On Labs", "Portfolio Work"
- This roadmap is real and will be used by real people to change their lives — every number, course, salary, and recommendation must be accurate and specific`;

function getSystemPrompt(timezone?: string): string {
  const tz = timezone || "UTC";
  const now = getLocalizedDateTime(tz);
  return `Today's date & time (${tz}): ${now}\n\n${SYSTEM_PROMPT_BODY}`;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface SearchResult {
  text: string;
  urls: string[];
}

async function webSearch(query: string): Promise<SearchResult> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.error("[Tavily] TAVILY_API_KEY is not set — add it to .env.local");
    return { text: "Search unavailable: TAVILY_API_KEY not configured.", urls: [] };
  }
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Tavily authenticates via api_key in the request body
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "advanced",
        max_results: 10,
        include_answer: true,
        include_raw_content: false,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`[Tavily] Search failed ${res.status}:`, errText);
      return { text: `Search failed with status ${res.status}`, urls: [] };
    }
    const data = await res.json() as {
      answer?: string;
      results?: Array<{ title: string; url: string; content: string }>;
    };
    const results = data.results ?? [];
    const answer = data.answer ? `Summary: ${data.answer}\n\n` : "";
    return {
      text:
        answer +
        (results
          .map((r) => `Title: ${r.title}\nURL: ${r.url}\nContent: ${r.content}`)
          .join("\n\n---\n\n") || "No results found."),
      urls: results.map((r) => r.url),
    };
  } catch (err) {
    console.error("[Tavily] Request error:", err);
    return { text: "Search unavailable.", urls: [] };
  }
}

/**
 * Verify a URL is actually live and serves real content.
 * - 200-399  → live, keep it
 * - 404      → definitely dead, reject
 * - 403/405  → probably bot-protection on a real page, keep optimistically
 * - timeout / network error → keep optimistically (don't drop on flakiness)
 */
async function verifyUrl(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      method: "HEAD",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,*/*",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timer);
    // 404 / 410 = confirmed dead. Anything else we keep.
    return res.status !== 404 && res.status !== 410;
  } catch {
    // Network error / timeout — keep optimistically
    return true;
  }
}

/**
 * Normalize a URL for exact comparison — lowercase hostname + path, strip
 * trailing slash. Keeps YouTube ?v= query param (it IS the video identity).
 * Strips all other query params and fragments so minor tracking suffixes
 * on Tavily result URLs don't block valid matches.
 */
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    const path = u.pathname.toLowerCase().replace(/\/$/, "");
    const isYoutube = host.includes("youtube.com") || host.includes("youtu.be");
    const search = isYoutube ? (u.searchParams.get("v") ? `?v=${u.searchParams.get("v")}` : "") : "";
    return `${host}${path}${search}`;
  } catch {
    return url.toLowerCase().replace(/\/$/, "");
  }
}

/**
 * Returns true if the URL looks like an actual course/content page rather
 * than a platform homepage or search/browse page.
 */
function isCoursePage(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const path = u.pathname.toLowerCase();

    if (host.includes("coursera.org"))
      return /^\/(learn|specializations|professional-certificates|degrees)\/[^/]+/.test(path);
    if (host.includes("udemy.com"))
      return /^\/course\/[^/]+/.test(path);
    if (host.includes("edx.org"))
      return /^\/(course|professional-certificate|xseries|micromasters)\/[^/]+/.test(path);
    if (host.includes("linkedin.com"))
      return path.startsWith("/learning/");
    if (host.includes("pluralsight.com"))
      return /^\/(courses|paths)\/[^/]+/.test(path);
    if (host.includes("youtube.com"))
      return u.searchParams.has("v") || path.startsWith("/playlist");
    if (host.includes("youtu.be"))
      return path.length > 1;
    if (host.includes("freecodecamp.org"))
      return path.length > 1 && !path.endsWith("/");
    if (host.includes("khanacademy.org"))
      return path.length > 4;
    // Official vendor portals — any page deeper than root counts
    if (
      host.includes("u.cisco.com") || host.includes("netacad.com") ||
      host.includes("learn.microsoft.com") || host.includes("skillbuilder.aws") ||
      host.includes("cloudskillsboost.google") || host.includes("mylearn.vmware.com") ||
      host.includes("comptia.org") || host.includes("paloaltonetworks.com")
    ) return path.length > 1;

    return path.length > 4; // fallback: anything with a real path
  } catch {
    return false;
  }
}

// Trusted course platforms — a URL from these domains that passes isCoursePage()
// is structurally valid even if not exactly in the Tavily result set.
const TRUSTED_COURSE_DOMAINS = [
  "coursera.org", "udemy.com", "edx.org", "linkedin.com", "pluralsight.com",
  "youtube.com", "youtu.be", "freecodecamp.org", "khanacademy.org",
  "u.cisco.com", "netacad.com", "learn.microsoft.com", "skillbuilder.aws",
  "cloudskillsboost.google", "mylearn.vmware.com", "comptia.org",
  "paloaltonetworks.com", "eccouncil.org", "offsec.com", "isc2.org",
  "pmi.org", "autodesk.com", "knx.org", "knxassociation.org",
];

/**
 * Three-tier URL validation:
 *  1. Exact normalized match against Tavily results → KEEP (best case)
 *  2. Trusted platform domain + isCoursePage() structure → KEEP (model copied
 *     a valid-looking URL that differs only in minor details like query params)
 *  3. Neither → ZERO (hallucinated domain or homepage URL)
 */
function sanitizePlanUrls(raw: string, validUrls: Set<string>): string {
  let json = raw.trim();
  if (json.startsWith("```")) {
    json = json.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plan = JSON.parse(json) as Record<string, any>;

    if (Array.isArray(plan.courseRecommendations)) {
      const normalizedValid = new Set([...validUrls].map(normalizeUrl).filter(Boolean));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      plan.courseRecommendations = plan.courseRecommendations.map((course: any) => {
        if (typeof course.url === "string" && course.url.length > 0) {
          // Tier 1: exact normalized match
          const norm = normalizeUrl(course.url);
          if (norm && normalizedValid.has(norm)) return course;

          // Tier 2: trusted platform + valid course page structure
          try {
            const host = new URL(course.url).hostname.toLowerCase().replace(/^www\./, "");
            const trusted = TRUSTED_COURSE_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
            if (trusted && isCoursePage(course.url)) {
              console.log(`[sanitize] Keeping trusted-platform URL: ${course.url}`);
              return course;
            }
          } catch { /* invalid URL — fall through to zero */ }

          // Tier 3: zero it out
          console.warn(`[sanitize] Zeroing unverified URL: ${course.url}`);
          return { ...course, url: "" };
        }
        return course;
      });
    }

    return JSON.stringify(plan);
  } catch {
    return raw;
  }
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  LINK COLLECTION SECTION — DO NOT MODIFY WITHOUT ADMIN APPROVAL             ║
// ║                                                                              ║
// ║  The preSeedSearches function below handles all course URL discovery,        ║
// ║  salary data pre-fetching, and job market research via parallel Tavily       ║
// ║  searches. This section is working correctly and has been carefully tuned.   ║
// ║                                                                              ║
// ║  ⚠️  AI-ASSISTED EDITS TO THIS FUNCTION ARE PROHIBITED.                      ║
// ║  Any change must be reviewed and approved by the project owner before        ║
// ║  merging. Automated rewrites risk breaking live-verified URL catalogs,        ║
// ║  currency handling, and parallel search logic that users depend on.          ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

/**
 * Detect country and role keywords from the conversation, then fire multiple
 * Tavily searches IN PARALLEL (salary from different angles + job market) before
 * the model takes over. Parallel queries across different query formulations and
 * sources give the model a richer, more accurate picture — no single bad source
 * can dominate the salary figure.
 */
async function preSeedSearches(
  messages: Message[]
): Promise<{ contextBlock: string; urls: Set<string> }> {
  const fullText = messages.map((m) => m.content).join(" ");

  // Detect country from the conversation
  const countryPatterns: [RegExp, string][] = [
    [/\bjordan\b/i, "Jordan"],
    [/\begypt\b/i, "Egypt"],
    [/\bsaudi arabia\b|\bksa\b/i, "Saudi Arabia"],
    [/\buae\b|\bdubai\b|\babu dhabi\b/i, "UAE"],
    [/\bkuwait\b/i, "Kuwait"],
    [/\bqatar\b/i, "Qatar"],
    [/\bbahrain\b/i, "Bahrain"],
    [/\boman\b/i, "Oman"],
    [/\bmorocco\b/i, "Morocco"],
    [/\btunis(?:ia)?\b/i, "Tunisia"],
    [/\balger(?:ia)?\b/i, "Algeria"],
    [/\biraq\b/i, "Iraq"],
    [/\blebanon\b/i, "Lebanon"],
    [/\bpalestine\b/i, "Palestine"],
    [/\bturkey\b|\bturkiye\b/i, "Turkey"],
    [/\bgermany\b/i, "Germany"],
    [/\bfrance\b/i, "France"],
    [/\buk\b|\bunited kingdom\b/i, "UK"],
    [/\bcanada\b/i, "Canada"],
    [/\busa\b|\bunited states\b/i, "USA"],
    [/\baustralia\b/i, "Australia"],
    [/\bindia\b/i, "India"],
    [/\bpakistan\b/i, "Pakistan"],
    [/\bmalaysia\b/i, "Malaysia"],
    [/\bnigeria\b/i, "Nigeria"],
  ];

  // Per-country local currency codes — one currency per country, no mixing
  const currencyMap: Record<string, string> = {
    Jordan: "JOD",
    Egypt: "EGP",
    Morocco: "MAD",
    Tunisia: "TND",
    Algeria: "DZD",
    Iraq: "IQD",
    Lebanon: "LBP",
    Palestine: "ILS",
    "Saudi Arabia": "SAR",
    UAE: "AED",
    Kuwait: "KWD",
    Qatar: "QAR",
    Bahrain: "BHD",
    Oman: "OMR",
    Turkey: "TRY",
    Germany: "EUR",
    France: "EUR",
    UK: "GBP",
    Canada: "CAD",
    USA: "USD",
    Australia: "AUD",
    India: "INR",
    Pakistan: "PKR",
    Malaysia: "MYR",
    Nigeria: "NGN",
  };

  // Detect role/field keywords from the conversation
  const rolePatterns: [RegExp, string][] = [
    [/electrical engineer|power engineer/i, "electrical engineer"],
    [/network engineer|networking|ccna|cisco/i, "network engineer"],
    [/software engineer|software developer|programmer|coding/i, "software engineer"],
    [/web developer|frontend|backend|full.?stack/i, "web developer"],
    [/data scientist|machine learning|AI engineer/i, "data scientist"],
    [/cybersecurity|security engineer|penetration/i, "cybersecurity engineer"],
    [/cloud engineer|devops|aws|azure|gcp/i, "cloud engineer"],
    [/mechanical engineer/i, "mechanical engineer"],
    [/civil engineer/i, "civil engineer"],
    [/graphic design/i, "graphic designer"],
    [/project manager|PMP/i, "project manager"],
  ];

  let country = "";
  for (const [pattern, name] of countryPatterns) {
    if (pattern.test(fullText)) { country = name; break; }
  }

  let role = "engineer";
  for (const [pattern, name] of rolePatterns) {
    if (pattern.test(fullText)) { role = name; break; }
  }

  const allUrls = new Set<string>();
  const parts: string[] = [];

  // ── Extract SPECIFIC topics/certs from the conversation ──────────────────
  // Each entry: [pattern, searchTerm, officialSiteFilter | null]
  const specificTopicPatterns: [RegExp, string, string | null][] = [
    // Networking & Cisco
    [/\bCCNA\b/i,                    "CCNA",                                "site:u.cisco.com OR site:netacad.com"],
    [/\bCCNP\b/i,                    "CCNP",                                "site:u.cisco.com"],
    [/\bCCIE\b/i,                    "CCIE",                                "site:u.cisco.com"],
    // Building automation / ELV / smart systems
    [/\bKNX\b/i,                     "KNX smart home automation",           "site:knx.org OR site:knxassociation.org"],
    [/\bBMS\b|\bBuilding Management System\b/i, "BMS building management system", null],
    [/\bSCADA\b/i,                   "SCADA industrial automation",         null],
    [/\bPLC\b/i,                     "PLC programming automation",          null],
    [/\bCCTV\b|\bIP [Cc]amera\b/i,  "CCTV IP surveillance system",         null],
    [/\bFire Alarm\b|\bFAS\b/i,      "fire alarm system",                   null],
    [/\bELV\b/i,                     "ELV extra low voltage systems",       null],
    [/\bAccess Control\b/i,          "access control security systems",     null],
    // Cloud & DevOps
    [/\bAWS\b|\bAmazon Web Services\b/i, "AWS cloud",                       "site:skillbuilder.aws"],
    [/\bAzure\b/i,                   "Microsoft Azure",                     "site:learn.microsoft.com"],
    [/\bGCP\b|\bGoogle Cloud\b/i,    "Google Cloud",                        "site:cloudskillsboost.google"],
    [/\bDocker\b/i,                  "Docker containerization",             null],
    [/\bKubernetes\b|\bK8s\b/i,      "Kubernetes",                          null],
    // Security certs
    [/\bSecurity\+\b/i,              "CompTIA Security+",                   "site:comptia.org"],
    [/\bNetwork\+\b/i,               "CompTIA Network+",                    "site:comptia.org"],
    [/\bA\+\b|CompTIA A\b/i,         "CompTIA A+",                          "site:comptia.org"],
    [/\bCEH\b/i,                     "CEH Certified Ethical Hacker",        "site:eccouncil.org"],
    [/\bOSCP\b/i,                    "OSCP penetration testing",            "site:offsec.com"],
    [/\bCISSP\b/i,                   "CISSP",                               "site:isc2.org"],
    // Project management
    [/\bPMP\b/i,                     "PMP Project Management Professional", "site:pmi.org"],
    [/\bPrince2\b/i,                 "PRINCE2",                             null],
    [/\bAgile\b|\bScrum\b/i,         "Agile Scrum",                         null],
    // Programming / software
    [/\bPython\b/i,                  "Python programming",                  null],
    [/\bJavaScript\b|\bJS\b(?!ON)/i, "JavaScript",                         null],
    [/\bTypeScript\b/i,              "TypeScript",                          null],
    [/\bReact\b/i,                   "React",                               null],
    [/\bNode\.?js\b/i,               "Node.js",                             null],
    [/\bSQL\b/i,                     "SQL database",                        null],
    [/\bMachine Learning\b|\bML\b/i, "machine learning",                    null],
    [/\bData Science\b/i,            "data science",                        null],
    // Electrical / power
    [/\bAutoCAD\b/i,                 "AutoCAD Electrical",                  "site:autodesk.com"],
    [/\bSolar\b|\bPV\b|\bPhotovoltaic\b/i, "solar PV installation",        null],
    [/\bpower systems\b/i,           "power systems electrical",            null],
    [/\bHVAC\b/i,                    "HVAC",                                null],
    // Design
    [/\bFigma\b/i,                   "Figma UI UX design",                  null],
    [/\bPhotoshop\b/i,               "Adobe Photoshop",                     "site:helpx.adobe.com OR site:learn.adobe.com"],
    [/\bUI.?UX\b/i,                  "UI UX design",                        null],
  ];

  const detectedTopics: { term: string; official: string | null }[] = [];
  for (const [pattern, term, official] of specificTopicPatterns) {
    if (pattern.test(fullText)) {
      detectedTopics.push({ term, official });
    }
  }

  // ── Build course queries — per specific topic, priority: official → paid → free
  // If no specific topics detected, fall back to role-based queries
  const courseQueries: string[] = [];

  if (detectedTopics.length > 0) {
    // Take up to 3 most relevant topics to avoid too many queries
    const topTopics = detectedTopics.slice(0, 3);

    for (const { term, official } of topTopics) {
      // 1. Official certification body / vendor portal (highest priority)
      if (official) {
        courseQueries.push(`"${term}" course training enrollment 2025 ${official}`);
      }
      // 2. Udemy (trusted paid, huge catalog)
      courseQueries.push(`"${term}" course site:udemy.com`);
      // 3. Coursera (trusted paid/free, university-backed)
      courseQueries.push(`"${term}" course site:coursera.org`);
      // 4. YouTube (free, practical tutorials)
      courseQueries.push(`"${term}" full course tutorial site:youtube.com`);
    }

    // One LinkedIn Learning sweep across all detected topics combined
    const topicStr = topTopics.map((t) => t.term).join(" OR ");
    courseQueries.push(`(${topicStr}) course site:linkedin.com/learning`);

    // Free fallback (edX / freeCodeCamp) for the primary topic
    courseQueries.push(`"${topTopics[0].term}" course site:edx.org OR site:freecodecamp.org`);
  } else {
    // No specific topics detected — use the broad role as fallback
    const vendorFallback = (() => {
      if (/network engineer|cisco|ccna/i.test(role))   return `networking course site:u.cisco.com OR site:netacad.com`;
      if (/software engineer|web developer/i.test(role)) return `software development course site:learn.microsoft.com`;
      if (/cloud engineer|devops/i.test(role))          return `cloud computing course site:skillbuilder.aws OR site:cloudskillsboost.google`;
      if (/cybersecurity/i.test(role))                  return `cybersecurity course site:comptia.org`;
      if (/data scientist/i.test(role))                 return `data science course site:coursera.org OR site:edx.org`;
      return `${role} training site:coursera.org OR site:skillbuilder.aws`;
    })();
    courseQueries.push(
      vendorFallback,
      `${role} course site:udemy.com`,
      `${role} course site:coursera.org`,
      `${role} full course tutorial site:youtube.com`,
      `${role} free course site:edx.org OR site:freecodecamp.org`,
      `${role} course site:linkedin.com/learning`,
    );
  }

  // ── Salary + market queries (country-based) ────────────────────────────────
  const salaryQueries = country ? (() => {
    const currency = currencyMap[country] ?? "USD";
    return [
      `"${country}" "${role}" entry level junior salary 2024 2025 ${currency}`,
      `${country} ${role} salary monthly 2024 site:numbeo.com`,
      `${country} ${role} average salary ${currency} per month site:payscale.com`,
      `"${country}" ${role} salary 2024 2025 site:glassdoor.com`,
      `${country} ${role} remote freelance salary USD 2025`,
    ];
  })() : [];

  const marketQueries = country ? [
    `"${country}" ${role} job demand hiring 2025 employment opportunities`,
    `"${country}" technology engineering job market 2025 career prospects`,
  ] : [];

  // ── Fire EVERYTHING in parallel ────────────────────────────────────────────
  const allQueries = [...courseQueries, ...salaryQueries, ...marketQueries];
  const results = await Promise.all(allQueries.map((q) => webSearch(q)));
  results.forEach((r) => r.urls.forEach((u) => allUrls.add(u)));

  const courseResults  = results.slice(0, courseQueries.length);
  const salaryResults  = results.slice(courseQueries.length, courseQueries.length + salaryQueries.length);
  const marketResults  = results.slice(courseQueries.length + salaryQueries.length);

  // ── Build course URL catalog with liveness verification ──────────────────
  // Collect all candidate (title, url) pairs first, then verify in parallel
  const candidates: { title: string; url: string }[] = [];
  courseQueries.forEach((_, qi) => {
    const r = courseResults[qi];
    const pageUrls = r.urls.filter(isCoursePage);
    if (pageUrls.length === 0) return;

    // Parse title from Tavily text (format: "Title: ...\nURL: ...\nContent: ...")
    const blocks = r.text.split(/\n\n---\n\n/);
    const urlToTitle: Record<string, string> = {};
    for (const block of blocks) {
      const titleMatch = block.match(/Title:\s*(.+)/);
      const urlMatch   = block.match(/URL:\s*(\S+)/);
      if (titleMatch && urlMatch) urlToTitle[urlMatch[1].trim()] = titleMatch[1].trim();
    }

    pageUrls.forEach((url) => {
      candidates.push({ title: urlToTitle[url] ?? url, url });
    });
  });

  // Deduplicate by URL, then verify all in parallel (HEAD request)
  const seen = new Set<string>();
  const unique = candidates.filter(({ url }) => {
    if (seen.has(url)) return false;
    seen.add(url);
    return true;
  });

  const liveness = await Promise.all(unique.map(({ url }) => verifyUrl(url)));
  const verified = unique.filter((_, i) => liveness[i]);

  console.log(`[catalog] ${candidates.length} candidates → ${unique.length} unique → ${verified.length} live`);

  const catalogLines = verified.map(({ title, url }, i) =>
    `${i + 1}. "${title}"\n   URL: ${url}`
  );

  if (catalogLines.length > 0) {
    parts.push(
      `=== COURSE URL CATALOG — LIVE-VERIFIED ===\n` +
      `Every URL below was checked and confirmed reachable (HTTP live check + Tavily search). ` +
      `You MUST select courseRecommendations ONLY from this list. ` +
      `Copy each URL character-for-character — do NOT modify, shorten, or reconstruct any URL. ` +
      `Do NOT run your own course web_search calls — this catalog is your only course URL source.\n\n` +
      catalogLines.join("\n\n")
    );
  }

  // ── Salary + market context blocks ────────────────────────────────────────
  if (country && salaryQueries.length > 0) {
    const currency = currencyMap[country] ?? "USD";
    const salaryBlock = salaryQueries
      .map((q, i) => `Query [${i + 1}]: ${q}\n\n${salaryResults[i].text}`)
      .join("\n\n---\n\n");

    parts.push(
      `=== PRE-SEARCHED SALARY DATA FOR ${country.toUpperCase()} (${role}) ===\n` +
      `IMPORTANT: Use local currency (${currency}) for local salary figures. ` +
      `Cross-reference all ${salaryQueries.length} queries — pick the figures that appear most consistently, ` +
      `not the highest or most optimistic. Entry-level/junior figures are most relevant for career starters.\n\n` +
      salaryBlock
    );

    const marketBlock = marketQueries
      .map((q, i) => `Query [${i + 1}]: ${q}\n\n${marketResults[i].text}`)
      .join("\n\n---\n\n");

    parts.push(`=== PRE-SEARCHED JOB MARKET DATA FOR ${country.toUpperCase()} ===\n\n${marketBlock}`);
  }

  return { contextBlock: parts.join("\n\n---\n\n"), urls: allUrls };
}

const WEB_SEARCH_TOOL: Groq.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "web_search",
    description:
      "Search the web for current information about courses, salaries, job market data, and career resources.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query to execute.",
        },
      },
      required: ["query"],
    },
  },
};

async function generatePlan(messages: Message[], timezone?: string): Promise<string> {
  type GroqMessage = Groq.Chat.Completions.ChatCompletionMessageParam;

  // Step 1: Pre-run mandatory salary + market searches based on user's country.
  // This guarantees the plan has real local salary data before the model starts.
  const { contextBlock, urls: preUrls } = await preSeedSearches(messages);
  const allSearchUrls = new Set<string>(preUrls);

  const systemContent = getSystemPrompt(timezone);
  const history: GroqMessage[] = [
    { role: "system", content: systemContent },
    ...messages,
  ];

  // Step 2: Inject pre-searched data. Course URLs come from the catalog — the
  // model must NOT search for courses itself. It may still search to refine salary
  // data or find one additional resource not in the catalog.
  if (contextBlock) {
    const hasCatalog = contextBlock.includes("COURSE URL CATALOG");
    history.push({
      role: "user",
      content:
        `[BACKGROUND RESEARCH — real data gathered before plan generation]\n\n${contextBlock}\n\n` +
        (hasCatalog
          ? `COURSE URLS: The "COURSE URL CATALOG" above contains real, verified course pages. ` +
            `You MUST use ONLY URLs from that catalog in courseRecommendations. ` +
            `Copy each URL exactly as listed — zero characters changed. ` +
            `Do NOT search for courses. Do NOT construct or guess any course URL.\n\n`
          : ``) +
        `SALARY DATA: Use the pre-searched salary figures above. ` +
        `You may run 1-2 web_search calls ONLY to refine salary data if the pre-searched figures are sparse. ` +
        `Do not run more than 2 searches total. Then generate the plan immediately.`,
    });
  }

  let searchCount = 0;
  // With the course catalog pre-seeded, the model only needs 0-2 searches (salary refinement)
  const maxSearches = 3;

  while (searchCount < maxSearches) {
    const response = await client.chat.completions.create({
      model: "moonshotai/kimi-k2-instruct",
      max_tokens: 10000,
      messages: history,
      tools: [WEB_SEARCH_TOOL],
      // Don't force searches — the catalog already has what's needed
      tool_choice: "auto",
    });

    const choice = response.choices[0];

    if (!choice.message.tool_calls?.length) {
      return sanitizePlanUrls(choice.message.content ?? "", allSearchUrls);
    }

    history.push(choice.message as GroqMessage);

    for (const toolCall of choice.message.tool_calls) {
      const args = JSON.parse(toolCall.function.arguments) as { query: string };
      console.log(`[Tavily] Search #${searchCount + 1}: "${args.query}"`);
      const { text, urls } = await webSearch(args.query);
      urls.forEach((u) => allSearchUrls.add(u));
      history.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: text,
      });
      searchCount++;
    }
  }

  const finalResponse = await client.chat.completions.create({
    model: "moonshotai/kimi-k2-instruct",
    max_tokens: 10000,
    messages: history,
  });
  return sanitizePlanUrls(finalResponse.choices[0].message.content ?? "", allSearchUrls);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  let messages: Message[];
  let isInit = false;
  try {
    const body = await req.json();
    messages = body.messages;
    isInit = body.isInit === true;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response("Messages required", { status: 400 });
  }

  // Fetch user's existing roadmap to extract country for timezone
  let timezone: string | undefined;
  try {
    const roadmap = await getUserRoadmap(session.user.id!);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const country = (roadmap?.planJson as any)?.profile?.country;
    if (country) timezone = getTimezoneForCountry(country);
  } catch {
    // ignore — timezone will default to UTC
  }

  const encoder = new TextEncoder();

  if (isInit) {
    // Conversational phase + plan generation — stream directly
    const readable = new ReadableStream({
      async start(controller) {
        try {
          const stream = await client.chat.completions.create({
            model: "moonshotai/kimi-k2-instruct",
            max_tokens: 8192,
            messages: [
              { role: "system", content: getSystemPrompt(timezone) },
              ...messages,
            ],
            stream: true,
          });

          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? "";
            if (text) controller.enqueue(encoder.encode(text));
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  }

  // Plan generation phase — run web searches then emit full result
  const readable = new ReadableStream({
    async start(controller) {
      try {
        const content = await generatePlan(messages, timezone);
        controller.enqueue(encoder.encode(content));
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
