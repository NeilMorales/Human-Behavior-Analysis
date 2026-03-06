# BehaviorIQ — File 2 of 3: Extension Internals & Dashboard Pages
# Read File 1 first. This file covers every module of the extension and every page of the dashboard.

---

## TYPESCRIPT TYPES — DEFINE THESE BEFORE WRITING ANY CODE

```typescript
// Shared between extension/src/shared/types.ts and dashboard/types/index.ts
// Keep these in sync manually (or use a shared package in future)

export type SessionStatus     = 'in_progress' | 'completed' | 'interrupted' | 'abandoned';
export type SessionCategory   = 'Study' | 'Coding' | 'Reading' | 'Project' | 'Writing' | 'Design' | 'Other';
export type SessionMode       = 'free' | 'pomodoro';
export type Classification    = 'productive' | 'neutral' | 'distracting';
export type AlertSeverity     = 'info' | 'warning' | 'critical';
export type UserRole          = 'user' | 'admin';
export type BehaviorLevel     = 'Highly Productive' | 'Moderate' | 'Low Productivity';
export type IdleState         = 'active' | 'idle' | 'locked';
export type EventType         =
  | 'tab_focus'       // user switched to this tab
  | 'tab_blur'        // user switched away from this tab
  | 'idle_start'      // system went idle
  | 'idle_end'        // system became active
  | 'window_blur'     // browser lost focus
  | 'window_focus'    // browser gained focus
  | 'session_start'   // focus session started
  | 'session_end'     // focus session ended
  | 'heartbeat';      // 1-minute alarm tick

// Raw event — written to chrome.storage.local immediately
export interface BrowserEvent {
  id: string;              // UUID — used for deduplication on server
  type: EventType;
  domain: string | null;   // null for idle/window events
  classification: Classification | null;
  timestamp: number;       // Date.now() — milliseconds UTC
  focusSessionId: string | null;
  synced: boolean;         // false until confirmed by server
  date: string;            // 'YYYY-MM-DD' in user's local timezone — for bucketing
}

// Focus session — stored in chrome.storage.local while active, then synced
export interface FocusSession {
  id: string;
  userId: string | null;   // null if user not logged in
  taskName: string;
  category: SessionCategory;
  mode: SessionMode;
  plannedDuration: number; // minutes
  startTime: number;       // Date.now()
  endTime: number | null;
  actualDuration: number | null; // minutes
  status: SessionStatus;
  idleTimeDuring: number;  // seconds
  interruptionCount: number;
  notes: string | null;
  selfRating: number | null; // 1–5
  focusScore: number | null;
  synced: boolean;
}

// Daily summary — computed server-side, cached in extension storage
export interface DailySummary {
  userId: string;
  date: string;
  totalFocusTime: number;      // minutes
  sessionsCount: number;
  completionRate: number;      // 0.0 – 1.0
  idleTime: number;            // seconds
  productiveTime: number;      // minutes
  distractingTime: number;     // minutes
  neutralTime: number;         // minutes
  behaviorScore: number;       // 0–100
  rolling7dScore: number;
}

// Domain stat — aggregated for display
export interface DomainStat {
  domain: string;
  classification: Classification;
  totalSeconds: number;
  visitCount: number;
  date: string;
}

// Extension storage shape — the entire schema
export interface StorageSchema {
  // Auth
  accessToken: string | null;
  refreshToken: string | null;
  user: StoredUser | null;

  // Settings
  settings: UserSettings;

  // Active session (null if no session running)
  activeSession: FocusSession | null;

  // Event log — keyed by date 'YYYY-MM-DD'
  eventLog: Record<string, BrowserEvent[]>;

  // Today's cached summary (updated every minute by heartbeat)
  todaySummary: DailySummary | null;

  // Schema version — for migrations
  schemaVersion: number;

  // Last sync timestamp
  lastSyncAt: number | null;
}

export interface UserSettings {
  dailyGoalMinutes: number;        // default 120
  idleThresholdSeconds: number;    // default 120
  preferredCategories: SessionCategory[];
  notificationsEnabled: boolean;   // default true
  workDuration: number;            // pomodoro work minutes, default 25
  breakDuration: number;           // pomodoro break minutes, default 5
  longBreakDuration: number;       // default 15
  customClassifications: Record<string, Classification>; // user overrides
}

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  timezone: string;
}
```

