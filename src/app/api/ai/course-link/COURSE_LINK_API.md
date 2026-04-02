# Course Link API — `/api/ai/course-link`

> Finds the best direct enrollment or watch URL for a course using Claude Sonnet 4.6 with built-in web search.

---

## How It Works — End-to-End Flow

```
POST /api/ai/course-link
        │
        ▼
  Auth check (NextAuth session required)
        │
        ▼
  Parse body: { title, platform, instructor, country }
        │
        ▼
  In-memory cache lookup  ──hit──▶  return cached URL immediately (free)
        │ miss
        ▼
  Per-user budget check ($0.70 cap)
        │ under budget
        ▼
  findCourseLink()  →  Claude Sonnet 4.6 + web_search tool (max 1 search)
        │
        ▼
  Parse response:
    • claudeUrl  = first URL in Claude's TEXT reply  (Claude's own selection)
    • searchUrls = all URLs from raw search results  (fallback pool)
        │
        ▼
  URL selection:
    if claudeUrl is a real course page  →  use claudeUrl  ✓
    else                                →  ranked fallback from searchUrls
        │
        ▼
  Final fallback: Google search query URL (never returns empty to UI)
        │
        ▼
  Store result in cache + record cost in DB
        │
        ▼
  return { url: string, quota_exceeded?: true }
```

---

## URL Selection Logic — Priority Order

### Step 1 — Claude's own choice (highest confidence)

Claude is instructed to return **exactly one bare URL** after searching. The first URL found in its text reply is treated as its deliberate selection. This is used directly **if and only if** `isCoursePage()` confirms it points to an actual course/lesson (not a homepage).

> **Why this approach?** Claude reads the search results and evaluates them. Its text reply is more reliable than any URL that happens to appear in raw search-result metadata.

### Step 2 — Ranked fallback pool (if Claude's pick fails `isCoursePage`)

All URLs extracted from the raw web search results are ranked in this order:

| Rank | Condition |
|------|-----------|
| 1 | `isOfficial(url)` **AND** `isCoursePage(url)` |
| 2 | `isOfficial(url)` (any page on official domain) |
| 3 | `isTrusted(url)` **AND** `isCoursePage(url)` **AND** not YouTube |
| 4 | `isTrusted(url)` **AND** `isCoursePage(url)` (including YouTube) |
| 5 | `isCoursePage(url)` (any platform) |
| 6 | `isYouTube(url)` (video, but not recognized as course page) |
| 7 | First URL in pool (last resort) |

### Step 3 — Google search fallback

