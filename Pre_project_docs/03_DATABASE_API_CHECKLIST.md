# BehaviorIQ — File 3 of 3: Database, API Routes & Complete Action Checklist
# Read Files 1 and 2 first. This file is the build guide.

---

## DATABASE SCHEMA — Supabase / PostgreSQL 15

Run this as a single migration file: supabase/migrations/001_initial_schema.sql
All timestamps UTC. RLS on every table. Never store passwords.

```sql
-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  timezone      TEXT NOT NULL DEFAULT 'UTC',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  last_seen     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- FOCUS SESSIONS
-- ============================================================
CREATE TABLE focus_sessions (
  session_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  task_name           TEXT NOT NULL CHECK (char_length(task_name) BETWEEN 1 AND 200),
  category            TEXT NOT NULL CHECK (category IN
                        ('Study','Coding','Reading','Project','Writing','Design','Other')),
  mode                TEXT NOT NULL DEFAULT 'free' CHECK (mode IN ('free','pomodoro')),
  planned_duration    INTEGER NOT NULL CHECK (planned_duration BETWEEN 1 AND 480),
  start_time          TIMESTAMPTZ NOT NULL,
  end_time            TIMESTAMPTZ,
  actual_duration     INTEGER CHECK (actual_duration BETWEEN 0 AND 480),
  status              TEXT NOT NULL DEFAULT 'in_progress'
                        CHECK (status IN ('in_progress','completed','interrupted','abandoned')),
  idle_time_during    INTEGER NOT NULL DEFAULT 0 CHECK (idle_time_during >= 0),
  interruption_count  INTEGER NOT NULL DEFAULT 0 CHECK (interruption_count >= 0),
  notes               TEXT CHECK (char_length(notes) <= 1000),
  self_rating         SMALLINT CHECK (self_rating BETWEEN 1 AND 5),
  focus_score         NUMERIC(5,2) CHECK (focus_score BETWEEN 0 AND 100),
  pomodoro_cycles     SMALLINT DEFAULT 0,
  is_deleted          BOOLEAN NOT NULL DEFAULT false,
  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TAB EVENTS — raw event log from extension
-- ============================================================
CREATE TABLE tab_events (
  event_id            UUID PRIMARY KEY, -- set by extension for idempotency
  user_id             UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  event_type          TEXT NOT NULL CHECK (event_type IN
                        ('tab_focus','tab_blur','idle_start','idle_end',
                         'window_blur','window_focus','session_start','session_end','heartbeat')),
  domain              TEXT,              -- null for idle/window/session events
  classification      TEXT CHECK (classification IN ('productive','neutral','distracting')),
  timestamp_ms        BIGINT NOT NULL,   -- milliseconds UTC (from Date.now())
  focus_session_id    UUID REFERENCES focus_sessions(session_id) ON DELETE SET NULL,
  date                DATE NOT NULL,     -- YYYY-MM-DD in user's local timezone
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- IDLE EVENTS — derived from tab_events, stored for easy querying
-- ============================================================
CREATE TABLE idle_events (
  idle_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  focus_session_id    UUID REFERENCES focus_sessions(session_id) ON DELETE SET NULL,
  start_time          TIMESTAMPTZ NOT NULL,
  end_time            TIMESTAMPTZ NOT NULL,
  duration_seconds    INTEGER NOT NULL CHECK (duration_seconds > 0)
);

-- ============================================================
-- DAILY SUMMARIES — one row per user per day, upserted after each sync
-- ============================================================
CREATE TABLE daily_summaries (
  user_id             UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  date                DATE NOT NULL,
  total_focus_time    INTEGER NOT NULL DEFAULT 0,   -- minutes
  sessions_count      INTEGER NOT NULL DEFAULT 0,
  completion_rate     NUMERIC(5,4) NOT NULL DEFAULT 0, -- 0.0000 to 1.0000
  idle_time           INTEGER NOT NULL DEFAULT 0,   -- seconds
  productive_time     INTEGER NOT NULL DEFAULT 0,   -- minutes
  distracting_time    INTEGER NOT NULL DEFAULT 0,   -- minutes
  neutral_time        INTEGER NOT NULL DEFAULT 0,   -- minutes
  total_online_time   INTEGER NOT NULL DEFAULT 0,   -- minutes
  tab_switches        INTEGER NOT NULL DEFAULT 0,
  behavior_score      NUMERIC(5,2) NOT NULL DEFAULT 0,
  rolling_7d_score    NUMERIC(5,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

-- ============================================================
-- ANOMALY ALERTS
-- ============================================================
CREATE TABLE anomaly_alerts (
  alert_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  alert_type      TEXT NOT NULL,
  message         TEXT NOT NULL,
  severity        TEXT NOT NULL CHECK (severity IN ('info','warning','critical')),
  triggered_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_read         BOOLEAN NOT NULL DEFAULT false,
  reviewed_by     UUID REFERENCES users(user_id) ON DELETE SET NULL
);

-- ============================================================
-- USER SETTINGS
-- ============================================================
CREATE TABLE user_settings (
  user_id                   UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  daily_goal_minutes        INTEGER NOT NULL DEFAULT 120
                              CHECK (daily_goal_minutes BETWEEN 30 AND 480),
  preferred_categories      JSONB NOT NULL DEFAULT '[]',
  idle_threshold_seconds    INTEGER NOT NULL DEFAULT 120
                              CHECK (idle_threshold_seconds BETWEEN 30 AND 600),
  pomodoro_mode             BOOLEAN NOT NULL DEFAULT false,
  work_duration             INTEGER NOT NULL DEFAULT 25
                              CHECK (work_duration BETWEEN 5 AND 120),
  break_duration            INTEGER NOT NULL DEFAULT 5
                              CHECK (break_duration BETWEEN 1 AND 60),
  long_break_duration       INTEGER NOT NULL DEFAULT 15
                              CHECK (long_break_duration BETWEEN 5 AND 60),
  notifications_enabled     BOOLEAN NOT NULL DEFAULT true,
  reminder_interval_seconds INTEGER NOT NULL DEFAULT 300,
  custom_classifications    JSONB NOT NULL DEFAULT '{}'
);

-- ============================================================
-- ACHIEVEMENTS
-- ============================================================
CREATE TABLE achievements (
  achievement_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  type            TEXT NOT NULL,
  unlocked_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata        JSONB,
  UNIQUE (user_id, type)
);

-- ============================================================
-- AUDIT LOG — admin actions
-- ============================================================
CREATE TABLE audit_log (
  log_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id   UUID REFERENCES users(user_id) ON DELETE SET NULL,
  action          TEXT NOT NULL,
  target_user_id  UUID REFERENCES users(user_id) ON DELETE SET NULL,
  performed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  details         JSONB
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_focus_sessions_user_time   ON focus_sessions(user_id, start_time DESC);
CREATE INDEX idx_focus_sessions_status      ON focus_sessions(user_id, status) WHERE is_deleted = false;
CREATE INDEX idx_tab_events_user_date       ON tab_events(user_id, date DESC);
CREATE INDEX idx_tab_events_domain          ON tab_events(user_id, domain, date);
CREATE INDEX idx_tab_events_unsynced        ON tab_events(user_id) WHERE event_type = 'tab_focus';
CREATE INDEX idx_daily_summaries_user_date  ON daily_summaries(user_id, date DESC);
CREATE INDEX idx_anomaly_alerts_user        ON anomaly_alerts(user_id, triggered_at DESC);
CREATE INDEX idx_anomaly_alerts_unread      ON anomaly_alerts(user_id) WHERE is_read = false;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_sessions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tab_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE idle_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomaly_alerts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements     ENABLE ROW LEVEL SECURITY;

-- User owns their own rows
CREATE POLICY "users_own_data" ON focus_sessions
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_data" ON tab_events
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_data" ON idle_events
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_data" ON daily_summaries
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_data" ON anomaly_alerts
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_data" ON user_settings
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "users_own_data" ON achievements
  FOR ALL USING (auth.uid() = user_id);

-- Admins can read all rows
CREATE POLICY "admin_read_all" ON focus_sessions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "admin_read_all" ON daily_summaries
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "admin_read_all" ON anomaly_alerts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE user_id = auth.uid() AND role = 'admin')
  );
-- Repeat admin_read_all for all other tables

-- ============================================================
-- TRIGGER: create user_settings row automatically on user insert
-- ============================================================
CREATE OR REPLACE FUNCTION create_default_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_settings (user_id) VALUES (NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_created
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION create_default_settings();
```