---

## EXTENSION MODULE SPECS

### background/index.ts — Service Worker Entry Point

```typescript
// This file wires all background modules together.
// It is the only file imported by the service worker.
// Keep it minimal — just imports and event listener registrations.

import { handleTabActivated, handleTabUpdated } from './tabTracker';
import { handleIdleStateChange } from './idleDetector';
import { handleAlarm, registerAlarms } from './alarmHandler';
import { handleNotificationButton } from './notificationManager';
import { handleInstalled, handleStartup } from './lifecycleHandler';

// Tab tracking
chrome.tabs.onActivated.addListener(handleTabActivated);
chrome.tabs.onUpdated.addListener(handleTabUpdated);
chrome.windows.onFocusChanged.addListener(handleWindowFocusChanged);

// Idle
chrome.idle.onStateChanged.addListener(handleIdleStateChange);
chrome.idle.setDetectionInterval(120); // sync with user setting on settings change

// Alarms
chrome.alarms.onAlarm.addListener(handleAlarm);

// Notifications
chrome.notifications.onButtonClicked.addListener(handleNotificationButton);

// Lifecycle
chrome.runtime.onInstalled.addListener(handleInstalled);
chrome.runtime.onStartup.addListener(handleStartup);

// Register all alarms on startup (alarms survive browser restart, but re-register to be safe)
registerAlarms();
```

### background/tabTracker.ts — Category A Core

```typescript
// Responsibilities:
// 1. On tab activation: close out the previous tab's time window, open new one
// 2. On tab URL change: update current domain tracking
// 3. On window blur/focus: pause/resume timing
// All state read from and written to chrome.storage.local — never in module-level variables

export async function handleTabActivated({ tabId }: chrome.tabs.TabActiveInfo) {
  const tab = await chrome.tabs.get(tabId);
  const domain = parseDomain(tab.url);
  const now = Date.now();

  // 1. Read current tracking state from storage
  const storage = await readStorage(['activeSession', 'settings', 'eventLog']);
  const settings = storage.settings;
  const date = getTodayDate(settings.timezone ?? 'UTC');

  // 2. Write tab_blur event for previous domain (if any)
  // Previous domain is inferred from the last tab_focus event in today's log
  const lastFocusEvent = getLastEventOfType(storage.eventLog[date] ?? [], 'tab_focus');
  if (lastFocusEvent && !lastFocusEvent.domain?.startsWith('chrome://')) {
    await appendEvent({
      type: 'tab_blur',
      domain: lastFocusEvent.domain,
      classification: lastFocusEvent.classification,
      timestamp: now,
      focusSessionId: storage.activeSession?.id ?? null,
      date,
    });
  }

  // 3. Write tab_focus event for new domain
  if (domain && !domain.startsWith('chrome://')) {
    const classification = await getClassification(domain, settings);
    await appendEvent({
      type: 'tab_focus',
      domain,
      classification,
      timestamp: now,
      focusSessionId: storage.activeSession?.id ?? null,
      date,
    });

    // 4. If focus session active and new domain is distracting: flag interruption
    if (storage.activeSession?.status === 'in_progress' && classification === 'distracting') {
      await incrementInterruption(storage.activeSession.id);
      await fireInterruptionNotification(domain, storage.activeSession.taskName);
    }
  }
}

export async function handleTabUpdated(
  tabId: number,
  changeInfo: chrome.tabs.TabChangeInfo,
  tab: chrome.tabs.Tab
) {
  // Only care about complete navigations in the active tab
  if (changeInfo.status !== 'complete') return;
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (activeTab?.id !== tabId) return;

  // Treat URL change in active tab same as tab activation
  await handleTabActivated({ tabId, windowId: tab.windowId });
}

// Utility: parse domain from URL string
function parseDomain(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return null;
  }
}
```

