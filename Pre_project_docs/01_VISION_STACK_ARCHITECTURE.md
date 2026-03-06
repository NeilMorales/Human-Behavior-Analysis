# BehaviorIQ — File 1 of 3: Vision, Architecture & Tech Stack
# Version: 3.0 — Final spec based on full technical analysis
# Read this file completely before writing any code.

---

## WHAT YOU ARE BUILDING

BehaviorIQ is a two-part browser productivity and behavioral analytics system:

1. **Chrome Extension (MV3)** — silent background data collector. Tracks all browser activity across all tabs using an event-log architecture. Also supports manual focus sessions.
2. **Next.js Web Dashboard** — data visualization layer. Displays rich analytics, charts, trends, and generates downloadable PDF weekly reports.

Both connect to the same Supabase backend. The extension syncs to Supabase every 5 minutes when online. The dashboard reads from Supabase directly.

---

## CORE TRACKING CATEGORIES

### Category A — Automatic Tab/Time Tracking
Always running. Zero user effort required after install.
- Tracks time spent on every domain across all tabs
- Uses event-log architecture: every tab switch = one event written to chrome.storage.local
- Time is reconstructed from the event log, not from a running timer in memory
- Active time only counts when: tab is focused AND user showed activity in last 120 seconds
- Records tab switch frequency as a proxy for context switching / mental load
- Records number of tabs open at any time

### Category B — Manual Focus Sessions
User-initiated intentional work tracking.
- User opens popup, names task, picks category and duration, clicks Start
- Timer runs via chrome.alarms (survives service worker death and browser restart)
- During session: tab switches to distracting sites trigger chrome.notifications
- Notification text: "Hey, you switched to [domain] during your session '[task name]'"
- Session ends manually or when alarm fires at planned end time
- Stop flow: Completed / Interrupted + optional notes + 1–5 star self-rating
- If Chrome crashes mid-session: orphan recovery on next extension load

### Category C — Productivity Classification
Intelligence layer that makes Categories A and B meaningful.
- Every domain classified as: productive / neutral / distracting
- Ships with default classifications (see constants file)
- Unknown domains default to neutral, user prompted once to classify
- User can override any classification in the options page
- Classification runs at event-write time — each tab event stores its classification

---

## THE #1 TECHNICAL CHALLENGE — SERVICE WORKER DEATH

Chrome MV3 background service workers die after ~30 seconds of inactivity. This is the core challenge of any MV3 time tracker. BehaviorIQ solves this with three layers:

### Layer 1 — Event-Log Architecture (Primary Solution)
Never rely on in-memory state for timing. Every meaningful event is written to chrome.storage.local immediately and atomically. chrome.storage writes survive service worker death.

```
Instead of:
  "timer started at T0, timer now shows T0 + elapsed"  ← dies with service worker

We do:
  { type: 'tab_focus', domain: 'github.com', timestamp: T0 }  ← survives in storage
  { type: 'tab_focus', domain: 'youtube.com', timestamp: T1 } ← survives in storage
  Time on github = T1 - T0  ← computed on demand from log
```

### Layer 2 — chrome.alarms as Heartbeat (Backup)
A 1-minute repeating alarm wakes the service worker every minute. On each wake:
- Read current tab from storage
- Write a heartbeat event to the log
- Check if focus session needs to end
- Check if idle reminder needs to fire
- Trigger sync check

This means even if no tab events fire, data is committed every 60 seconds maximum.

### Layer 3 — chrome.storage.local as Source of Truth
All state lives in storage, never in memory. Service worker is stateless — it reads from storage, does work, writes back. Nothing is lost when it sleeps.

---

## DATA FLOW — COMPLETE PICTURE

```
USER BROWSES CHROME
        │
        ├─ chrome.tabs.onActivated fires on every tab switch
        ├─ chrome.tabs.onUpdated fires on every page navigation
        ├─ chrome.windows.onFocusChanged fires when browser loses/gains focus
        ├─ chrome.idle.onStateChanged fires when system goes idle/active
        │
        ▼
Background Service Worker wakes up for each event
— Parses domain from tab URL
— Gets classification from storage
— Writes event to chrome.storage.local event log
— Service worker may sleep immediately after

        │
        ▼ (every 1 minute)
chrome.alarms heartbeat fires
— Service worker wakes
— Commits any pending time to daily summary in storage
— Checks focus session state
— Queues interruption notifications if needed
— Checks sync eligibility

        │
        ▼ (every 5 minutes)
Sync Manager alarm fires
— Checks: authenticated? online?
— If yes: reads all unsynced events from storage
— Batches and POSTs to POST /api/sync
— Each event has UUID — server uses ON CONFLICT DO NOTHING
— Marks events as synced in storage (keeps local copy 30 days)
— If offline or unauth: silently skips, retries next cycle

        │
        ▼
Supabase (PostgreSQL)
— Events stored in tab_events table
— Daily summaries built server-side after each sync
— RLS: users can only read/write their own data

        │
        ▼
Next.js Dashboard (Vercel)
— Server Components: fetch historical data directly from Supabase at request time
— Client Components: React Query polls /api/sessions/active every 30s for live data
— Recharts: all chart visualizations
— @react-pdf/renderer: client-side PDF generation
```