---

## API ROUTES — Next.js App Router

All routes in app/api/. Auth via Supabase JWT in Authorization header.
All protected routes use: `const supabase = createServerClient()` and verify session.

### POST /api/sync — PRIMARY EXTENSION ENDPOINT

```typescript
// This is the most important API route.
// Receives batched events from the extension every 5 minutes.
// Stores events, rebuilds daily summary, runs anomaly detection.

// Request body:
{
  events: BrowserEvent[] // array of tab/idle/session events
}

// Response:
{
  syncedIds: string[] // IDs of successfully stored events
}

// Implementation steps:
// 1. Verify JWT, get userId
// 2. For each event: INSERT INTO tab_events ... ON CONFLICT (event_id) DO NOTHING
// 3. Collect unique dates from the events
// 4. For each unique date: call buildDailySummary(userId, date)
// 5. Run anomalyDetector(userId) after all summaries built
// 6. Update users.last_seen = now()
// 7. Return { syncedIds: all event IDs that were in the batch }
```

### Auth Routes

```
POST /api/auth/signup
  Body: { name, email, password, timezone }
  1. supabase.auth.signUp({ email, password })
  2. INSERT INTO users (user_id, name, email, timezone) — trigger creates settings row
  Returns: { user, access_token, refresh_token }

POST /api/auth/login
  Body: { email, password }
  supabase.auth.signInWithPassword({ email, password })
  Returns: { user, access_token, refresh_token }

POST /api/auth/logout
  Protected. supabase.auth.signOut()

GET /api/auth/me
  Protected. Returns user row joined with user_settings row.

POST /api/auth/refresh
  Body: { refresh_token }
  supabase.auth.refreshSession({ refresh_token })
  Returns: { access_token, refresh_token }
```