### background/idleDetector.ts

```typescript
// chrome.idle fires when system (not just browser) goes idle
// This is more accurate than mousemove polling

export async function handleIdleStateChange(state: chrome.idle.IdleState) {
  const now = Date.now();
  const { activeSession, settings } = await readStorage(['activeSession', 'settings']);
  const date = getTodayDate();

  if (state === 'idle' || state === 'locked') {
    // Write idle_start event
    await appendEvent({ type: 'idle_start', domain: null, classification: null,
      timestamp: now, focusSessionId: activeSession?.id ?? null, date });
    // Pause tab timing — next heartbeat will not count this time
  }

  if (state === 'active') {
    // Write idle_end event
    await appendEvent({ type: 'idle_end', domain: null, classification: null,
      timestamp: now, focusSessionId: activeSession?.id ?? null, date });
    // Resume tab timing
  }
}
```

### background/alarmHandler.ts

```typescript
// All alarm names as constants — never use magic strings
export const ALARMS = {
  HEARTBEAT: 'heartbeat',       // fires every 1 minute
  SYNC: 'sync',                 // fires every 5 minutes
  IDLE_REMINDER: 'idle_reminder', // fires 5 minutes after session start if idle
} as const;

export function registerAlarms() {
  // Heartbeat — every 1 minute
  chrome.alarms.create(ALARMS.HEARTBEAT, { periodInMinutes: 1 });
  // Sync — every 5 minutes
  chrome.alarms.create(ALARMS.SYNC, { periodInMinutes: 5 });
}

export async function handleAlarm(alarm: chrome.alarms.Alarm) {
  switch (alarm.name) {
    case ALARMS.HEARTBEAT:
      await handleHeartbeat();
      break;
    case ALARMS.SYNC:
      await syncManager.attemptSync();
      break;
    case ALARMS.IDLE_REMINDER:
      await handleIdleReminder();
      break;
    default:
      // Session end alarms are named by session ID
      if (alarm.name.startsWith('session_end_')) {
        await sessionManager.autoCompleteSession(alarm.name.replace('session_end_', ''));
      }
  }
}

async function handleHeartbeat() {
  const now = Date.now();
  const { activeSession, settings } = await readStorage(['activeSession', 'settings']);
  const date = getTodayDate();

  // Write heartbeat event — used to fill gaps if tab events were missed
  await appendEvent({ type: 'heartbeat', domain: null, classification: null,
    timestamp: now, focusSessionId: activeSession?.id ?? null, date });

  // Recompute today's summary from event log
  await rebuildTodaySummary(date);
}
```

### background/sessionManager.ts — Category B State Machine

