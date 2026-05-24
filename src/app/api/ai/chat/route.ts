import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { auth } from "~/auth";
import { getUserRoadmap, addUserApiCost, setUserResearchPool, getUserResearchPool, canGeneratePlan, incrementPlanGenerations, type ResearchPoolEntry } from "@/lib/db";
import { getTimezoneForCountry, getLocalizedDateTime } from "@/lib/timezone";
import { isAdmin } from "@/lib/admin";

const client = new Anthropic();

// Interview + lightweight turns run on Haiku (cheapest).
const CLAUDE_MODEL = "claude-haiku-4-5";

// Two-stage deep research, run as two separate requests:
//   Stage 1 (GATHER)  — Haiku runs the live web searches and collects real
//     course URLs + market figures into a compact digest.
//   Stage 2 (SYNTH)   — Sonnet writes the plan JSON from that digest (no search).
// The writer runs on Sonnet for higher-quality prose. Sonnet's full ~6-8k-token
// plan generation can exceed 60s, so each route declares maxDuration = 300 (the
// platform's max with Fluid Compute) — there is no longer a 60s wall-clock cap to
// dodge. The gatherer stays on Haiku: it only extracts live data, which plays to
// Haiku's strengths and keeps the token-heavy search work cheap.
const GATHER_MODEL = "claude-haiku-4-5";
const GATHER_WEB_SEARCH = "web_search_20250305";
const SYNTH_MODEL = "claude-sonnet-4-6";

// Pricing (tracked against the per-user budget for visibility; never blocks).
const HAIKU_IN  = 1.00 / 1_000_000;   // $1 / MTok
const HAIKU_OUT = 5.00 / 1_000_000;   // $5 / MTok
// Writer (synthesize) rates — keep in lockstep with SYNTH_MODEL above.
const SONNET_IN  = 3.00 / 1_000_000;  // $3 / MTok
const SONNET_OUT = 15.00 / 1_000_000; // $15 / MTok
const SYNTH_IN  = SONNET_IN;
const SYNTH_OUT = SONNET_OUT;
const COST_PER_WEB_SEARCH = 10.00 / 1000; // $0.01 / search

// Plan generation is split across TWO requests — "gather" (Haiku + web search)
// then "synthesize" (Sonnet writes the plan from the gathered data). Sonnet's
// synthesis can run well past 60s, so we claim the platform's full 300s window
// (Fluid Compute) rather than racing a 60s wall clock.
export const maxDuration = 300;

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
FOLLOW THE USER'S ACTUAL GOAL — DO NOT FORCE A CAREER FRAME
═══════════════════════════════════════════
This is NOT a jobs tool. It is a genuine learning/life advisor. Build the plan around what the user ACTUALLY asked for, even when that has nothing to do with employment or income.

Classify the goal and adapt accordingly:
- ACADEMIC / SCHOOL (e.g. "help me with 7th-grade math and science", "pass my chemistry final", "understand calculus", "do well this semester"): Build a STUDY plan — topic breakdown, mastery milestones, practice strategy, exam prep, study schedule. Do NOT talk about salaries, job markets, "target market", or "work style". These do not apply to a school student and make the advice feel wrong.
- PERSONAL / CURIOSITY (e.g. "learn guitar", "understand AI for fun", "read more philosophy"): Build a learning plan around enjoyment, steady progress, and milestones. No market/salary framing.
- CAREER / INCOME (e.g. "become a network engineer", "switch to data science", "earn more freelancing"): The full market/salary/targetMarket framing applies — use it.

CRITICAL: For ACADEMIC and PERSONAL goals, OMIT the entire "marketInsights" object and leave profile.targetMarket / profile.workStyle empty ("") — never invent a salary range or job-market claim for a school subject or a hobby. Only include marketInsights when the goal is genuinely about a career, job, or income.

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
Once you have everything you need, immediately generate the JSON plan. No closing remarks or transition sentences — go directly to the JSON. No more questions unless something critical is truly missing.

═══════════════════════════════════════════
USING THE PROVIDED RESEARCH — REAL DATA ONLY
═══════════════════════════════════════════
Live web research has ALREADY been gathered for you and appears in the conversation as a "BACKGROUND RESEARCH" block plus a "COURSE URL CATALOG". You do NOT search the web yourself — base every figure and course on THAT provided research:
- marketInsights (salaryRange, localDemand, globalDemand, adjacentOpportunities): use the figures and signals from the BACKGROUND RESEARCH. Keep the exact currencies as found; never invent numbers.
- courseRecommendations: choose the best-matched courses from the COURSE URL CATALOG and copy each url EXACTLY as listed. If a course you want is not in the catalog, set its url to "".