---

## TECH STACK — FINAL AND LOCKED

### Chrome Extension
| Concern | Technology | Why |
|---|---|---|
| Build tool | Vite + CRXJS plugin | Best MV3 dev experience, HMR for popup |
| Language | TypeScript | Catches Chrome API mistakes, types for storage schema |
| Popup / Options UI | React 18 + Tailwind CSS | Component reuse, same design system as dashboard |
| Background logic | Plain TypeScript (no framework) | Service workers cannot use React |
| Storage | chrome.storage.local | Atomic writes, survives service worker death |
| Timers | chrome.alarms | Only reliable timer in MV3, survives browser restart |
| Notifications | chrome.notifications | Cross-platform, works even when popup closed |
| Idle detection | chrome.idle API | System-level, accurate, no polling |
| Network | fetch() only | XMLHttpRequest not allowed in MV3 service workers |

### Web Dashboard
| Concern | Technology | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | Server Components + API Routes in one deployment |
| Language | TypeScript + TSX | Type safety, same types shared with extension |
| Styling | Tailwind CSS | Rapid dark theme, consistent with extension |
| Charts | Recharts | Best React integration, fully typed, easy dark theme |
| PDF | @react-pdf/renderer | Client-side generation, no server process needed |
| Auth helpers | @supabase/ssr | Correct Supabase auth for Next.js App Router |
| Data fetching | Server Components + React Query | Historical = server, live = client polling |
| State | Zustand | Lightweight, for client-side session state |

### Backend (Inside Next.js)
| Concern | Technology | Why |
|---|---|---|
| API | Next.js API Routes (/app/api/) | No separate Express server, one Vercel deployment |
| Database | Supabase (PostgreSQL 15) | Auth + DB + RLS + Edge Functions all in one |
| DB client | @supabase/supabase-js | Server: service role key. Browser: anon key |
| Cron jobs | Supabase Edge Functions | Replaces node-cron, no separate server needed |
| Auth | Supabase Auth | JWT, email/password, token refresh |

### Infrastructure
| Concern | Technology |
|---|---|
| Dashboard hosting | Vercel (free tier sufficient) |
| Database hosting | Supabase cloud (free tier sufficient for dev) |
| Extension distribution | Chrome Web Store ($5 one-time developer fee) |
| Extension dev testing | chrome://extensions → Load Unpacked |
| CI/CD | GitHub Actions (build extension + deploy Vercel on push to main) |

---

## PROJECT FOLDER STRUCTURE