```typescript
// Session states: none → active → paused → ended
// All state in chrome.storage.local — never module-level variables

export async function startSession(params: {
  taskName: string;
  category: SessionCategory;
  mode: SessionMode;
  plannedDuration: number;
}): Promise<FocusSession> {
  // 1. Check no session already running
  const { activeSession } = await readStorage(['activeSession']);
  if (activeSession?.status === 'in_progress') {
    throw new Error('A session is already in progress');
  }

  // 2. Create session object
  const session: FocusSession = {
    id: generateUUID(),
    userId: (await getStoredUser())?.id ?? null,
    taskName: params.taskName,
    category: params.category,
    mode: params.mode,
    plannedDuration: params.plannedDuration,
    startTime: Date.now(),
    endTime: null,
    actualDuration: null,
    status: 'in_progress',
    idleTimeDuring: 0,
    interruptionCount: 0,
    notes: null,
    selfRating: null,
    focusScore: null,
    synced: false,
  };

  // 3. Save to storage immediately
  await writeStorage({ activeSession: session });

  // 4. Set alarm for planned end time
  const endTimeMinutes = params.plannedDuration;
  chrome.alarms.create(`session_end_${session.id}`, {
    delayInMinutes: endTimeMinutes
  });

  // 5. Set idle reminder alarm (5 minutes)
  chrome.alarms.create(ALARMS.IDLE_REMINDER, { delayInMinutes: 5 });

  // 6. Write session_start event
  await appendEvent({
    type: 'session_start', domain: null, classification: null,
    timestamp: session.startTime, focusSessionId: session.id,
    date: getTodayDate()
  });

  return session;
}

export async function stopSession(params: {
  status: 'completed' | 'interrupted';
  notes?: string;
  selfRating?: number;
}): Promise<FocusSession> {
  const { activeSession } = await readStorage(['activeSession']);
  if (!activeSession) throw new Error('No active session');

  const endTime = Date.now();
  const actualDurationMinutes = Math.min(
    Math.round((endTime - activeSession.startTime) / 60000),
    480 // cap at 8 hours
  );

  const completed: FocusSession = {
    ...activeSession,
    endTime,
    actualDuration: actualDurationMinutes,
    status: params.status,
    notes: params.notes ?? null,
    selfRating: params.selfRating ?? null,
    focusScore: computeSessionScore(activeSession, actualDurationMinutes),
    synced: false,
  };

  // Clear active session from storage
  await writeStorage({ activeSession: null });

  // Save completed session to session history in storage
  await appendSessionToHistory(completed);

  // Clear alarms
  await chrome.alarms.clear(`session_end_${activeSession.id}`);
  await chrome.alarms.clear(ALARMS.IDLE_REMINDER);

  // Write session_end event
  await appendEvent({
    type: 'session_end', domain: null, classification: null,
    timestamp: endTime, focusSessionId: completed.id,
    date: getTodayDate()
  });

  return completed;
}

// Called on extension load — check for orphan session
export async function checkOrphanSession(): Promise<FocusSession | null> {
  const { activeSession } = await readStorage(['activeSession']);
  if (!activeSession) return null;

  // If session start was more than 8 hours ago, auto-abandon
  const hoursElapsed = (Date.now() - activeSession.startTime) / 3600000;
  if (hoursElapsed > 8) {
    await stopSession({ status: 'interrupted' });
    return null;
  }

  return activeSession; // caller should show recovery UI
}
```

### background/syncManager.ts — Offline Buffer → Supabase

```typescript
export async function attemptSync(): Promise<void> {
  const { accessToken, lastSyncAt } = await readStorage(['accessToken', 'lastSyncAt']);
  if (!accessToken) return; // not logged in
  if (!navigator.onLine) return; // no connection

  // Collect all unsynced events across all dates
  const { eventLog } = await readStorage(['eventLog']);
  const unsyncedEvents: BrowserEvent[] = [];

  for (const date of Object.keys(eventLog)) {
    for (const event of eventLog[date]) {
      if (!event.synced) unsyncedEvents.push(event);
    }
  }

  if (unsyncedEvents.length === 0) return;

  try {
    const response = await fetch(`${DASHBOARD_URL}/api/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ events: unsyncedEvents }),
    });

    if (response.status === 401) {
      // Token expired — attempt refresh
      const refreshed = await refreshToken();
      if (refreshed) {
        await attemptSync(); // retry once with new token
      }
      return;
    }

    if (!response.ok) return; // server error — retry next cycle

    const { syncedIds }: { syncedIds: string[] } = await response.json();

    // Mark events as synced
    await markEventsSynced(syncedIds);
    await writeStorage({ lastSyncAt: Date.now() });

    // Purge events older than 30 days that are already synced
    await purgeOldEvents(30);

  } catch {
    // Network error — silent fail, retry in 5 minutes
  }
}
```

### background/notificationManager.ts

```typescript
export async function fireInterruptionNotification(
  domain: string,
  taskName: string
): Promise<void> {
  const { settings } = await readStorage(['settings']);
  if (!settings.notificationsEnabled) return;

  chrome.notifications.create(`interruption_${Date.now()}`, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('assets/icons/icon48.png'),
    title: 'Focus Session Interrupted',
    message: `Hey, you switched to ${domain} during "${taskName}"`,
    priority: 1,
  });
}