When building courseRecommendations:
- Take URLs DIRECTLY from your web_search results — copy them character-for-character.
- NEVER invent, guess, or reconstruct a URL from memory. If you did not get the exact course URL from a search result, set url to "".
- Prefer pages that are clearly a specific course/tutorial (e.g. coursera.org/learn/..., udemy.com/course/..., learn.microsoft.com/..., youtube.com/watch?v=...), not platform homepages.

When building marketInsights.salaryRange and marketInsights.localDemand: use figures and demand assessments that appeared in your search results for the user's country/role, with the correct ISO currency code.

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

RELATED & OTHER AREAS — ADJACENT OPPORTUNITIES:
Beyond their primary goal, identify 2-3 adjacent or alternative fields/roles that leverage similar skills and currently show stronger or growing demand — especially valuable when their primary local market is saturated. Populate marketInsights.adjacentOpportunities with these. Ground the demand signals in the BACKGROUND RESEARCH provided to you (the gatherer already collected adjacent-field demand) — do not invent fields or numbers.

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
    "recommendation": "2-3 sentences of strategic advice tailored precisely to their country, stated target market, work style preference, and goal — referencing what they told you",
    "adjacentOpportunities": [
      {
        "field": "Name of a related or alternative field/role that leverages similar skills and currently shows stronger or growing demand than the primary local market",
        "why": "1-2 sentences: how it connects to their background and goal, and why it is worth considering (demand, pay, remote potential)",
        "demandSignal": "Short current-demand note grounded in your search results (e.g. 'High growth, many remote roles in 2025')"
      }
    ]
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
      "color": "#f97316"
    },
    {
      "topic": "Second priority area — descriptive label",
      "score": 75,
      "description": "Full sentence on how developing this skill directly supports and accelerates their specific path",
      "color": "#fb923c"
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
      "color": "#f97316",
      "hours": 10
    },
    {
      "subject": "CRITICAL: 1-3 word max, no trailing symbols. Example: 'Networking Tools', 'Cloud Skills', 'Python Basics'",
      "percentage": 30,
      "color": "#fb923c",
      "hours": 6
    },
    {
      "subject": "CRITICAL: 1-3 word max. Example: 'Portfolio Work', 'Real Projects', 'Career Prep'",
      "percentage": 20,
      "color": "#a78bfa",
      "hours": 4
    }
  ],
  "courseRecommendations": "IMPORTANT — THREE MANDATORY RULES: (1) OFFICIAL VENDOR FIRST: The first 1-2 courses MUST be from the official vendor portal (Cisco U. for CCNA/networking, Microsoft Learn for Azure/M365, AWS Skill Builder for AWS, Google Cloud Skills Boost for GCP, CompTIA CertMaster for CompTIA, KNX Association for KNX, etc.). Never bury official courses behind third-party ones. (2) BILINGUAL for Arabic-speaking countries: If the user is from Jordan, Egypt, Saudi Arabia, UAE, Kuwait, Bahrain, Qatar, Oman, Iraq, Syria, Lebanon, Morocco, Algeria, Tunisia, Libya, Sudan, Yemen, or Palestine — include at least 2 Arabic-language courses (Arabic Udemy courses, Arabic YouTube channels like Elzero Web School, محمد الدسوقي, قناة البرمجة العربية, etc.) in addition to the English courses. Label them so users know the language. (3) FULL RANGE: Also include paid platforms (Udemy, Coursera, LinkedIn Learning) and free resources (YouTube, freeCodeCamp, edX) — minimum 6-8 total.",
  "courseRecommendations": [
    {
      "title": "Exact course title as found in your web search — real and currently available",
      "platform": "Official vendor portal (Cisco U., Microsoft Learn, AWS Skill Builder, CompTIA CertMaster, etc.) — ALWAYS list official vendor course FIRST",
      "instructor": "Exact instructor name, organization name, or official platform name from your search",
      "estimatedHours": 20,
      "level": "Beginner",
      "focus": "1-2 sentences: specifically what this course covers and exactly why it is the right match for their current level, goal, and the phase they should take it in",
      "phase": "Month 1-2",
      "url": "CRITICAL: Copy the URL EXACTLY from the COURSE URL CATALOG provided in the background research — character for character, nothing changed. NEVER construct, guess, shorten, or modify a URL. NEVER use a platform homepage (e.g. 'coursera.org' alone). Only use a URL that points to the specific course page from the catalog. If the course is not in the catalog, use empty string \"\".",
      "sourceType": "official | paid | certificate | free — classify each course: 'official' for vendor portals (Cisco U., AWS Skill Builder, Microsoft Learn, Google Cloud Skills Boost, CompTIA CertMaster); 'certificate' for Coursera Certificate, edX Professional Certificate, Google Career Certificate, AWS Certification, CompTIA/Cisco/PMI exams; 'paid' for Udemy, LinkedIn Learning, Pluralsight, Coursera subscription; 'free' for YouTube, freeCodeCamp, Khan Academy, MIT OpenCourseWare, free Coursera audit tracks",
      "isFree": "true if sourceType is 'free', false otherwise",
      "hasCertificate": "true if this course leads to an official certificate or certification exam prep, false otherwise"
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
- courseRecommendations MUST contain 6-8 REAL courses chosen from the COURSE URL CATALOG / BACKGROUND RESEARCH provided — real titles, real instructors, real platforms. Do NOT limit to 4. Users need options across all price ranges and platforms
- courseRecommendations OFFICIAL COURSE IS MANDATORY: the FIRST course MUST be the official certification/training provider's OWN course (Cisco U./NetAcad for CCNA, Microsoft Learn for Azure, AWS Skill Builder for AWS, Google Cloud Skills Boost for GCP, CompTIA CertMaster for CompTIA, KNX Association for KNX, PMI for PMP, etc.). NEVER omit it and NEVER replace it with a third-party Udemy/Coursera course. If the official course's exact URL was not in the COURSE URL CATALOG, STILL include it as the first entry with its real title/platform and url "" — the Search button will resolve the link. A plan missing its official anchor course is invalid.
- courseRecommendations DIFFICULTY SEQUENCING: order courses by ascending difficulty (Beginner → Beginner to Intermediate → Intermediate → Intermediate to Advanced → Advanced) and align each course's "phase" to the month range where it belongs, so earlier months hold the easier foundational courses and later months hold the advanced ones. After the official anchor, list paid third-party platforms (Udemy, Coursera, LinkedIn Learning), then free platforms (YouTube, freeCodeCamp, edX), all kept in difficulty/phase order.
- courseRecommendations NO REPEATS: never list the same course (same title or same URL) more than once across any phase.
- courseRecommendations MUST include sourceType, isFree, and hasCertificate fields on EVERY course entry — these power the source-type badges shown to users so they know what costs money vs what is free vs what earns a certificate
- courseRecommendations.url CRITICAL: ONLY use a URL that appears word-for-word in the COURSE URL CATALOG provided in the background research. NEVER construct, guess, or hallucinate a URL. If the exact course URL was not in the catalog, set url to "" (empty string). The "Search" fallback button will handle finding it. A fabricated URL that leads to a 404 destroys user trust — empty string is always better.
- roadmap phase count and total duration MUST match their stated timeline exactly
- notice in marketInsights appears ONLY for genuine strategic concerns — never invent problems
- marketInsights.adjacentOpportunities MUST contain 2-3 real, relevant related/alternative fields with current demand signals from your search data — this is how users discover stronger paths in related and other areas
- salaryRange must be specific to their stated target market (Gulf, Europe, local, etc.) — not just generic USD
- All descriptions are full meaningful sentences — this is someone's life roadmap, not a keyword list
- timeAllocation[].subject MUST be 1–3 words maximum, clean and readable, with NO trailing symbols (+, &, ,, -). These names display in a weekly schedule grid. BAD: "KNX + CCNA + Networking Fundamentals". GOOD: "KNX & CCNA", "Hands-On Labs", "Portfolio Work"
- Do NOT include a "weeklySchedule" field at all — the detailed day-by-day weekly schedule is generated separately, on demand, by a dedicated step. Omit it from this JSON entirely.
- This roadmap is real and will be used by real people to change their lives — every number, course, salary, and recommendation must be accurate and specific`;

// Compact conversational prompt used ONLY during the interview streaming
// phase (chat isInit=true). Keeps each turn small so the interview is fast
// and cheap. The full SYSTEM_PROMPT_BODY (with the complete JSON schema) is
// sent in the synthesize phase, where the actual plan is built.
const CONVERSATION_SYSTEM_PROMPT = `You are eSpark 🌟 — a warm, smart AI life advisor who feels like a brilliant friend. You help students, career starters, career switchers, professionals, freelancers, entrepreneurs, and lifelong learners map a realistic path to their goal.

LANGUAGE: Detect the user's language and respond ENTIRELY in it. Arabic user → Arabic reply. English user → English. Match dialect when they use one. Use emojis naturally (not every sentence).

OPENING (first turn only): ONE warm message — introduce yourself as eSpark, say you'll help them map their path, and ask naturally who they are, where they're from, and whether they're studying, working, or something else.

CONVERSATION STYLE:
- Talk like a friend, not a form. React briefly to each answer, then ask the next thing.
- ONE topic at a time. Never re-ask something they already answered.
- If they give multiple answers at once, absorb them all and ask only what's still missing.
- Warm, smart, casual — genuinely curious about their story.

ADAPT TO THE GOAL — this is NOT just a careers tool. If someone wants help with school subjects (e.g. "7th-grade math"), exam prep, or learning something for personal interest, build them a STUDY/LEARNING plan and do NOT ask about job markets, target income, or "work style" — those questions feel wrong for a student or hobby learner. Only ask career/market questions when the goal is genuinely about a job or income.

INFO TO COLLECT (weave naturally, adapt order and SKIP what doesn't fit the goal):
1. Identity: name, country, current situation (student / working / other), current field or subjects
2. Goal: what they actually want — a dream role, OR mastering specific subjects, OR an exam to pass, OR a skill to learn for themselves
3. (Career goals only) Target market: local vs. abroad vs. remote / freelance / global
4. Current level / knowledge and obstacles
5. Time available per week and rough timeline

HARD LIMIT: Ask at MOST 4 short questions total before you must generate. If you still have gaps after 4 turns, infer reasonable defaults from everything they've said (and the selected focus area if provided) and generate now.

SKIP-TO-GENERATE (highest priority — overrides everything else): If the user at any point asks you to stop asking and just generate — including phrases like "generate now", "just generate", "skip", "skip the questions", "enough questions", "go", "start", "do it", "make the plan", "yalla", "خلاص", "ابدأ", "ولّد", "اعمل الخطة", or they repeat a request, send a single "?", "!", or otherwise signal impatience — you MUST immediately stop asking and emit the LEARNING_PLAN JSON on your very next reply. Do NOT ask one more question. Fill in any missing profile fields with sensible defaults based on what they've told you so far plus reasonable assumptions (e.g., use their first name or "Learner", their country if known else "Global", targetMarket "Global Remote" if unclear, workStyle "Mixed" if unclear). Never refuse a skip request.

ONCE YOU HAVE ALL FIVE PIECES — OR the user asked to skip/generate — OR you hit the 4-question hard limit — output ONLY this minimal JSON on its own, no text before or after, no markdown fences, no explanation:
{"type":"LEARNING_PLAN","profile":{"name":"<first name or 'Learner'>","country":"<country or 'Global'>","targetMarket":"<Local [Country] | Gulf Region | Europe | North America | Global Remote>","workStyle":"<Employed | Freelance | Remote Employee | Business Owner | Mixed>","summary":"<one sentence acknowledging their situation in their language>"}}

That minimal JSON is the signal that triggers the full roadmap generation (courses, salary data, schedule, phases) in the next step — do NOT try to produce the full plan here. The system handles it.`;

// Volatile date/time block. Kept SEPARATE from the cached system prompt so the
// live clock never invalidates the cached prefix (prompt caching is a prefix
// match — a changing timestamp at the front would re-bill the whole prompt and
// never hit the cache).
function dateBlock(timezone?: string): string {
  const tz = timezone || "UTC";
  return `Today's date & time (${tz}): ${getLocalizedDateTime(tz)}`;
}

interface Message {
  role: "user" | "assistant";
  content: string;
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

// Course-list post-processing (deterministic — runs after the writer):
//   1. Drop duplicates (same title OR same URL appearing more than once).
//   2. Stable-sort by ascending phase month → ascending difficulty → source
//      priority (official → certificate → paid → free), so the official anchor
//      course leads and the rest read beginner-to-advanced within each month.
// Runs server-side on the persisted plan, so the UI's index-keyed selection,
// the schedule generator, and course-link resolution all stay stable.
const LEVEL_RANK: Record<string, number> = {
  beginner: 0,
  "beginner to intermediate": 1,
  intermediate: 2,
  "intermediate to advanced": 3,
  advanced: 4,
};
const SOURCE_RANK: Record<string, number> = { official: 0, certificate: 1, paid: 2, free: 3 };

function phaseStartMonth(phase: unknown): number {
  if (typeof phase !== "string") return 999;
  const m = phase.match(/\d+/);
  return m ? parseInt(m[0], 10) : 999;
}
function levelRank(level: unknown): number {
  if (typeof level !== "string") return 2;
  return LEVEL_RANK[level.trim().toLowerCase()] ?? 2;
}
function sourceRank(sourceType: unknown): number {
  if (typeof sourceType !== "string") return 2;
  return SOURCE_RANK[sourceType.trim().toLowerCase()] ?? 2;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function orderAndDedupeCourses(plan: Record<string, any>): void {
  if (!Array.isArray(plan.courseRecommendations)) return;

  const seen = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deduped = plan.courseRecommendations.filter((c: any) => {
    const titleKey = typeof c?.title === "string" ? c.title.trim().toLowerCase().replace(/\s+/g, " ") : "";
    const urlKey = typeof c?.url === "string" ? c.url.trim().toLowerCase().replace(/\/$/, "") : "";
    if (!titleKey && !urlKey) return true; // nothing to key on — keep it
    if ((titleKey && seen.has(`t:${titleKey}`)) || (urlKey && seen.has(`u:${urlKey}`))) return false;
    if (titleKey) seen.add(`t:${titleKey}`);
    if (urlKey) seen.add(`u:${urlKey}`);
    return true;
  });

  // Array.prototype.sort is stable (ES2019+), so equal keys keep writer order.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deduped.sort((a: any, b: any) => {
    const pm = phaseStartMonth(a?.phase) - phaseStartMonth(b?.phase);
    if (pm !== 0) return pm;
    const lr = levelRank(a?.level) - levelRank(b?.level);
    if (lr !== 0) return lr;
    return sourceRank(a?.sourceType) - sourceRank(b?.sourceType);
  });

  plan.courseRecommendations = deduped;
}

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

    orderAndDedupeCourses(plan);

    return JSON.stringify(plan);
  } catch {
    return raw;
  }
}