### Session Routes

```
POST /api/sessions
  Protected.
  Body: { taskName, category, mode, plannedDuration }
  Validate: SELECT count(*) FROM focus_sessions WHERE user_id=? AND status='in_progress' AND is_deleted=false
  If count > 0: return 409 { error: 'Session already in progress' }
  INSERT INTO focus_sessions ...
  Returns: FocusSession

GET /api/sessions
  Protected.
  Query: ?from&to&category&status&page=1&limit=20
  Returns: { sessions: FocusSession[], total: number }

GET /api/sessions/active
  Protected.
  SELECT * FROM focus_sessions WHERE user_id=? AND status='in_progress' AND is_deleted=false LIMIT 1
  Returns: FocusSession | null

GET /api/sessions/[id]
  Protected. Returns FocusSession (verify user owns it)

PUT /api/sessions/[id]
  Protected.
  Body: { status?, notes?, selfRating?, endTime?, actualDuration?, taskName?, category? }
  If stopping (endTime provided):
    - Cap actual_duration at 480
    - Compute focus_score via scoreEngine.computeSessionScore()
    - Call buildDailySummary(userId, sessionDate)
  UPDATE focus_sessions SET ... WHERE session_id=? AND user_id=?

DELETE /api/sessions/[id]
  Protected.
  UPDATE focus_sessions SET is_deleted=true, deleted_at=now() WHERE session_id=? AND user_id=?
  Call buildDailySummary() for that session's date
```

### Analysis Routes

```
GET /api/analysis/dashboard
  Protected.
  Returns ALL dashboard data in ONE call to minimize round trips:
  {
    score: number,
    level: BehaviorLevel,
    scoreColor: string,
    cards: {
      focusTimeToday, sessionsToday, completionRate,
      idleTimeToday, productiveTimeToday, distractingTimeToday
    },
    charts: {
      weeklyFocusTime: [{ date, minutes }],    // 7 items
      dailySessions:   [{ date, count }],      // 7 items
      scoreTrend:      [{ date, score }],      // 14 items
      productivitySplit: { productive, neutral, distracting }, // today's minutes
      topDomains:      DomainStat[],           // today, top 8
    },
    activeSession: FocusSession | null,
    anomalies: AnomalyAlert[],                 // top 3 unread
    insights: string[],                        // 3–5 generated strings
  }

GET /api/analysis/score
  Protected.
  Returns: { score, level, color }

GET /api/analysis/weekly
  Protected.
  Returns: { date, focusTime, sessions, score, productiveTime, distractingTime }[]  // 7 items

GET /api/analysis/domains
  Protected.
  Query: ?from&to
  Returns: DomainStat[] sorted by totalSeconds desc

GET /api/analysis/streak
  Protected.
  Returns: { currentStreak, longestStreak, activeDates: string[] }

GET /api/analysis/anomalies
  Protected.
  Returns: AnomalyAlert[] (unread, sorted severity desc, triggered_at desc)

PUT /api/analysis/anomalies/[id]
  Protected.
  Body: { isRead: true }
  UPDATE anomaly_alerts SET is_read=true WHERE alert_id=? AND user_id=?
```

### Settings, Export, Admin