export async function fireIdleReminderNotification(taskName: string): Promise<void> {
  const { settings } = await readStorage(['settings']);
  if (!settings.notificationsEnabled) return;

  chrome.notifications.create('idle_reminder', {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('assets/icons/icon48.png'),
    title: 'Still working?',
    message: `Your session "${taskName}" is still running`,
    buttons: [
      { title: 'Yes, keep going' },
      { title: 'Stop session' }
    ],
    priority: 2,
    requireInteraction: true,
  });
}

// Handle button clicks on notifications
export async function handleNotificationButton(
  notificationId: string,
  buttonIndex: number
): Promise<void> {
  if (notificationId === 'idle_reminder') {
    if (buttonIndex === 0) {
      // "Yes, keep going" — reset idle reminder alarm
      chrome.alarms.create(ALARMS.IDLE_REMINDER, { delayInMinutes: 5 });
    } else {
      // "Stop session" — auto-stop as interrupted
      await sessionManager.stopSession({ status: 'interrupted' });
    }
    chrome.notifications.clear('idle_reminder');
  }
}
```

### shared/storage.ts — Chrome Storage Abstraction

```typescript
// All chrome.storage.local access goes through this module
// Never call chrome.storage directly from other modules

const STORAGE_VERSION = 1;

const DEFAULT_SETTINGS: UserSettings = {
  dailyGoalMinutes: 120,
  idleThresholdSeconds: 120,
  preferredCategories: [],
  notificationsEnabled: true,
  workDuration: 25,
  breakDuration: 5,
  longBreakDuration: 15,
  customClassifications: {},
};

export async function readStorage<K extends keyof StorageSchema>(
  keys: K[]
): Promise<Pick<StorageSchema, K>> {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (result) => resolve(result as Pick<StorageSchema, K>));
  });
}

export async function writeStorage(data: Partial<StorageSchema>): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, resolve);
  });
}

export async function appendEvent(
  event: Omit<BrowserEvent, 'id' | 'synced'>
): Promise<void> {
  const fullEvent: BrowserEvent = {
    ...event,
    id: generateUUID(),
    synced: false,
  };

  const { eventLog } = await readStorage(['eventLog']);
  const log = eventLog ?? {};
  const dateEvents = log[event.date] ?? [];
  dateEvents.push(fullEvent);
  log[event.date] = dateEvents;

  await writeStorage({ eventLog: log });
}

export async function markEventsSynced(ids: string[]): Promise<void> {
  const idSet = new Set(ids);
  const { eventLog } = await readStorage(['eventLog']);
  for (const date of Object.keys(eventLog)) {
    eventLog[date] = eventLog[date].map(e =>
      idSet.has(e.id) ? { ...e, synced: true } : e
    );
  }
  await writeStorage({ eventLog });
}

// Run on extension install/update — migrate storage schema if needed
export async function migrateStorage(): Promise<void> {
  const { schemaVersion } = await readStorage(['schemaVersion']);
  if ((schemaVersion ?? 0) >= STORAGE_VERSION) return;
  // Apply migrations here as versions increase
  await writeStorage({ schemaVersion: STORAGE_VERSION, settings: DEFAULT_SETTINGS });
}
```

### shared/constants.ts

```typescript
export const DASHBOARD_URL = 'https://behavioriq.vercel.app'; // update before production