// Stage 1 gatherer — Haiku faithfully collects live data; it does NOT design
// the plan. Keeping it a pure extractor plays to Haiku's strengths and keeps
// the token-heavy search work cheap and fast.
const GATHER_SYSTEM_PROMPT = `You are a research gatherer for a learning/life planner. Use the web_search tool to collect REAL, current data for the user described in the conversation. Soft cap: about 5 searches — merge needs into each query.

FIRST, classify the goal:
- CAREER / INCOME goal (a job, role, freelancing, earning): gather salary + job-market data AND courses, and ALWAYS spend one search on the official certification/training provider (rule 3).
- ACADEMIC / SCHOOL goal (school or university subjects, exam prep, e.g. "7th-grade math") or PERSONAL / HOBBY goal (learning for interest): DO NOT search for salaries or job-market demand — they are irrelevant. SKIP the entire MARKET DATA section. Spend all searches on the best real learning resources for those specific subjects/topics (free first: Khan Academy, YouTube, freeCodeCamp, OpenStax, MIT OCW, plus reputable paid). For Arabic-speaking users, include Arabic-language options.

Gather, in priority order (skip market items for academic/personal goals):
1. CURRENT salary + job-market demand for the user's target role in their country/target market (CAREER goals only). Note 2-3 adjacent/related fields that currently have stronger or growing demand.
2. The best real, specific courses for their goal — official vendor courses first (Cisco U., Microsoft Learn, AWS Skill Builder, CompTIA, KNX, etc.), then reputable paid (Coursera, Udemy, LinkedIn Learning) and free (YouTube, freeCodeCamp, edX). For Arabic-speaking countries, include Arabic-language options.
3. THE OFFICIAL CERTIFICATION COURSE — MANDATORY FOR CAREER/CERTIFICATION GOALS (skip for academic/school subjects and hobbies, which have no certification). Run a dedicated search for the certification/skill's OWN official training portal and capture that exact course/training URL. Examples: CCNA → Cisco Learning Network / Cisco U. / NetAcad; Azure or M365 → Microsoft Learn; AWS → AWS Skill Builder; Google Cloud → Cloud Skills Boost; CompTIA → CompTIA CertMaster; KNX → KNX Association; PMP → PMI; Security+/CISSP/CEH → the issuing body. The official course is the anchor of the plan — never return a candidate list without it. If you genuinely cannot find the official URL, still list the official course by name with a blank URL so the writer can include it.

You do NOT design or format the plan. You only gather and faithfully report what you found, in this exact shape (plain text, no markdown fences):

MARKET DATA: (CAREER goals only — OMIT this whole section for academic/school or personal/hobby goals)
- Salary (local): <figures + exact currency as found>
- Salary (regional / global / remote): <figures + currency>
- Demand: <honest local + global demand, 1-2 lines>
- Adjacent fields: <2-3 related/alternative fields, each with a short current-demand note>

COURSE CANDIDATES (only courses you actually found — copy details verbatim):
- <Title> | <Platform> | <Instructor or Channel> | <exact URL from results>
(8-12 candidates spanning official / paid / free; copy URLs CHARACTER-FOR-CHARACTER; never invent a URL — drop the line if you don't have a real one.)

Output ONLY those two sections. No commentary, no plan.`;

