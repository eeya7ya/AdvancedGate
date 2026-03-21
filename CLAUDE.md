@AGENTS.md

# eSpark Learning Platform — Developer Guide

## Project Overview

eSpark is a Next.js 16 educational platform for Power Engineering, Networking, and Software Development. It uses React 19, TypeScript, Tailwind CSS 4, NextAuth v5, Framer Motion, and Lucide icons.

---

## Directory Structure

```
src/
├── app/
│   ├── layout.tsx                  # Root layout (SessionProvider wrapper)
│   ├── page.tsx                    # Root → redirects to /dashboard
│   ├── login/page.tsx              # Login page (video + Google OAuth)
│   ├── (app)/
│   │   ├── layout.tsx              # Protected layout (Sidebar + Navbar)
│   │   ├── dashboard/page.tsx      # Main dashboard (stats, courses, achievements)
│   │   ├── subjects/page.tsx       # Browse all subjects
│   │   ├── subjects/[subjectId]/page.tsx
│   │   └── learn/[courseId]/page.tsx
│   └── api/auth/[...nextauth]/route.ts
├── components/
│   ├── auth/
│   │   ├── google-sign-in.tsx      # Google OAuth button
│   │   └── session-provider.tsx    # NextAuth session wrapper
│   ├── dashboard/
│   │   └── greeting.tsx            # Personalised greeting (uses session)
│   ├── layout/
│   │   ├── sidebar.tsx             # Left nav (desktop)
│   │   └── navbar.tsx              # Top bar (user menu, XP, level)
│   └── ui/
│       ├── badge.tsx
│       ├── button.tsx
│       └── progress.tsx
├── lib/
│   ├── data.ts                     # Mock data (subjects, courses, achievements, user stats)
│   └── utils.ts                    # getLevelColor, getLevelTitle, cn helpers
└── types/index.ts                  # TypeScript types (Subject, Course, Achievement, …)

public/
├── background.mp4                  # Login page background video
├── logo.png                        # eSpark logo
└── *.svg                           # Next.js / Vercel SVG assets
```

---

## Key Files to Know

| File | Purpose |
|---|---|
| `src/app/login/page.tsx` | Login page — video panel, logo, sign-in card |
| `src/app/(app)/dashboard/page.tsx` | Dashboard — XP card, enrolled courses, achievements |
| `src/lib/data.ts` | All mock content (edit to add courses, subjects, achievements) |
| `src/types/index.ts` | Type definitions — edit here first when adding new data shapes |
| `auth.ts` | NextAuth config (providers, callbacks) |
| `middleware.ts` | Route protection — redirects unauthenticated users to /login |

---

## Common Modifications

### Add a new subject or course
Edit `src/lib/data.ts`. Each `Subject` contains a `courses` array. Follow the existing shape defined in `src/types/index.ts`.

### Change UI icons (no emojis)
The project uses `lucide-react`. Import the icon you need:
```tsx
import { Lock, CheckCircle, GraduationCap } from "lucide-react";
```
Avoid raw emoji characters in JSX — use Lucide icons instead.

### Change the login page video
Replace `public/background.mp4`. The video element uses `preload="auto"` to minimise the appearance delay on page load.

### Remove/move the logo on the login page
The login page has **two** logo placements in `src/app/login/page.tsx`:
- **Mobile logo** — inside the `lg:hidden` div on the right panel
- **Desktop logo** — inside the `hidden lg:flex` div on the right panel

The logo that was previously shown at the top of the left video panel has been removed.

### Change colours / theme
Tailwind CSS 4 is used throughout. The primary accent colours are:
- Blue: `#4f9eff`
- Purple: `#a78bfa`
- Gold: `#f5a623`
- Green: `#4ade80`
- Background: `#080c14` / `#0d1424` / `#111827`

### Authentication
NextAuth v5 (beta) with Google OAuth. Credentials live in `.env.local`:
```
AUTH_SECRET=...
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Video doesn't appear or is slow | Browser hasn't preloaded the file | Ensure `preload="auto"` is on the `<video>` element |
| Google sign-in fails | Missing env vars | Check `.env.local` for `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` |
| Page shows unauthenticated data | `mockUserStats` used everywhere | Replace with real session/DB data when ready |
| Tailwind classes not applying | Tailwind 4 uses CSS-based config | Check `postcss.config.mjs` and `app/globals.css` |
| TypeScript errors on new data | Missing type fields | Update `src/types/index.ts` first |

---

## Scripts

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run lint     # ESLint check
```
