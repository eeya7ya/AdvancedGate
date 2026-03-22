# AI Advisor Improvements

## Overview

This document describes all improvements made to the eSpark AI Advisor (career path AI) as part of the `improve-career-path-ai` feature branch.

---

## 1. System Prompt Rewrite (`src/app/api/ai/chat/route.ts`)

### Before
- Asked one question at a time across 4–5 back-and-forth messages
- Generic JSON schema with minimal fields
- No market intelligence
- No web search integration
- All questions shown as a single paragraph wall of text

### After

#### Structured Opening Message
The AI now opens with a single, well-formatted message containing:
1. A warm welcome sentence
2. A polite intro sentence
3. All 5 questions listed as `Q1:` through `Q5:` on separate lines
4. A closing invite to answer

This eliminates the long back-and-forth and lets users answer everything at once.

#### Questions Collected (Q1–Q5)
| # | Topic |
|---|---|
| Q1 | Name, country/city, current situation (working/studying, field, role) |
| Q2 | Target market (local / Gulf / Europe / global remote) + work style preference |
| Q3 | Dream goal, target income, desired lifestyle |
| Q4 | Obstacles, education level, existing skills |
| Q5 | Hours per week available + overall timeline |

#### Web Search Integration
After the user responds, the AI runs up to 3 web searches before generating the plan:
- Best courses for their goal on Coursera / Udemy / YouTube
- Salary data specific to their target market
- Job market demand in their country

#### Dynamic Roadmap Phases
Phase count is matched to the user's stated timeline:
| Timeline | Phases |
|---|---|
| 1–3 months | 3 phases |
| 3–6 months | 4 phases |
| 6–12 months | 6 phases |
| 1–2 years | 8 phases |
| Unspecified | 4 phases |

#### Country-Specific Market Intelligence
The AI applies honest, research-backed market awareness. When a combination of country + goal + target market has documented challenges (e.g., engineering saturation in Jordan, graphic design rates in small economies), it includes a constructive `notice` field in `marketInsights` — framed as mentor advice, never discouraging.

#### Richer JSON Schema
New fields added to the generated plan:
- `profile.country`, `profile.targetMarket`, `profile.workStyle`
- `marketInsights` — localDemand, globalDemand, salaryRange, notice, recommendation
- `courseRecommendations` — real courses found via web search, with title, platform, instructor, hours, level, focus, phase
- `schedule` — daily structure, weekly pattern, printable daily/weekly/monthly targets
- `roadmap` — phase-by-phase breakdown with milestones, skills, resources, outcome

---

## 2. Chat UI Improvements (`src/components/dashboard/ai-dashboard.tsx`)

### Formatted AI Message Renderer
Added `formatAIMessage()` function that parses AI responses and renders:
- Lines matching `Q1:`, `Q2:` … as teal-badged rows — easy to scan
- Plain text lines as normal readable paragraphs
- Streaming cursor on the last element during live generation

### Streaming Lag Fix
Removed RAF (requestAnimationFrame) throttle that was causing buffering/lag during token streaming. Both the chat loop and the plan-detection loop now update state directly.

---

## 3. Roadmap Page (`src/app/(app)/roadmap/roadmap-client.tsx`)

### Updated Types
`LearningPlan` interface extended with all new fields:
- `MarketInsights`, `CourseRecommendation`, `ScheduleData`, `RoadmapPhase`
- `profile` extended with `country`, `targetMarket`, `workStyle`

### New Sections Added

#### Market Intelligence
- Local demand assessment for user's country
- Global demand and remote opportunity
- Salary range specific to target market
- Strategic recommendation
- Yellow warning banner for genuine market concerns (e.g., saturation, low local rates)

#### Course Recommendations
- Card per course with title, platform, instructor
- Level badge (color-coded: Beginner → Advanced)
- Estimated hours + roadmap phase chips
- Focus description explaining why this course fits their path

#### Roadmap Phases (Timeline)
- Vertical timeline UI with colored phase dots
- Each phase shows: goal, milestones, skills (as chips), outcome
- Phase colors cycle through teal → cyan → purple → amber → red

#### Printable Schedule
- Daily routine with numbered steps
- Weekly pattern + weekly goal
- Printable targets: daily, weekly, monthly — shown as 3-column card grid
- Print button triggers `window.print()`
- Print CSS added to `globals.css` to render cleanly on paper (white background, dark text, hidden nav/sidebar)

---

## Files Changed

| File | Change |
|---|---|
| `src/app/api/ai/chat/route.ts` | Full system prompt rewrite |
| `src/components/dashboard/ai-dashboard.tsx` | Formatted message renderer, streaming fix |
| `src/app/(app)/roadmap/roadmap-client.tsx` | Types update + 4 new sections |
| `src/app/globals.css` | Print media query for schedule |