async function gatherResearch(
  messages: Message[],
  timezone?: string,
): Promise<{ digest: string; pool: { url: string; title: string }[]; searchedUrls: Set<string>; cost: number }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await (client.messages.create as any)({
    model: GATHER_MODEL,
    max_tokens: 6000,
    system: [
      { type: "text", text: GATHER_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      { type: "text", text: dateBlock(timezone) },
    ],
    tools: [{ type: GATHER_WEB_SEARCH, name: "web_search", max_uses: 5 }],
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const pool: { url: string; title: string }[] = [];
  const searchedUrls = new Set<string>();
  const seen = new Set<string>();
  let searchCount = 0;
  let digest = "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const block of response.content as any[]) {
    if (block.type === "text") {
      digest += block.text ?? "";
    } else if (block.type === "web_search_tool_result") {
      searchCount += 1;
      const items = block.content;
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item?.url && typeof item.url === "string") {
            searchedUrls.add(item.url);
            if (!seen.has(item.url)) {
              seen.add(item.url);
              pool.push({ url: item.url, title: typeof item.title === "string" ? item.title : "" });
            }
          }
        }
      }
    }
  }

  const usage = response.usage ?? {};
  const billedSearches =
    typeof usage.server_tool_use?.web_search_requests === "number"
      ? usage.server_tool_use.web_search_requests
      : searchCount;
  const cost =
    (usage.input_tokens ?? 0) * HAIKU_IN +
    (usage.cache_creation_input_tokens ?? 0) * HAIKU_IN * 1.25 +
    (usage.cache_read_input_tokens ?? 0) * HAIKU_IN * 0.1 +
    (usage.output_tokens ?? 0) * HAIKU_OUT +
    billedSearches * COST_PER_WEB_SEARCH;

  console.log(`[deep-research] stage1 gather (Haiku) → ${pool.length} URLs, ${billedSearches} searches, $${cost.toFixed(4)}`);
  return { digest, pool, searchedUrls, cost };
}