```
GET /api/settings
  Protected.
  SELECT * FROM user_settings WHERE user_id=?
  If no row: INSERT default row, return defaults

PUT /api/settings
  Protected.
  Body: Partial<UserSettings>
  Validate all ranges before UPDATE

GET /api/export/csv
  Protected.
  SELECT all non-deleted sessions for user → format as CSV → return with Content-Disposition: attachment

GET /api/export/json
  Protected.
  Returns: { sessions, dailySummaries, domainStats, settings }

GET /api/admin/stats
  Admin only.
  Returns: { totalUsers, activeToday, avgBehaviorScore, lowEngagementUsers }

GET /api/admin/users
  Admin only. Query: ?search&sort&order&page&limit
  Returns users joined with their latest daily_summary

GET /api/admin/users/[id]
  Admin only. Returns full user profile + last 30 days summaries + last 20 sessions

GET /api/admin/alerts
  Admin only. Query: ?severity
  Returns all anomaly_alerts across all users

PUT /api/admin/alerts/[id]
  Admin only.
  Body: { reviewedBy: string }
  UPDATE anomaly_alerts SET reviewed_by=?
  INSERT INTO audit_log (actor, action, target, details)
```

---

## CORE LIBRARY FUNCTIONS

### lib/summaryBuilder.ts

```typescript
// Called after every /api/sync and after every session stop
export async function buildDailySummary(
  supabase: SupabaseClient,
  userId: string,
  date: string // 'YYYY-MM-DD'
): Promise<DailySummary> {

  // 1. Fetch all tab_events for this user on this date
  const { data: events } = await supabase
    .from('tab_events')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .order('timestamp_ms', { ascending: true });

  // 2. Compute time per classification from tab_focus / tab_blur pairs
  //    Also compute tab_switches count and total_online_time

  // 3. Fetch all focus_sessions for this user on this date (non-deleted)
  const { data: sessions } = await supabase
    .from('focus_sessions')
    .select('*')
    .eq('user_id', userId)
    .gte('start_time', `${date}T00:00:00Z`)
    .lt('start_time',  `${date}T23:59:59Z`)
    .eq('is_deleted', false);

  // 4. Compute session metrics
  const completedSessions = sessions?.filter(s => s.status === 'completed').length ?? 0;
  const totalSessions = sessions?.filter(s => s.status !== 'abandoned').length ?? 0;
  const totalFocusTime = sessions?.reduce((sum, s) => sum + (s.actual_duration ?? 0), 0) ?? 0;
  const idleTime = sessions?.reduce((sum, s) => sum + s.idle_time_during, 0) ?? 0;
  const interruptionCount = sessions?.reduce((sum, s) => sum + s.interruption_count, 0) ?? 0;

  // 5. Fetch user settings for daily goal
  const { data: settings } = await supabase
    .from('user_settings')
    .select('daily_goal_minutes')
    .eq('user_id', userId)
    .single();

  // 6. Compute behavior score
  const score = computeScore({
    focusTimeMinutes: totalFocusTime,
    dailyGoalMinutes: settings?.daily_goal_minutes ?? 120,
    completedSessions,
    totalSessions,
    productiveTimeMinutes: productiveTime, // from step 2
    totalOnlineMinutes: totalOnlineTime,   // from step 2
    activeDaysLast7: await getActiveDaysLast7(supabase, userId, date),
    idleSeconds: idleTime,
    totalFocusSeconds: totalFocusTime * 60,
    interruptionCount,
    plannedFocusSeconds: sessions?.reduce((sum, s) => sum + s.planned_duration * 60, 0) ?? 0,
  });

  // 7. Compute 7-day rolling score
  const rolling7dScore = await computeRolling7d(supabase, userId, date, score);

  // 8. UPSERT daily_summaries row
  const summary = {
    user_id: userId, date, total_focus_time: totalFocusTime, sessions_count: totalSessions,
    completion_rate: totalSessions > 0 ? completedSessions / totalSessions : 0,
    idle_time: idleTime, productive_time: productiveTime, distracting_time: distractingTime,
    neutral_time: neutralTime, total_online_time: totalOnlineTime,
    tab_switches: tabSwitches, behavior_score: score, rolling_7d_score: rolling7dScore,
  };

  await supabase.from('daily_summaries').upsert(summary, { onConflict: 'user_id,date' });

  return summary;
}
```

### lib/anomalyDetector.ts