```
behavioriq/                         ← monorepo root
│
├── extension/                      ← Chrome Extension (MV3)
│   ├── manifest.json               ← MV3 manifest
│   ├── vite.config.ts              ← Vite + CRXJS config
│   ├── tsconfig.json
│   ├── package.json
│   ├── src/
│   │   ├── background/
│   │   │   ├── index.ts            ← service worker entry — wires all modules
│   │   │   ├── tabTracker.ts       ← handles tab events, writes to event log
│   │   │   ├── idleDetector.ts     ← chrome.idle integration
│   │   │   ├── sessionManager.ts   ← focus session state machine
│   │   │   ├── alarmHandler.ts     ← all chrome.alarms registration + handlers
│   │   │   ├── syncManager.ts      ← offline buffer → Supabase batch sync
│   │   │   └── notificationManager.ts ← interruption + idle notifications
│   │   ├── content/
│   │   │   └── index.ts            ← content script (minimal in v1)
│   │   ├── popup/
│   │   │   ├── index.html
│   │   │   ├── main.tsx            ← React entry point
│   │   │   ├── Popup.tsx           ← root popup component
│   │   │   └── components/
│   │   │       ├── ScoreRing.tsx   ← small SVG score ring
│   │   │       ├── StatRow.tsx     ← single stat line (label + value)
│   │   │       ├── SessionTimer.tsx ← live countdown when session active
│   │   │       ├── StartSession.tsx ← task input + start button
│   │   │       └── CurrentSite.tsx ← current domain + classification badge
│   │   ├── options/
│   │   │   ├── index.html
│   │   │   ├── main.tsx
│   │   │   ├── Options.tsx
│   │   │   └── components/
│   │   │       ├── AccountSection.tsx   ← login/signup, profile if logged in
│   │   │       ├── DomainList.tsx       ← all known domains + classification
│   │   │       ├── ClassificationRow.tsx ← single domain row with dropdown
│   │   │       └── GoalSettings.tsx     ← daily goal, idle threshold
│   │   └── shared/
│   │       ├── types.ts            ← all TypeScript interfaces
│   │       ├── constants.ts        ← default classifications, thresholds, alarm names
│   │       ├── storage.ts          ← chrome.storage abstraction + all storage keys
│   │       ├── scoreEngine.ts      ← behavior score computation (pure functions)
│   │       ├── api.ts              ← all fetch() calls to dashboard API
│   │       └── utils.ts            ← domain parsing, time formatting, UUID generation
│   └── assets/
│       └── icons/                  ← icon16/32/48/128.png
│
├── dashboard/                      ← Next.js 14 App Router
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── next.config.ts
│   ├── middleware.ts               ← Supabase auth guard on all (app) routes
│   ├── .env.local
│   ├── app/
│   │   ├── layout.tsx              ← root layout, fonts, providers
│   │   ├── page.tsx                ← redirect to /login or /dashboard
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── (app)/
│   │   │   ├── layout.tsx          ← sidebar + navbar authenticated shell
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── focus/page.tsx
│   │   │   ├── history/page.tsx
│   │   │   ├── reports/page.tsx
│   │   │   ├── profile/page.tsx
│   │   │   └── admin/
│   │   │       ├── page.tsx
│   │   │       ├── users/page.tsx
│   │   │       ├── monitoring/[userId]/page.tsx
│   │   │       └── alerts/page.tsx
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── signup/route.ts
│   │       │   ├── login/route.ts
│   │       │   ├── logout/route.ts
│   │       │   ├── me/route.ts
│   │       │   └── refresh/route.ts
│   │       ├── sync/route.ts       ← PRIMARY: extension batch sync endpoint
│   │       ├── sessions/
│   │       │   ├── route.ts        ← GET all + POST start
│   │       │   ├── active/route.ts ← GET currently open session
│   │       │   └── [id]/route.ts   ← GET + PUT + DELETE
│   │       ├── analysis/
│   │       │   ├── dashboard/route.ts ← all dashboard data in one call
│   │       │   ├── score/route.ts
│   │       │   ├── weekly/route.ts
│   │       │   ├── domains/route.ts
│   │       │   ├── streak/route.ts
│   │       │   └── anomalies/route.ts
│   │       ├── settings/route.ts
│   │       ├── export/
│   │       │   ├── pdf/route.ts
│   │       │   ├── csv/route.ts
│   │       │   └── json/route.ts
│   │       └── admin/
│   │           ├── stats/route.ts
│   │           ├── users/route.ts
│   │           ├── users/[id]/route.ts
│   │           └── alerts/route.ts
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   └── Navbar.tsx
│   │   ├── dashboard/
│   │   │   ├── ScoreRing.tsx
│   │   │   ├── StatCard.tsx
│   │   │   ├── ActiveSessionCard.tsx
│   │   │   ├── AnomalyAlert.tsx
│   │   │   └── InsightCard.tsx
│   │   ├── charts/
│   │   │   ├── FocusTimeLine.tsx
│   │   │   ├── SessionsBar.tsx
│   │   │   ├── ScoreTrend.tsx
│   │   │   ├── CompletionDonut.tsx
│   │   │   ├── ProductivityPie.tsx
│   │   │   ├── DomainBreakdown.tsx
│   │   │   ├── CategoryBar.tsx
│   │   │   └── StreakHeatmap.tsx
│   │   ├── focus/
│   │   │   ├── SessionForm.tsx
│   │   │   ├── TimerRing.tsx
│   │   │   └── StopModal.tsx
│   │   ├── reports/
│   │   │   └── PDFReport.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Modal.tsx
│   │       ├── Toast.tsx
│   │       ├── Skeleton.tsx
│   │       └── Badge.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts           ← browser Supabase client (anon key)
│   │   │   └── server.ts           ← server Supabase client (service role key)
│   │   ├── scoreEngine.ts          ← same pure functions as extension
│   │   ├── summaryBuilder.ts       ← buildDailySummary(userId, date)
│   │   ├── anomalyDetector.ts      ← all anomaly rules
│   │   └── utils.ts
│   ├── types/
│   │   └── index.ts                ← all shared TypeScript types
│   └── hooks/
│       ├── useActiveSession.ts     ← polls /api/sessions/active every 30s
│       ├── useDashboard.ts
│       └── useScore.ts
│
└── supabase/
    ├── migrations/
    │   └── 001_initial_schema.sql
    └── functions/
        ├── daily-summary/index.ts  ← runs midnight UTC
        └── weekly-digest/index.ts  ← runs Sunday 8am UTC
```