// Stage 2 synthesizer — turns the gathered digest into the plan JSON on `model`
// (Sonnet for accuracy). No web search, small input. Returns text + cost.
async function runSynthesis(
  model: string,
  inRate: number,
  outRate: number,
  messages: Message[],
  researchBlock: string,
  timezone?: string,
): Promise<{ text: string; cost: number }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await (client.messages.create as any)({
    model,
    // The full plan JSON (8 courses + roadmap + schedule + every text field) can
    // run ~8-12k output tokens on Sonnet. The old 8192 cap truncated the JSON
    // mid-array, dropping the trailing `nextSteps` field that isValidPlan
    // REQUIRES — so the client silently rejected the plan. 16000 gives headroom.
    max_tokens: 16000,
    system: [
      { type: "text", text: SYSTEM_PROMPT_BODY, cache_control: { type: "ephemeral" } },
      { type: "text", text: dateBlock(timezone) },
    ],
    messages: [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: researchBlock },
    ],
  });

  let text = "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const block of response.content as any[]) {
    if (block.type === "text") text += block.text ?? "";
  }

  // A truncated response (hit max_tokens) yields invalid JSON that the client
  // rejects, surfacing as the generic "couldn't build your roadmap" message.
  // Log it loudly so the cause is visible in runtime logs instead of silent.
  if (response.stop_reason && response.stop_reason !== "end_turn") {
    console.warn(`[deep-research] synth stop_reason=${response.stop_reason} (text ${text.length} chars) — output may be truncated`);
  }

  const usage = response.usage ?? {};
  const cost =
    (usage.input_tokens ?? 0) * inRate +
    (usage.cache_creation_input_tokens ?? 0) * inRate * 1.25 +
    (usage.cache_read_input_tokens ?? 0) * inRate * 0.1 +
    (usage.output_tokens ?? 0) * outRate;

  return { text, cost };
}