```typescript
// Run after buildDailySummary — check all 7 rules
// Deduplication: never insert same alert_type for same user on same calendar day

export async function runAnomalyDetection(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {

  // Fetch last 14 days of summaries + last 10 sessions for rule evaluation
  const summaries = await getLast14Summaries(supabase, userId);
  const recentSessions = await getLast10Sessions(supabase, userId);
  const today = getTodayDate();

  const alerts: Omit<AnomalyAlert, 'alert_id' | 'triggered_at' | 'is_read' | 'reviewed_by'>[] = [];

  // Rule 1: No sessions for 3+ consecutive days
  const last3Days = summaries.slice(0, 3);
  if (last3Days.every(s => s.sessions_count === 0)) {
    alerts.push({ user_id: userId, alert_type: 'no_sessions_streak', severity: 'critical',
      message: "You haven't logged a focus session in 3 days." });
  }

  // Rule 2: This week focus time < 50% of last week
  const thisWeek = summaries.slice(0, 7).reduce((s, r) => s + r.total_focus_time, 0);
  const lastWeek = summaries.slice(7, 14).reduce((s, r) => s + r.total_focus_time, 0);
  if (lastWeek > 0 && thisWeek < lastWeek * 0.5) {
    alerts.push({ user_id: userId, alert_type: 'low_focus_time', severity: 'warning',
      message: "Your focus time this week is less than half of last week's." });
  }

  // Rule 3: >60% of last 5 sessions interrupted
  const last5 = recentSessions.slice(0, 5);
  const interrupted = last5.filter(s => s.status === 'interrupted').length;
  if (last5.length >= 3 && interrupted / last5.length > 0.6) {
    alerts.push({ user_id: userId, alert_type: 'high_interruption_rate', severity: 'warning',
      message: "More than 60% of your recent sessions were interrupted." });
  }

  // Rule 4: Idle time > 40% of session duration in last 3 sessions
  const last3sessions = recentSessions.slice(0, 3);
  const highIdleSessions = last3sessions.filter(s =>
    s.actual_duration && s.idle_time_during > (s.actual_duration * 60 * 0.4)
  );
  if (last3sessions.length >= 3 && highIdleSessions.length === 3) {
    alerts.push({ user_id: userId, alert_type: 'idle_spike', severity: 'info',
      message: "Your idle time during sessions has been unusually high." });
  }

  // Rule 5: Goal set but 0 sessions for 5 days
  const settings = await getSettings(supabase, userId);
  const last5Days = summaries.slice(0, 5);
  if (settings.daily_goal_minutes > 0 && last5Days.every(s => s.sessions_count === 0)) {
    alerts.push({ user_id: userId, alert_type: 'goal_not_met', severity: 'warning',
      message: "You've set a daily goal but haven't logged sessions in 5 days." });
  }

  // Rule 6: Distracting time > 40% of online time for 3+ consecutive days
  const highDistraction = summaries.slice(0, 3).filter(s =>
    s.total_online_time > 0 && s.distracting_time / s.total_online_time > 0.4
  );
  if (highDistraction.length === 3) {
    alerts.push({ user_id: userId, alert_type: 'distraction_spike', severity: 'warning',
      message: "You've spent over 40% of your online time on distracting sites." });
  }

  // Rule 7: Today's focus time > 3x 7-day average (data quality flag)
  const avg7d = summaries.slice(1, 8).reduce((s, r) => s + r.total_focus_time, 0) / 7;
  const today_summary = summaries[0];
  if (avg7d > 0 && today_summary.total_focus_time > avg7d * 3) {
    alerts.push({ user_id: userId, alert_type: 'data_quality_spike', severity: 'info',
      message: "Today's focus time is unusually high — possible data anomaly." });
  }

  // Insert alerts with deduplication
  for (const alert of alerts) {
    await supabase.from('anomaly_alerts').insert({
      ...alert,
      triggered_at: new Date().toISOString(),
    }).throwOnError();
    // Supabase will ignore if duplicate exists (add unique constraint on user_id+alert_type+date)
  }
}
```

---

## SUPABASE EDGE FUNCTIONS

### supabase/functions/daily-summary/index.ts
```typescript
// Cron schedule: "0 0 * * *" (midnight UTC every day)
// Set in Supabase Dashboard → Edge Functions → Schedule

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Get all active users
  const { data: users } = await supabase
    .from('users')
    .select('user_id, timezone')
    .eq('is_active', true);

  for (const user of users ?? []) {
    // "Yesterday" in the user's own timezone
    const yesterday = getYesterdayInTimezone(user.timezone);
    try {
      await buildDailySummary(supabase, user.user_id, yesterday);
      await runAnomalyDetection(supabase, user.user_id);
    } catch (err) {
      console.error(`Failed for user ${user.user_id}:`, err);
      // Continue to next user — never abort the whole job
    }
  }

  return new Response('OK', { status: 200 });
});
```

---

## COMPLETE ACTION CHECKLIST

Priority: [C] = Critical blocker | [R] = Required feature | [N] = Nice to have

---

### PHASE 1 — Foundation (complete before any feature code)

