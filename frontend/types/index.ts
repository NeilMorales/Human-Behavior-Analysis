export type SessionStatus = 'in_progress' | 'completed' | 'interrupted' | 'abandoned';
export type SessionCategory = 'Study' | 'Coding' | 'Reading' | 'Project' | 'Writing' | 'Design' | 'Other';
export type SessionMode = 'free' | 'pomodoro';
export type Classification = 'productive' | 'neutral' | 'distracting';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type UserRole = 'user' | 'admin';
export type BehaviorLevel = 'Highly Productive' | 'Moderate' | 'Low Productivity';
export type IdleState = 'active' | 'idle' | 'locked';
export type EventType =
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
