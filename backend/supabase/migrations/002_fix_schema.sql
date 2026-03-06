-- Fix schema issues and add missing tables

-- 1. Add domain_stats table (missing from initial schema)
CREATE TABLE IF NOT EXISTS domain_stats (
    stat_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    classification TEXT CHECK (classification IN ('productive', 'neutral', 'distracting')),
    total_seconds INTEGER NOT NULL DEFAULT 0,
    visit_count INTEGER NOT NULL DEFAULT 0,
    date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, domain, date)
);

CREATE INDEX IF NOT EXISTS idx_domain_stats_user_date ON domain_stats(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_domain_stats_domain ON domain_stats(user_id, domain);

-- Enable RLS
ALTER TABLE domain_stats ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "users_own_data" ON domain_stats
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "admin_read_all" ON domain_stats
    FOR SELECT USING (
        EXISTS (
            SELECT 1
            FROM users
            WHERE user_id = auth.uid()
                AND role = 'admin'
        )
    );

-- 2. Fix column name inconsistencies in daily_summaries
-- Rename total_focus_time to total_focus_minutes for consistency
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'daily_summaries'
        AND column_name = 'total_focus_time'
    ) THEN
        ALTER TABLE daily_summaries RENAME COLUMN total_focus_time TO total_focus_minutes;
    END IF;
END $$;

-- Add total_idle_minutes if it doesn't exist (currently idle_time in seconds)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'daily_summaries'
        AND column_name = 'total_idle_minutes'
    ) THEN
        ALTER TABLE daily_summaries ADD COLUMN total_idle_minutes INTEGER NOT NULL DEFAULT 0;
        -- Convert existing idle_time (seconds) to minutes
        UPDATE daily_summaries SET total_idle_minutes = ROUND(idle_time / 60.0);
    END IF;
END $$;

-- 3. Add missing columns to tab_events if needed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'tab_events'
        AND column_name = 'timestamp_ms'
    ) THEN
        ALTER TABLE tab_events ADD COLUMN timestamp_ms BIGINT;
        -- Convert existing timestamp to milliseconds
        UPDATE tab_events SET timestamp_ms = EXTRACT(EPOCH FROM created_at) * 1000;
        ALTER TABLE tab_events ALTER COLUMN timestamp_ms SET NOT NULL;
    END IF;
END $$;

-- 4. Add date column to tab_events if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'tab_events'
        AND column_name = 'date'
    ) THEN
        ALTER TABLE tab_events ADD COLUMN date DATE;
        -- Set date from created_at
        UPDATE tab_events SET date = DATE(created_at);
        ALTER TABLE tab_events ALTER COLUMN date SET NOT NULL;
    END IF;
END $$;

-- 5. Add session_id column to focus_sessions if using different name
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'focus_sessions'
        AND column_name = 'session_id'
    ) AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'focus_sessions'
        AND column_name = 'id'
    ) THEN
        ALTER TABLE focus_sessions RENAME COLUMN id TO session_id;
    END IF;
END $$;

-- 6. Ensure timestamp column exists in tab_events
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'tab_events'
        AND column_name = 'timestamp'
    ) THEN
        ALTER TABLE tab_events ADD COLUMN timestamp TIMESTAMPTZ;
        UPDATE tab_events SET timestamp = created_at;
        ALTER TABLE tab_events ALTER COLUMN timestamp SET NOT NULL;
    END IF;
END $$;