- [ ] [C] Create monorepo root folder: behavioriq/
- [ ] [C] Create /extension folder — run: npm create vite@latest extension -- --template react-ts
- [ ] [C] Install CRXJS Vite plugin in extension: npm i @crxjs/vite-plugin -D
- [ ] [C] Configure extension/vite.config.ts with CRXJS plugin pointing to manifest.json
- [ ] [C] Create /dashboard folder — run: npx create-next-app@latest dashboard --typescript --tailwind --app
- [ ] [C] Create /supabase folder with /migrations and /functions subfolders
- [ ] [C] Create Supabase project at supabase.com
- [ ] [C] Run 001_initial_schema.sql in Supabase SQL editor
- [ ] [C] Verify RLS is enabled on all tables in Supabase dashboard
- [ ] [C] Add unique constraint on anomaly_alerts(user_id, alert_type, date_trunc('day', triggered_at))
- [ ] [C] Copy SUPABASE_URL and SUPABASE_ANON_KEY into dashboard/.env.local
- [ ] [C] Copy SUPABASE_SERVICE_ROLE_KEY into dashboard/.env.local (server only — never expose to client)
- [ ] [C] Create dashboard/types/index.ts — paste all TypeScript types from File 2 of this spec
- [ ] [C] Create extension/src/shared/types.ts — paste same TypeScript types
- [ ] [C] Create extension/src/shared/constants.ts — paste default classifications and all constants
- [ ] [R] Configure Tailwind in dashboard with full BehaviorIQ color palette from File 1
- [ ] [R] Install Inter and Fira Code via next/font in dashboard/app/layout.tsx
- [ ] [R] Set up dashboard/lib/supabase/client.ts (browser client, anon key)
- [ ] [R] Set up dashboard/lib/supabase/server.ts (server client, service role key)
- [ ] [R] Create dashboard/middleware.ts — Supabase auth guard on all (app) routes
- [ ] [R] Create dashboard/lib/mockData.ts — all realistic mock data as specified in File 2
- [ ] [R] Create dashboard/lib/api.ts — USE_MOCK=true, all API functions stubbed
- [ ] [R] Create dashboard/lib/scoreEngine.ts — pure score computation functions from File 1
- [ ] [R] Create extension/src/shared/scoreEngine.ts — same file, copied

---

### PHASE 2 — Extension Background Modules

- [ ] [C] Create extension/src/shared/storage.ts — complete chrome.storage abstraction
- [ ] [C] Create extension/src/shared/utils.ts — parseDomain(), generateUUID(), getTodayDate(), formatDuration()
- [ ] [C] Create extension/src/shared/api.ts — all fetch() calls to dashboard API
- [ ] [C] Create extension/src/background/tabTracker.ts — handleTabActivated, handleTabUpdated
- [ ] [C] Create extension/src/background/idleDetector.ts — handleIdleStateChange
- [ ] [C] Create extension/src/background/alarmHandler.ts — registerAlarms, handleAlarm, ALARMS constants
- [ ] [C] Create extension/src/background/sessionManager.ts — startSession, stopSession, checkOrphanSession
- [ ] [C] Create extension/src/background/notificationManager.ts — all notification functions + button handler
- [ ] [C] Create extension/src/background/syncManager.ts — attemptSync, markEventsSynced, purgeOldEvents
- [ ] [C] Create extension/src/background/index.ts — wire all event listeners
- [ ] [R] Create extension/src/content/index.ts — minimal content script (placeholder for now)
- [ ] [R] Test: load extension via chrome://extensions, verify no console errors in service worker
- [ ] [R] Test: open a few tabs, check chrome.storage.local via DevTools → verify events being written
- [ ] [R] Test: wait 1 minute, verify heartbeat alarm fires, verify heartbeat events in storage
- [ ] [R] Test: stay idle 120+ seconds, verify idle_start event written
- [ ] [R] Test: start a focus session, switch to youtube.com → verify notification fires

---

### PHASE 3 — Extension Popup

- [ ] [C] Build extension/src/popup/components/ScoreRing.tsx — SVG, small (80px), animated
- [ ] [C] Build extension/src/popup/components/StatRow.tsx — icon + label + value
- [ ] [C] Build extension/src/popup/components/CurrentSite.tsx — domain + classification badge
- [ ] [C] Build extension/src/popup/components/StartSession.tsx — task input + category + duration + start button
- [ ] [C] Build extension/src/popup/components/SessionTimer.tsx — live countdown + pause + stop
- [ ] [C] Build extension/src/popup/Popup.tsx — compose all components, read from chrome.storage.local
- [ ] [R] Popup reads storage directly (not via message passing — faster)
- [ ] [R] SessionTimer uses setInterval(1000) to recompute remaining time from stored startTime
- [ ] [R] Stop button → chrome.runtime.sendMessage to background → sessionManager.stopSession
- [ ] [R] Start button → chrome.runtime.sendMessage to background → sessionManager.startSession
- [ ] [R] "Open Dashboard" link → chrome.tabs.create({ url: DASHBOARD_URL })
- [ ] [R] Test popup at exactly 320×420 — nothing overflows, all content visible

