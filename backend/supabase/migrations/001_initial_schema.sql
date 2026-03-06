-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    timezone TEXT NOT NULL DEFAULT 'UTC',
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_seen TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- ============================================================
-- FOCUS SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS focus_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    task_name TEXT NOT NULL CHECK (
        char_length(task_name) BETWEEN 1 AND 200
    ),
    category TEXT NOT NULL CHECK (
        category IN (
            'Study',
            'Coding',
            'Reading',
            'Project',
            'Writing',
            'Design',
            'Other'
        )
    ),
    mode TEXT NOT NULL DEFAULT 'free' CHECK (mode IN ('free', 'pomodoro')),
    planned_duration INTEGER NOT NULL CHECK (
        planned_duration BETWEEN 1 AND 480
    ),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    actual_duration INTEGER CHECK (
        actual_duration BETWEEN 0 AND 480
    ),
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (
        status IN (
            'in_progress',
            'completed',
            'interrupted',
            'abandoned'
        )
    ),
    idle_time_during INTEGER NOT NULL DEFAULT 0 CHECK (idle_time_during >= 0),
    interruption_count INTEGER NOT NULL DEFAULT 0 CHECK (interruption_count >= 0),
    notes TEXT CHECK (char_length(notes) <= 1000),
    self_rating SMALLINT CHECK (
        self_rating BETWEEN 1 AND 5
    ),
    focus_score NUMERIC(5, 2) CHECK (
        focus_score BETWEEN 0 AND 100
    ),
    pomodoro_cycles SMALLINT DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- ============================================================