If the pool is entirely empty (Claude couldn't search), a platform-targeted Google search URL is returned instead of an empty string. This is never cached.

---

## Helper Functions

### `isCoursePage(url)`

Returns `true` when a URL points to a specific course/lesson, not just a platform homepage. Each known platform has custom path rules:

| Platform | Accepted paths |
|---|---|
| YouTube | `/watch`, `/playlist`, or `youtu.be/*` |
| Coursera | `/learn/`, `/specializations/`, `/professional-certificates/` |
| Udemy | `/course/` |
| edX | `/course/`, `/professional-certificate/` |
| LinkedIn | `/learning/` |
| freeCodeCamp | `/learn/`, `/certification/` |
| Pluralsight | `/courses/`, `/paths/` |
| Udacity | `/course/`, `/nanodegree/` |
| Skillshare | `/en/classes/` |
| Codecademy | `/learn/`, `/courses/` |
| Cisco / NetAcad | any path with length > 5 |
| Microsoft Learn | any path with length > 5 |
| AWS / Skill Builder | any path with length > 5 |
| Google / Cloud Skills | any path with length > 5 |
| Others | path length > 3 and path ≠ `/` |

### `isOfficial(url)`

Checks whether the URL belongs to an official vendor/technology domain (not a third-party course aggregator). Full list is in `OFFICIAL_DOMAINS`. Subdomains of listed domains also qualify.

### `isTrusted(url)`

Checks whether the URL belongs to a well-known educational platform (`TRUSTED_PLATFORMS`). This is a broader set than official — it includes Coursera, Udemy, Pluralsight, etc.

### `normalizeUrl(url)`

Strips `www.`, lowercases host/path, removes trailing slashes. YouTube URLs preserve `?v=` because that query param is the video's identity.

### `platformSearchUrl(title, platform)`

Generates a Google `site:` search URL as a last-resort fallback. Recognizes platform keywords in the `platform` field to target the right site.

---

## Cost Model

| Item | Rate |
|---|---|
| Input tokens | $3.00 / million tokens |
| Output tokens | $15.00 / million tokens |
| Web search call | $10.00 / 1 000 searches |

**Per-user budget cap:** `$0.70 USD` — tracked in the database via `getUserApiSpent` / `addUserApiCost`. Once exhausted the API returns `{ url: "", quota_exceeded: true }` without calling Claude.

**Typical cost per request:** ~$0.001–$0.003 (one search + short output).

---

## Caching

An **in-memory runtime cache** (`@/lib/runtime-cache`) is keyed on `"${title.toLowerCase()}|${platform.toLowerCase()}"`. Cache hits skip Claude entirely — zero cost.

- Cache is process-scoped (resets on server restart / cold start).
- Instructor is excluded from the key to maximise hit rate across equivalent requests.

---

## Request / Response

### Request body

```ts
{
  title:      string;   // course name — required
  platform:   string;   // "Udemy", "Coursera", "YouTube", etc.
  instructor: string;   // optional, improves search precision
  country:    string;   // optional — triggers Arabic preference for Arabic-speaking countries
}
```

### Response body

```ts
{ url: string }                          // normal response
{ url: "",  quota_exceeded: true }       // user over budget
{ url: "https://google.com/search?..." } // fallback (Claude returned nothing)
```

### Error responses

| Status | Meaning |
|---|---|
| `401` | No valid session |
| `400` | Malformed JSON body |

---

## Claude Prompt Design

### System prompt (condensed)

> "You are a course URL finder. Search for the exact enrollment or watch URL for the requested course. Priority: (1) official vendor site … (2) trusted platforms … After searching, output ONLY the single best URL — one line, no explanation, no markdown, no quotes."

### Why `max_tokens: 300`?

- A single URL rarely exceeds 200 characters (~60–80 tokens in practice).
- 300 tokens ensures no URL is truncated even for long paths.
- Previously `128` caused silent truncation of long URLs.

### Why `max_uses: 1` on the web_search tool?

Limits to one search call per request. This keeps cost predictable ($0.01 per search) and is sufficient since Claude is asked for a single definitive URL, not iterative research.

---

## Adding New Platforms

### Add a trusted platform (third-party courses)

1. Add the domain to `TRUSTED_PLATFORMS` in `route.ts`.
2. Add path rules to `isCoursePage()` if the platform has a predictable URL pattern.

### Add an official vendor domain

1. Add the domain to `OFFICIAL_DOMAINS`.
2. `isOfficial()` will automatically rank it above trusted platforms.
3. Add path rules to `isCoursePage()` if needed.

### Add a platform-specific Google fallback

Add a new branch in `platformSearchUrl()` matching the platform name keyword.

---

## What NOT to Change

| Thing | Why |
|---|---|
| `claudeUrl` takes priority over `rankedBest` when `isCoursePage` passes | Claude evaluated the search results; its selection is more reliable than domain ranking alone |
| `claudeUrl` extracted from **text** block only | The `web_search_tool_result` block contains raw result metadata, not Claude's judgment |
| `max_tokens: 300` | Lower values truncate URLs silently — Claude gives no error, the URL just gets cut off |
| `max_uses: 1` on web_search | One search is enough and keeps cost bounded; increasing this multiplies search fees |
| Cache key excludes instructor | Improves hit rate; same course on same platform from different instructors is still the same course |
| `normalizeUrl` preserves `?v=` for YouTube | The video ID is in the query string, not the path — stripping it makes all YouTube links identical |