---

### PHASE 4 — Extension Options Page

- [ ] [R] Build extension/src/options/components/AccountSection.tsx — login/signup form + profile if logged in
- [ ] [R] Build extension/src/options/components/DomainList.tsx — table of all known domains
- [ ] [R] Build extension/src/options/components/ClassificationRow.tsx — domain + dropdown (productive/neutral/distracting)
- [ ] [R] Build extension/src/options/components/GoalSettings.tsx — daily goal slider + idle threshold
- [ ] [R] Build extension/src/options/Options.tsx — compose all sections
- [ ] [R] Save all settings changes to chrome.storage.local immediately on change
- [ ] [R] Login form: POST to /api/auth/login → store tokens in chrome.storage.sync
- [ ] [N] Show last sync time and sync status in options page

---

### PHASE 5 — Dashboard Layout and Auth

- [ ] [C] Build dashboard/app/layout.tsx — Inter + Fira Code fonts, QueryClientProvider, Toaster
- [ ] [C] Build dashboard/app/(auth)/login/page.tsx — dark form, Supabase signIn, redirect on success
- [ ] [R] Build dashboard/app/(auth)/signup/page.tsx — registration, auto-detect timezone
- [ ] [C] Build dashboard/app/(app)/layout.tsx — Sidebar + Navbar shell
- [ ] [C] Build dashboard/components/layout/Sidebar.tsx — collapsible, Lucide icons, active states
- [ ] [C] Build dashboard/components/layout/Navbar.tsx — page title, session pill, notification bell
- [ ] [R] Build dashboard/components/ui/Button.tsx — primary / secondary / danger / ghost variants
- [ ] [R] Build dashboard/components/ui/Modal.tsx — reusable portal-based modal
- [ ] [R] Build dashboard/components/ui/Toast.tsx — slide-in stack, 4s auto-dismiss
- [ ] [R] Build dashboard/components/ui/Skeleton.tsx — shimmer pulse loader
- [ ] [R] Build dashboard/components/ui/Badge.tsx — status badges with glow variants

---

### PHASE 6 — Dashboard Page

- [ ] [C] Build dashboard/components/dashboard/ScoreRing.tsx — SVG animated arc, color by score
- [ ] [C] Build dashboard/components/dashboard/StatCard.tsx — animated counter, icon, trend arrow
- [ ] [C] Build dashboard/app/(app)/dashboard/page.tsx — Server Component, fetches historical data
- [ ] [C] Render all 6 stat cards with mock data + animated counters
- [ ] [C] Render Behavior Score Ring — animated, color-coded, level label
- [ ] [R] Build dashboard/components/dashboard/ActiveSessionCard.tsx — pulsing cyan, live timer
- [ ] [R] Build dashboard/hooks/useActiveSession.ts — polls /api/sessions/active every 30s
- [ ] [C] Build dashboard/components/charts/FocusTimeLine.tsx — Recharts LineChart, cyan gradient
- [ ] [C] Build dashboard/components/charts/SessionsBar.tsx — violet BarChart
- [ ] [C] Build dashboard/components/charts/ScoreTrend.tsx — color-coded line segments
- [ ] [R] Build dashboard/components/charts/CompletionDonut.tsx — RadialBarChart with center label
- [ ] [R] Build dashboard/components/charts/ProductivityPie.tsx — productive/neutral/distracting
- [ ] [R] Build dashboard/components/charts/DomainBreakdown.tsx — horizontal BarChart classification colors
- [ ] [R] Build dashboard/components/dashboard/AnomalyAlert.tsx — dismissible severity cards
- [ ] [R] Build dashboard/components/dashboard/InsightCard.tsx — natural language insight display
- [ ] [R] All chart containers show Skeleton on load, replace after data resolves
- [ ] [R] Configure Recharts dark theme: custom tooltip, no grid lines, animate on mount

---

### PHASE 7 — Focus, History, Reports, Profile