---

## MANIFEST.JSON — COMPLETE

```json
{
  "manifest_version": 3,
  "name": "BehaviorIQ",
  "version": "1.0.0",
  "description": "Understand your focus. Track your browser behavior. Own your productivity.",
  "permissions": [
    "tabs",
    "storage",
    "alarms",
    "notifications",
    "idle"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "src/background/index.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["src/content/index.js"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "src/popup/index.html",
    "default_icon": {
      "16":  "assets/icons/icon16.png",
      "32":  "assets/icons/icon32.png",
      "48":  "assets/icons/icon48.png",
      "128": "assets/icons/icon128.png"
    }
  },
  "options_ui": {
    "page": "src/options/index.html",
    "open_in_tab": true
  },
  "icons": {
    "16":  "assets/icons/icon16.png",
    "32":  "assets/icons/icon32.png",
    "48":  "assets/icons/icon48.png",
    "128": "assets/icons/icon128.png"
  }
}
```

---

## DESIGN SYSTEM

### Color Palette (Tailwind config — same in both extension and dashboard)
```typescript
colors: {
  bg: {
    primary:   '#0D1117',  // deep space black
    secondary: '#161B22',  // card surface
    tertiary:  '#1C2128',  // hover / elevated
  },
  border:      '#30363D',  // separator
  accent: {
    cyan:      '#00D4FF',  // primary CTA, headings, active states
    violet:    '#7C3AED',  // secondary, session bars
  },
  success:     '#00FF88',  // high score, completed, productive
  warning:     '#FFB800',  // moderate score, neutral, caution
  error:       '#FF4444',  // low score, distracting, interrupted
  text: {
    primary:   '#C9D1D9',
    secondary: '#8B949E',
  }
}
```

### Typography
- Headings + UI: Inter (next/font/google in dashboard, Google Fonts CDN link in extension)
- Numbers / Timer / Score / Badges: Fira Code (monospace)
- Base size: 14px

### Key Component Rules
- Cards: bg-secondary + 1px border + cyan glow (box-shadow) on hover
- All stat numbers: animate 0 → final value on mount (requestAnimationFrame counter)
- Score ring: SVG stroke-dashoffset animation, 1.5s ease-out on mount
- Timer ring: SVG, depletes clockwise, green → amber → red as remaining time decreases
- Skeleton loaders: Tailwind animate-pulse on all async blocks
- Toasts: slide in from top-right, 4s auto-dismiss, stack vertically
- Sidebar: CSS transition on collapse, not JS reflow

### Popup Constraints
- Fixed dimensions: 320px wide × 420px tall (Chrome popup maximum is 800×600)
- Must be fully readable at those dimensions
- No horizontal scrolling ever
- All interactive targets minimum 36px height

---

## AUTH STRATEGY — LOCAL FIRST

Extension works fully without account. No nag screens.

Without account:
- All data stored in chrome.storage.local only
- 30 days of local history
- Popup and options page fully functional
- No sync, no dashboard access

With account (unlocks):
- Sync to Supabase every 5 minutes
- Full web dashboard access
- Historical data beyond 30 days
- PDF report generation
- Cross-device data (multiple Chrome profiles → same account)

Auth flow in extension:
1. User clicks "Sign In" in options page AccountSection
2. Email + password form → POST to /api/auth/login
3. Receives access_token + refresh_token
4. Stored in chrome.storage.sync (syncs across Chrome profiles)
5. syncManager reads token before every sync attempt
6. Token refresh: if 401 received, attempt refresh, retry once, then prompt re-login

---

## BEHAVIOR SCORE FORMULA

Six weighted components. All inputs computed from stored event log.