export const DEFAULT_CLASSIFICATIONS: Record<string, Classification> = {
  // Productive
  'github.com': 'productive',
  'gitlab.com': 'productive',
  'stackoverflow.com': 'productive',
  'notion.so': 'productive',
  'figma.com': 'productive',
  'leetcode.com': 'productive',
  'coursera.org': 'productive',
  'udemy.com': 'productive',
  'docs.google.com': 'productive',
  'linear.app': 'productive',
  'vercel.com': 'productive',
  'supabase.com': 'productive',
  'developer.mozilla.org': 'productive',
  'npmjs.com': 'productive',
  'typescriptlang.org': 'productive',
  'nextjs.org': 'productive',
  // Neutral
  'gmail.com': 'neutral',
  'calendar.google.com': 'neutral',
  'slack.com': 'neutral',
  'zoom.us': 'neutral',
  'meet.google.com': 'neutral',
  'wikipedia.org': 'neutral',
  'chat.openai.com': 'neutral',
  'google.com': 'neutral',
  'drive.google.com': 'neutral',
  // Distracting
  'youtube.com': 'distracting',
  'twitter.com': 'distracting',
  'x.com': 'distracting',
  'instagram.com': 'distracting',
  'reddit.com': 'distracting',
  'netflix.com': 'distracting',
  'twitch.tv': 'distracting',
  'tiktok.com': 'distracting',
  'facebook.com': 'distracting',
  '9gag.com': 'distracting',
};

export const IDLE_THRESHOLD_SECONDS = 120;
export const SYNC_INTERVAL_MINUTES = 5;
export const HEARTBEAT_INTERVAL_MINUTES = 1;
export const IDLE_REMINDER_MINUTES = 5;
export const MAX_SESSION_HOURS = 8;
export const LOCAL_DATA_RETENTION_DAYS = 30;
export const STORAGE_QUOTA_WARNING_BYTES = 8_000_000; // warn at 8MB of 10MB limit
```

---

## POPUP — Popup.tsx

```
Fixed: 320px × 420px

┌──────────────────────────────────┐
│  [BQ] BehaviorIQ           [⚙]  │  ← logo (SVG) + options page link
├──────────────────────────────────┤
│        Today's Score             │
│       ┌──────────┐               │
│       │    78    │  Moderate     │  ← ScoreRing component (small SVG)
│       └──────────┘               │
├──────────────────────────────────┤
│  ⏱  Productive     2h 14m       │
│  ⚡  Distracting    47m          │  ← StatRow components
│  🎯  Sessions       3            │
│  ↔  Tab Switches   24           │
├──────────────────────────────────┤
│  Now: github.com   [● PROD]      │  ← CurrentSite: domain + classification badge
├──────────────────────────────────┤
│  ┌────────────────────────────┐  │
│  │   + Start Focus Session    │  │  ← StartSession component (default state)
│  └────────────────────────────┘  │
│  [ Open Full Dashboard ↗ ]       │  ← link to Next.js dashboard
└──────────────────────────────────┘
```

When session is active, bottom section becomes SessionTimer:
```
├──────────────────────────────────┤
│  ● IN PROGRESS                   │
│  "Fix login bug — Coding"        │
│        25:34  remaining          │  ← live countdown (reads from storage every second)
│  [⏸ Pause]        [■ Stop]      │
└──────────────────────────────────┘
```

Popup reads data from chrome.storage.local directly (same process). Does NOT message the service worker for data reads — too slow. Uses setInterval(1000) for live timer countdown.

---

## DASHBOARD PAGES — COMPLETE SPECS

### USE_MOCK PATTERN (dashboard/lib/api.ts)
```typescript
export const USE_MOCK = true; // flip to false when API routes are ready