- [ ] [C] Build dashboard/components/focus/SessionForm.tsx — task input, category pills, duration, mode toggle
- [ ] [C] Build dashboard/components/focus/TimerRing.tsx — SVG countdown, color shifts
- [ ] [C] Build dashboard/components/focus/StopModal.tsx — status radio, star rating, notes
- [ ] [C] Build dashboard/app/(app)/focus/page.tsx — full session flow
- [ ] [R] Implement tab visibility detection (visibilitychange) in focus page
- [ ] [R] Implement idle detection (debounced mousemove/keydown) in focus page
- [ ] [R] Implement orphan recovery on focus page mount
- [ ] [R] Persist timer state to localStorage every 5 seconds
- [ ] [R] Build dashboard/app/(app)/history/page.tsx — filter bar + session table + expansion
- [ ] [R] Build dashboard/app/(app)/reports/page.tsx — all charts + date range tabs
- [ ] [R] Build dashboard/components/charts/StreakHeatmap.tsx — custom Tailwind CSS grid
- [ ] [R] Build dashboard/components/charts/CategoryBar.tsx — horizontal bar
- [ ] [R] Build dashboard/components/reports/PDFReport.tsx — @react-pdf/renderer document
- [ ] [R] PDF: all 7 sections as specified in File 2
- [ ] [R] PDF download button: loading spinner → auto-download on complete
- [ ] [R] Build dashboard/app/(app)/profile/page.tsx — all settings sections + danger zone

---

### PHASE 8 — Admin Pages

- [ ] [R] Server-side admin guard in dashboard/app/(app)/admin/layout.tsx
- [ ] [R] Build /admin/page.tsx — stat cards + system health + recent anomalies
- [ ] [R] Build /admin/users/page.tsx — sortable searchable table
- [ ] [R] Build /admin/monitoring/[userId]/page.tsx — per-user detail
- [ ] [R] Build /admin/alerts/page.tsx — severity filter + mark reviewed

---

### PHASE 9 — API Routes

- [ ] [C] Build dashboard/app/api/sync/route.ts — batch event insert + summary rebuild + anomaly check
- [ ] [C] Add ON CONFLICT (event_id) DO NOTHING to tab_events insert in sync route
- [ ] [C] Build all /api/auth/* routes
- [ ] [C] Build all /api/sessions/* routes — validate no session overlap on POST
- [ ] [R] Build all /api/analysis/* routes
- [ ] [R] Build dashboard/lib/summaryBuilder.ts — buildDailySummary() with full event log computation
- [ ] [R] Build dashboard/lib/anomalyDetector.ts — all 7 rules with deduplication
- [ ] [R] Build /api/settings route (GET creates defaults if none)
- [ ] [R] Build /api/export/csv and /api/export/json routes
- [ ] [R] Build all /api/admin/* routes with admin check
- [ ] [N] Build /api/export/pdf route (alternative to client-side PDF)

---

### PHASE 10 — Supabase Edge Functions

- [ ] [R] Write supabase/functions/daily-summary/index.ts — midnight cron
- [ ] [R] Deploy: supabase functions deploy daily-summary
- [ ] [R] Schedule in Supabase Dashboard: "0 0 * * *"
- [ ] [N] Write supabase/functions/weekly-digest/index.ts — Sunday 8am cron

---

### PHASE 11 — Integration and Final Testing

- [ ] [C] Flip USE_MOCK = false in dashboard/lib/api.ts
- [ ] [C] Test full flow: install extension → browse sites → open popup → verify stats
- [ ] [C] Test sync: browse with extension → check Supabase tab_events table → confirm rows inserted
- [ ] [C] Test session: start focus session in popup → switch to YouTube → verify notification
- [ ] [C] Test session stop: stop session → check Supabase focus_sessions → confirm row
- [ ] [C] Test summary: after sync → check daily_summaries table → confirm computed correctly
- [ ] [C] Test RLS: log in as user A, try to query user B's data → should return empty
- [ ] [C] Test auth flow: signup → login → JWT in chrome.storage.sync → dashboard access
- [ ] [R] Test offline: disconnect internet → browse → reconnect → verify sync catches up
- [ ] [R] Test orphan recovery: start session → kill Chrome → reopen → verify recovery modal
- [ ] [R] Test storage version migration: manually set old schemaVersion → reload → verify migration runs
- [ ] [R] Test PDF generation and download
- [ ] [R] Deploy dashboard to Vercel: connect GitHub repo → set env vars → deploy
- [ ] [R] Update DASHBOARD_URL constant in extension/src/shared/constants.ts to Vercel URL
- [ ] [R] Rebuild extension with production URL → test sync against live Vercel API
- [ ] [R] Load production build via chrome://extensions → full end-to-end test
- [ ] [N] Write privacy policy page (required for Chrome Web Store submission)
- [ ] [N] Prepare Chrome Web Store listing: screenshots, description, icon assets
- [ ] [N] Submit extension to Chrome Web Store