// Build the research context the synthesizer reads. Shared by the synthesize
// phase whether the bundle was just gathered (passed from the client) or read
// back from the persisted pool.
function buildResearchBlock(digest: string, pool: ResearchPoolEntry[]): string {
  const catalog = pool
    .map((e) => `- ${e.title || "(untitled)"} | ${e.url}`)
    .join("\n");
  return (
    `BACKGROUND RESEARCH (gathered live via web search — base the plan on THIS, do not invent):\n\n` +
    `${digest || "(market digest unavailable — use your best current knowledge, but do NOT fabricate specific salary numbers or course URLs)"}\n\n` +
    `COURSE URL CATALOG (real URLs from search — copy EXACTLY into courseRecommendations.url; use "" if a course is not listed here):\n${catalog || "(none found)"}`
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const userId = session.user.id!;

  let messages: Message[];
  let isInit = false;
  let scenario = "";
  let phase = "";
  let providedResearch: { digest: string; pool: ResearchPoolEntry[] } | null = null;
  try {
    const body = await req.json();
    messages = body.messages;
    isInit = body.isInit === true;
    scenario = typeof body.scenario === "string" ? body.scenario.slice(0, 120) : "";
    phase = typeof body.phase === "string" ? body.phase : "";
    if (body.research && typeof body.research === "object") {
      const digest = typeof body.research.digest === "string" ? body.research.digest : "";
      const pool: ResearchPoolEntry[] = Array.isArray(body.research.pool)
        ? body.research.pool
            .filter((e: unknown): e is ResearchPoolEntry =>
              !!e && typeof (e as ResearchPoolEntry).url === "string")
            .map((e: ResearchPoolEntry) => ({ url: e.url, title: typeof e.title === "string" ? e.title : "" }))
        : [];
      providedResearch = { digest, pool };
    }
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
    // Detect explicit "skip the questions, just generate" intent from the user's
    // latest message (EN + AR + common impatience signals). When present, inject a
    // forcing instruction so the model reliably emits the LEARNING_PLAN JSON on
    // this turn instead of asking another question.
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const lastUserText = (lastUser?.content ?? "").trim().toLowerCase();
    // Skip-to-generate only makes sense AFTER the conversation has started — i.e.
    // once the advisor has asked at least one question. On the opening turn there
    // is nothing to skip, and honoring it there causes the advisor to dump a plan
    // signal immediately (e.g. the auto-greeting "I'm ready..." trips "ready").
    const conversationStarted = messages.some((m) => m.role === "assistant");
    const skipIntent =
      conversationStarted &&
      (/\b(just\s+generate|generate\s+now|generate\s+it|generate\s+the\s+plan|make\s+the\s+plan|skip|skip\s+(the\s+)?questions?|enough\s+questions?|stop\s+asking|go(\s+now)?|start\s+(now|already)|do\s+it(\s+already)?|ready|i'?m\s+ready)\b/.test(
        lastUserText,
      ) ||
      /خلاص|يلا|يالله|ابدأ|ولّد|ولد الخطة|اعمل الخطة|كفى|بس|خلّص/.test(lastUser?.content ?? "") ||
      /^[!?.…,\s]+$/.test(lastUser?.content ?? ""));

    const skipNote = skipIntent
      ? `\n\n═══════════════════════════════════════════\nUSER SKIP-TO-GENERATE SIGNAL DETECTED\n═══════════════════════════════════════════\nThe user's latest message is an explicit request to stop asking questions and generate the plan now (or a clear impatience signal). Per the SKIP-TO-GENERATE rule, you MUST output ONLY the LEARNING_PLAN JSON on this turn — no questions, no commentary, no markdown fences. Fill any missing profile fields with sensible defaults inferred from the conversation so far.\n`
      : "";

    // Conversational phase + plan generation — stream directly
    const readable = new ReadableStream({
      async start(controller) {
        let wroteAnything = false;
        try {
          const scenarioNote = scenario
            ? `\n\n═══════════════════════════════════════════\nUSER SELECTED FOCUS AREA\n═══════════════════════════════════════════\nThe user has selected their focus area before starting: "${scenario}". Tailor your opening question, conversation, and final roadmap to align with this intent. You do NOT need to ask them about their focus — it is already known.\n`
            : "";
          const stream = client.messages.stream({
            model: CLAUDE_MODEL,
            max_tokens: 2048,
            system: [
              {
                type: "text",
                text: CONVERSATION_SYSTEM_PROMPT,
                cache_control: { type: "ephemeral" },
              },
              {
                type: "text",
                text: `${dateBlock(timezone)}${scenarioNote}${skipNote}`,
              },
            ],
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
          });

          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const text = event.delta.text;
              if (text) {
                wroteAnything = true;
                controller.enqueue(encoder.encode(text));
              }
            }
          }
          controller.close();
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[chat:isInit] Claude streaming error:", msg, err);
          // Emit a user-visible error instead of closing silently so the
          // client's reader doesn't throw and lose the diagnostic.
          if (!wroteAnything) {
            controller.enqueue(encoder.encode(`Sorry — the AI service returned an error: ${msg}`));
          }
          controller.close();
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

  // ── Plan quota gate ──────────────────────────────────────────────
  // gather + synthesize together build one full plan. Free users get a single
  // plan generation (lifetime); paid subscriptions are unlimited; quota top-ups
  // extend the free allotment. The conversational interview (isInit) above is
  // always free — only the actual plan build is gated. Admins are never gated.
  if (!isAdmin(session.user.email) && !(await canGeneratePlan(userId))) {
    return new Response(
      JSON.stringify({ error: "quota_exceeded", upgrade: true }),
      { status: 402, headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" } },
    );
  }

  // ── Stage 1: GATHER ──────────────────────────────────────────────
  // Haiku runs the live web searches and returns a compact research bundle.
  // This call is fast (well under 60s), so it never trips the runtime timeout.
  // The plan itself is written by a SECOND request (synthesize, below) —
  // splitting the work across two calls is what keeps each one inside Vercel's
  // per-call limit while still using Sonnet for the final plan.
  if (phase === "gather") {
    try {
      const research = await gatherResearch(messages, timezone);
      // Persist the pool so course-link lookups can resolve URLs for free, and
      // so synthesize can recover it if the client doesn't echo it back.
      if (research.pool.length > 0) await setUserResearchPool(userId, research.pool);
      if (research.cost > 0) void addUserApiCost(userId, research.cost);
      return new Response(
        JSON.stringify({ type: "RESEARCH", digest: research.digest, pool: research.pool }),
        { headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" } },
      );
    } catch (err) {
      console.error("[deep-research] gather phase failed:", err instanceof Error ? err.message : err);
      // Return an empty bundle so the synthesize step can still produce a plan.
      return new Response(
        JSON.stringify({ type: "RESEARCH", digest: "", pool: [] }),
        { headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" } },
      );
    }
  }

  // ── Stage 2: SYNTHESIZE ──────────────────────────────────────────
  // Sonnet writes the full plan from the already-gathered research (no web
  // search here → small input, finishes inside the limit). Falls back to the
  // persisted pool if the client didn't echo one, and to Haiku if Sonnet errors.
  const readable = new ReadableStream({
    async start(controller) {
      try {
        const digest = providedResearch?.digest ?? "";
        let pool: ResearchPoolEntry[] = providedResearch?.pool ?? [];
        if (pool.length === 0) {
          try { pool = await getUserResearchPool(userId); } catch { /* no persisted pool */ }
        }
        const researchBlock = buildResearchBlock(digest, pool);
        const validUrls = new Set<string>(pool.map((e) => e.url).filter(Boolean));

        let synth: { text: string; cost: number };
        try {
          synth = await runSynthesis(SYNTH_MODEL, SYNTH_IN, SYNTH_OUT, messages, researchBlock, timezone);
        } catch (err) {
          // Retry once to ride out a transient API error.
          console.error("[deep-research] synthesis failed; retrying:", err instanceof Error ? err.message : err);
          synth = await runSynthesis(SYNTH_MODEL, SYNTH_IN, SYNTH_OUT, messages, researchBlock, timezone);
        }
        console.log(`[deep-research] stage2 synth (${SYNTH_MODEL}) → $${synth.cost.toFixed(4)}`);
        if (synth.cost > 0) void addUserApiCost(userId, synth.cost);

        // Count this successful plan build against the user's quota. Runs once
        // per generation (synthesize is the single plan-writing call).
        void incrementPlanGenerations(userId);

        controller.enqueue(encoder.encode(sanitizePlanUrls(synth.text, validUrls)));
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