export async function getDashboardData(): Promise<DashboardData> {
  if (USE_MOCK) {
    await delay(400);
    return mockData.dashboard;
  }
  const res = await fetch('/api/analysis/dashboard', {
    headers: { Authorization: `Bearer ${getToken()}` }
  });
  return res.json();
}
// All API functions follow this pattern exactly
```

### /app/(app)/dashboard/page.tsx — Server Component
Fetch historical data server-side. Active session is client-side.

Layout: left sidebar (fixed, collapsible) + top navbar + scrollable main content

Content top to bottom:

**1. Active Session Card** (client component, polls every 30s — hidden if no session)
- Pulsing cyan border card
- Task name + category badge + elapsed time (live)
- "Stop Session" button → opens stop modal

**2. Summary Stats — 6 cards in a 3×2 grid**
- Focus Time Today, Sessions Today, Completion Rate
- Productive Time, Distracting Time, Idle Time
- All animated 0 → final value on mount (1s duration)
- Each card: icon + label + value + subtle trend arrow vs yesterday

**3. Behavior Score Ring** (most prominent element)
- Large SVG circular arc — 200px diameter
- Animated stroke-dashoffset on mount, 1.5s ease-out
- Color: #FF4444 < 50, #FFB800 50–79, #00FF88 80+
- Score number counts up in center (Fira Code, 48px)
- Level label below: "Highly Productive" / "Moderate" / "Low Productivity"
- Subtitle: "Based on focus sessions + browser behavior today"

**4. Charts — 2×3 grid**
1. Weekly Focus Time — LineChart, cyan fill gradient, last 7 days
2. Daily Sessions — BarChart, violet bars, this week
3. Score Trend — LineChart, 14 days, color per segment (green/amber/red)
4. Productive vs Distracting vs Neutral — PieChart (new — from extension data)
5. Top Domains Today — horizontal BarChart, color by classification
6. Completion Rate — RadialBarChart or Doughnut, green/dark-gray

**5. Anomaly Alerts Strip** (show only if alerts exist)
- Dismissible cards: info=cyan, warning=amber, critical=red

**6. Insights Feed** (3–5 cards)
- Natural language, cyan left border, dark card

---

### /app/(app)/focus/page.tsx — Client Component

**Before session starts:**
- Task name: large input, required, max 200 chars
- Category pills: Study / Coding / Reading / Project / Writing / Design / Other
- Duration presets: 15 / 30 / 45 / 60 / 90 / 120 min + custom input
- Mode toggle: Free | Pomodoro
  - Pomodoro: shows Work / Short Break / Long Break duration inputs
- Start button: validate → POST /api/sessions → start local timer

**While session runs:**
- SVG timer ring, 240px, depletes clockwise
- Color: green → amber (at 50% remaining) → red (at 25% remaining)
- HH:MM:SS center display (Fira Code, 56px)
- Task name + category badge
- Pulsing "● IN PROGRESS" indicator
- Pause / Resume button
- Stop button → Stop Modal

**Stop Modal:**
- Status: Completed ✓ / Interrupted ✗
- Star rating 1–5 (optional)
- Notes textarea (optional, max 1000 chars)
- Confirm → PUT /api/sessions/:id → toast success → redirect to dashboard

**Tab visibility (V1 in-page):**
- On visibilitychange: if hidden → record away start time
- On return: if away > 5s → show banner "You were away for X minutes"
- Banner auto-dismisses after 5 seconds

**Idle (V1 in-page):**
- mousemove/keydown/click/scroll → reset idle timer (debounced 500ms)
- After 5 minutes idle → modal "Are you still working?"
- Yes → reset timer. No → stop as interrupted

**Orphan recovery:**
- On mount: check localStorage for 'biq_active_session'
- If found → modal with task name + start time
- Options: Completed / Interrupted / Discard

---

### /app/(app)/history/page.tsx

**Summary strip (sticky top):**
Total sessions | Total time | Avg completion rate | Avg self-rating

**Filter bar:**
Date range (from/to) | Category dropdown | Status dropdown | Apply | Reset

**Session table:**
Columns: Date | Task | Category | Planned | Actual | Status badge | Score | Rating
- Status badges: uppercase Fira Code, Completed=green glow, Interrupted=red glow, In Progress=cyan pulse
- Row expansion: notes, interruption count, idle time, domain switches during session
- Edit (inline): task name, category, notes
- Delete: confirmation modal, soft delete (is_deleted flag)

---

### /app/(app)/reports/page.tsx

**Date range tabs:** This Week | This Month | Last 3 Months | Custom

All charts re-render when range changes via React Query refetch.

**Charts:**
1. Productivity Score Over Time — LineChart, color-coded segments, full date range
2. Focus Time by Category — horizontal BarChart, sorted by duration
3. Productive vs Distracting over Time — stacked AreaChart (NEW — extension data)
4. Best Day of Week — BarChart, avg score per weekday
5. Top 10 Domains — horizontal BarChart, classification colors
6. Streak Heatmap — custom Tailwind CSS grid (NOT Recharts)
   - 7 columns (days of week), rows = weeks in selected range
   - bg-success/40 for high activity, bg-warning/40 for medium, bg-bg-tertiary for none
   - Tooltip on hover: date + behavior score + focus time

**PDF Report Download:**
- Prominent cyan "Download Weekly Report" button
- Date range selector (default: last 7 days)
- Click → client-side generation via @react-pdf/renderer
- Show spinner during generation
- Auto-downloads as "BehaviorIQ-Report-[dates].pdf"

**PDF Content (7 sections):**
1. Cover: logo, user name, date range, score + level
2. Time Breakdown: productive/neutral/distracting totals + percentages
3. Focus Sessions: table (task, category, planned, actual, status, rating) + completion rate
4. Top 10 Sites: domain, time, classification
5. Daily Score: table of 7 days (PDF cannot render SVG charts directly)
6. Consistency: streak count, active days count
7. Anomalies: list with severity badges
Footer on every page: "Generated by BehaviorIQ • [date]"

---

### /app/(app)/profile/page.tsx

**User info:** name, email, role badge, joined date, timezone (read-only)

**Goals:**
- Daily Focus Goal: slider 30–480 min, live value
- Preferred categories: multi-select pills

**Tracking:**
- Idle threshold: number input 30–600s
- Pomodoro defaults: work/break/long-break

**Notifications:**
- Enable/disable interruption notifications toggle
- Idle reminder interval

**Theme:** Dark / Light toggle → saves to localStorage

**Danger Zone:**
- Delete Account: type "DELETE" to enable confirm button
- On confirm: delete all data + deactivate Supabase auth user

---

### Admin Pages

**/app/(app)/admin/page.tsx**
- Server-side guard: if role !== 'admin' → redirect to /dashboard
- 4 stat cards: Total Users, Active Today, Avg Score, Low Engagement (score < 50)
- System health: Supabase status, last cron run time
- Recent anomalies: last 5 across all users

**/app/(app)/admin/users/page.tsx**
- Search input (client-side filter)
- Sortable table: Name | Email | Joined | Last Active | Focus 7d | Rate | Score | Status
- Click row → /admin/monitoring/[userId]

**/app/(app)/admin/monitoring/[userId]/page.tsx**
- userId from URL params
- User card + score ring + session history table + weekly chart

**/app/(app)/admin/alerts/page.tsx**
- Filter tabs: All | Info | Warning | Critical
- Table: user, type, message, severity, triggered, reviewed
- "Mark Reviewed" button per row

---

## MOCK DATA SPEC

Use realistic content — no lorem ipsum, no placeholder values.

```typescript
// Realistic task names:
const MOCK_TASKS = [
  "Implement Supabase RLS policies",
  "Read chapter 6 — Computer Networks",
  "Design BehaviorIQ popup component",
  "Debug service worker alarm handler",
  "Write unit tests for scoreEngine.ts",
  "Review pull requests — feature/sync-manager",
  "Study system design — consistent hashing",
  "Build streak heatmap component",
  "Fix TypeScript errors in tabTracker module",
  "Write API documentation for /api/sync",
  "Implement PDF report generation",
  "Study dynamic programming — LeetCode",
  "Refactor storage abstraction layer",
  "Debug CORS issue with extension sync",
  "Read Next.js App Router documentation",
];

// Mock data must include:
// users: 10 (9 regular + 1 admin), realistic Indian names and emails
// sessions: 30 across last 14 days, varied everything
// dailySummaries: 14 days, scores NOT flat:
//   example: [82, 71, 45, 88, 62, 79, 55, 91, 68, 74, 83, 49, 77, 85]
// anomalyAlerts: 5 (mix of all severities and types)
// domainStats: 15 domains, last 7 days, realistic time distributions
// insights: 5 natural language strings
// adminStats: { totalUsers:10, activeToday:6, avgScore:71, lowEngagement:2 }
```