```typescript
interface ScoreInput {
  focusTimeMinutes: number;       // Category B: total completed session time
  dailyGoalMinutes: number;       // from user settings, default 120
  completedSessions: number;      // Category B: sessions with status=completed
  totalSessions: number;          // Category B: all sessions (excl. abandoned)
  productiveTimeMinutes: number;  // Category A+C: time on productive domains
  totalOnlineMinutes: number;     // Category A: total active browser time
  activeDaysLast7: number;        // from daily_summaries: days with any activity
  idleSeconds: number;            // Category A: idle time during focus sessions
  totalFocusSeconds: number;      // Category B: total planned focus time
  interruptionCount: number;      // Category B+C: distracting switches during sessions
  plannedFocusSeconds: number;    // Category B: sum of all planned durations
}

function computeScore(input: ScoreInput): number {
  // 1. Focus Time Ratio (20%)
  const focusScore = Math.min(input.focusTimeMinutes / input.dailyGoalMinutes, 1.0) * 20;

  // 2. Session Completion Rate (20%)
  const completionScore = input.totalSessions > 0
    ? (input.completedSessions / input.totalSessions) * 20 : 0;

  // 3. Productive Time Ratio (20%)
  const productiveScore = input.totalOnlineMinutes > 0
    ? Math.min(input.productiveTimeMinutes / input.totalOnlineMinutes, 1.0) * 20 : 0;

  // 4. Distraction Resistance (15%) — penalises interruptions during focus sessions
  const resistanceScore = input.plannedFocusSeconds > 0
    ? Math.max(0, 1 - (input.interruptionCount * 120) / input.plannedFocusSeconds) * 15 : 15;

  // 5. Consistency (15%) — active days out of last 7
  const consistencyScore = (input.activeDaysLast7 / 7) * 15;

  // 6. Idle Ratio (10%) — less idle during sessions = better
  const idleScore = input.totalFocusSeconds > 0
    ? Math.max(0, 1 - input.idleSeconds / input.totalFocusSeconds) * 10 : 10;

  return Math.round(focusScore + completionScore + productiveScore +
    resistanceScore + consistencyScore + idleScore);
}

function getLevel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Highly Productive', color: '#00FF88' };
  if (score >= 50) return { label: 'Moderate',          color: '#FFB800' };
  return                 { label: 'Low Productivity',   color: '#FF4444' };
}
```

---

## KNOWN ISSUES AND HOW THEY ARE SOLVED

| Issue | Solution |
|---|---|
| Service worker dies mid-session | Event-log in chrome.storage — no in-memory state |
| Duplicate events on sync retry | Every event has UUID — server uses ON CONFLICT DO NOTHING |
| chrome.storage.local 10MB limit | Purge events >30 days after sync. Aggregate old events hourly |
| Storage schema changes on update | Version field in storage. Run migration on every extension load |
| CORS on API calls from extension | Next.js API routes return Access-Control-Allow-Origin header |
| User revokes tabs permission | Wrap all chrome.tabs calls in try/catch. Show warning in popup |
| Incognito not tracked by default | Mention in options page. Don't force it |
| Chrome Web Store sensitive permissions review | Clear privacy policy. Justify every permission in store listing |
| Token expiry during offline period | On reconnect: attempt refresh before first sync |
| Multiple Chrome profiles same account | chrome.storage.local is per-profile. Both sync to same Supabase user |

---

## DEPLOYMENT SUMMARY

### Dashboard → Vercel
- Connect GitHub repo to Vercel project
- Set env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
- Auto-deploys on push to main branch
- API routes are serverless functions — no config needed
- Free tier: sufficient for this project

### Database → Supabase
- Create project at supabase.com
- Run migration SQL from supabase/migrations/001_initial_schema.sql
- Enable RLS on all tables
- Deploy Edge Functions for cron jobs
- Free tier: 500MB DB, 2GB bandwidth — sufficient for development and early users

### Extension → Chrome Web Store (production)
- Build: `npm run build` in /extension → outputs /dist folder
- Zip the /dist folder
- Go to Chrome Web Store Developer Dashboard
- Upload zip, fill store listing, upload screenshots
- Submit for review (1–3 days normally, up to 3 weeks for sensitive permissions)
- Write privacy policy page and link it in the store listing

### Extension → Load Unpacked (development)
- Build: `npm run build` or `npm run dev` (Vite watch mode)
- Go to chrome://extensions
- Enable Developer Mode (top right toggle)
- Click "Load unpacked" → select /extension/dist folder
- Extension loads instantly, no review needed
- On code change: Vite rebuilds, click refresh icon in chrome://extensions

### GitHub Actions CI/CD
```yaml
# On push to main:
# 1. Build extension → upload as GitHub release artifact
# 2. Build + deploy dashboard to Vercel automatically
# Store submission is always manual — Google does not allow automated uploads
```