-- TAB EVENTS — raw event log from extension
-- ============================================================
CREATE TABLE IF NOT EXISTS tab_events (
    event_id UUID PRIMARY KEY,
    -- set by extension for idempotency
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (
        event_type IN (
            'tab_focus',
            'tab_blur',
            'idle_start',
            'idle_end',
            'window_blur',
            'window_focus',
            'session_start',
            'session_end',
            'heartbeat'
        )
    ),
    domain TEXT,
    -- null for idle/window/session events
    classification TEXT CHECK (
        classification IN ('productive', 'neutral', 'distracting')
    ),
    timestamp_ms BIGINT NOT NULL,
    -- milliseconds UTC (from Date.now())
    focus_session_id UUID REFERENCES focus_sessions(session_id) ON DELETE
    SET NULL,
        date DATE NOT NULL,
        -- YYYY-MM-DD in user's local timezone
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- ============================================================
-- IDLE EVENTS — derived from tab_events, stored for easy querying
-- ============================================================
CREATE TABLE IF NOT EXISTS idle_events (
    idle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    focus_session_id UUID REFERENCES focus_sessions(session_id) ON DELETE
    SET NULL,
        start_time TIMESTAMPTZ NOT NULL,
        end_time TIMESTAMPTZ NOT NULL,
        duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0)
);
-- ============================================================
-- DAILY SUMMARIES — one row per user per day, upserted after each sync
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_summaries (
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_focus_time INTEGER NOT NULL DEFAULT 0,
    -- minutes
    sessions_count INTEGER NOT NULL DEFAULT 0,
    completion_rate NUMERIC(5, 4) NOT NULL DEFAULT 0,
    -- 0.0000 to 1.0000
    idle_time INTEGER NOT NULL DEFAULT 0,
    -- seconds
    productive_time INTEGER NOT NULL DEFAULT 0,
    -- minutes
    distracting_time INTEGER NOT NULL DEFAULT 0,
    -- minutes
    neutral_time INTEGER NOT NULL DEFAULT 0,
    -- minutes
    total_online_time INTEGER NOT NULL DEFAULT 0,
    -- minutes
    tab_switches INTEGER NOT NULL DEFAULT 0,
    behavior_score NUMERIC(5, 2) NOT NULL DEFAULT 0,
    rolling_7d_score NUMERIC(5, 2) NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, date)
);
-- ============================================================
-- ANOMALY ALERTS
-- ============================================================
CREATE TABLE IF NOT EXISTS anomaly_alerts (
    alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_read BOOLEAN NOT NULL DEFAULT false,
    reviewed_by UUID REFERENCES users(user_id) ON DELETE
    SET NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_alert_type_date ON anomaly_alerts (
    user_id,
    alert_type,
    CAST(triggered_at AT TIME ZONE 'UTC' AS DATE)
);
-- ============================================================
-- USER SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    daily_goal_minutes INTEGER NOT NULL DEFAULT 120 CHECK (
        daily_goal_minutes BETWEEN 30 AND 480
    ),
    preferred_categories JSONB NOT NULL DEFAULT '[]',
    idle_threshold_seconds INTEGER NOT NULL DEFAULT 120 CHECK (
        idle_threshold_seconds BETWEEN 30 AND 600
    ),
    pomodoro_mode BOOLEAN NOT NULL DEFAULT false,
    work_duration INTEGER NOT NULL DEFAULT 25 CHECK (
        work_duration BETWEEN 5 AND 120
    ),
    break_duration INTEGER NOT NULL DEFAULT 5 CHECK (
        break_duration BETWEEN 1 AND 60
    ),
    long_break_duration INTEGER NOT NULL DEFAULT 15 CHECK (
        long_break_duration BETWEEN 5 AND 60
    ),
    notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    reminder_interval_seconds INTEGER NOT NULL DEFAULT 300,
    custom_classifications JSONB NOT NULL DEFAULT '{}'
);
-- ============================================================
-- ACHIEVEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS achievements (
    achievement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB,
    UNIQUE (user_id, type)
);
-- ============================================================
-- AUDIT LOG — admin actions
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES users(user_id) ON DELETE
    SET NULL,
        action TEXT NOT NULL,
        target_user_id UUID REFERENCES users(user_id) ON DELETE
    SET NULL,
        performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        details JSONB
);
-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_time ON focus_sessions(user_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_status ON focus_sessions(user_id, status)
WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_tab_events_user_date ON tab_events(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_tab_events_domain ON tab_events(user_id, domain, date);
CREATE INDEX IF NOT EXISTS idx_tab_events_unsynced ON tab_events(user_id)
WHERE event_type = 'tab_focus';
CREATE INDEX IF NOT EXISTS idx_daily_summaries_user_date ON daily_summaries(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_anomaly_alerts_user ON anomaly_alerts(user_id, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomaly_alerts_unread ON anomaly_alerts(user_id)
WHERE is_read = false;
-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tab_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE idle_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomaly_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE policyname = 'users_own_data'
        AND tablename = 'focus_sessions'
) THEN CREATE POLICY "users_own_data" ON focus_sessions FOR ALL USING (auth.uid() = user_id);
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE policyname = 'users_own_data'
        AND tablename = 'tab_events'
) THEN CREATE POLICY "users_own_data" ON tab_events FOR ALL USING (auth.uid() = user_id);
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE policyname = 'users_own_data'
        AND tablename = 'idle_events'
) THEN CREATE POLICY "users_own_data" ON idle_events FOR ALL USING (auth.uid() = user_id);
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE policyname = 'users_own_data'
        AND tablename = 'daily_summaries'
) THEN CREATE POLICY "users_own_data" ON daily_summaries FOR ALL USING (auth.uid() = user_id);
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE policyname = 'users_own_data'
        AND tablename = 'anomaly_alerts'
) THEN CREATE POLICY "users_own_data" ON anomaly_alerts FOR ALL USING (auth.uid() = user_id);
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE policyname = 'users_own_data'
        AND tablename = 'user_settings'
) THEN CREATE POLICY "users_own_data" ON user_settings FOR ALL USING (auth.uid() = user_id);
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE policyname = 'users_own_data'
        AND tablename = 'achievements'
) THEN CREATE POLICY "users_own_data" ON achievements FOR ALL USING (auth.uid() = user_id);
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE policyname = 'admin_read_all'
        AND tablename = 'focus_sessions'
) THEN CREATE POLICY "admin_read_all" ON focus_sessions FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM users
            WHERE user_id = auth.uid()
                AND role = 'admin'
        )
    );
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE policyname = 'admin_read_all'
        AND tablename = 'daily_summaries'
) THEN CREATE POLICY "admin_read_all" ON daily_summaries FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM users
            WHERE user_id = auth.uid()
                AND role = 'admin'
        )
    );
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE policyname = 'admin_read_all'
        AND tablename = 'anomaly_alerts'
) THEN CREATE POLICY "admin_read_all" ON anomaly_alerts FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM users
            WHERE user_id = auth.uid()
                AND role = 'admin'
        )
    );
END IF;
END $$;
-- ============================================================
-- TRIGGER: create user_settings row automatically on user insert
-- ============================================================
CREATE OR REPLACE FUNCTION create_default_settings() RETURNS TRIGGER AS $$ BEGIN
INSERT INTO user_settings (user_id)
VALUES (NEW.user_id);
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS on_user_created ON users;
CREATE TRIGGER on_user_created
AFTER
INSERT ON users FOR EACH ROW EXECUTE FUNCTION create_default_settings();