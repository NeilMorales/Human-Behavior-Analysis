-- ============================================================
-- BehaviorIQ - Complete Database Migration
-- Run this entire script in Supabase SQL Editor
-- ============================================================

-- PART 1: Fix schema issues and add missing tables
-- ============================================================

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
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'domain_stats' AND policyname = 'users_own_data'
    ) THEN
        CREATE POLICY "users_own_data" ON domain_stats
            FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'domain_stats' AND policyname = 'admin_read_all'
    ) THEN
        CREATE POLICY "admin_read_all" ON domain_stats
            FOR SELECT USING (
                EXISTS (
                    SELECT 1
                    FROM users
                    WHERE user_id = auth.uid()
                        AND role = 'admin'
                )
            );
    END IF;
END $$;

-- 2. Fix column name inconsistencies in daily_summaries
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

-- Add total_idle_minutes if it doesn't exist
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

-- 3. Ensure tab_events has all required columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'tab_events'
        AND column_name = 'timestamp_ms'
    ) THEN
        ALTER TABLE tab_events ADD COLUMN timestamp_ms BIGINT;
        UPDATE tab_events SET timestamp_ms = EXTRACT(EPOCH FROM created_at) * 1000;
        ALTER TABLE tab_events ALTER COLUMN timestamp_ms SET NOT NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'tab_events'
        AND column_name = 'date'
    ) THEN
        ALTER TABLE tab_events ADD COLUMN date DATE;
        UPDATE tab_events SET date = DATE(created_at);
        ALTER TABLE tab_events ALTER COLUMN date SET NOT NULL;
    END IF;
END $$;

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

-- PART 2: Helper function for email confirmation check
-- ============================================================

CREATE OR REPLACE FUNCTION is_user_confirmed(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_confirmed BOOLEAN;
BEGIN
    SELECT 
        CASE 
            WHEN email_confirmed_at IS NOT NULL THEN TRUE
            ELSE FALSE
        END INTO user_confirmed
    FROM auth.users
    WHERE email = user_email;
    
    RETURN COALESCE(user_confirmed, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_user_confirmed(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_confirmed(TEXT) TO anon;

-- ============================================================
-- VERIFICATION QUERIES
-- Run these to verify the migration worked
-- ============================================================

-- Check if domain_stats table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'domain_stats'
) AS domain_stats_exists;

-- Check if column names are fixed
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'daily_summaries' 
AND column_name IN ('total_focus_minutes', 'total_idle_minutes');

-- Check if tab_events has required columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'tab_events' 
AND column_name IN ('timestamp_ms', 'date', 'timestamp');

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('domain_stats', 'daily_summaries', 'tab_events', 'focus_sessions', 'users');

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migration completed successfully!';
    RAISE NOTICE '📋 Next steps:';
    RAISE NOTICE '1. Disable email confirmation in Authentication → Settings';
    RAISE NOTICE '2. Add service role key to frontend/.env.local';
    RAISE NOTICE '3. Test signup and session flow';
END $$;


-- ============================================================
-- PART 4: AUTO-CREATE USER ROW ON AUTH SIGNUP
-- ============================================================
-- This trigger automatically creates a row in the public.users table
-- whenever a new user signs up via Supabase Auth

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (user_id, name, email, timezone, role, is_active)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'timezone', 'UTC'),
        'user',
        true
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users table
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ADD POLICIES FOR USERS TABLE
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE policyname = 'users_read_own'
        AND tablename = 'users'
    ) THEN
        CREATE POLICY "users_read_own" ON users
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE policyname = 'users_update_own'
        AND tablename = 'users'
    ) THEN
        CREATE POLICY "users_update_own" ON users
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;

-- ============================================================
-- BACKFILL: Create user rows for existing auth users
-- ============================================================
-- This will create user rows for any auth users that don't have a corresponding row
INSERT INTO public.users (user_id, name, email, timezone, role, is_active)
SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
    au.email,
    COALESCE(au.raw_user_meta_data->>'timezone', 'UTC'),
    'user',
    true
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.user_id = au.id
)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================
-- Run these queries to verify everything is working:

-- 1. Check that all auth users have corresponding user rows (should return 0)
-- SELECT COUNT(*) as missing_users
-- FROM auth.users au 
-- LEFT JOIN public.users u ON u.user_id = au.id 
-- WHERE u.user_id IS NULL;

-- 2. Check email confirmation is disabled
-- SELECT * FROM auth.config WHERE name = 'MAILER_AUTOCONFIRM';

-- 3. View all users in the users table
-- SELECT user_id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
-- Next steps:
-- 1. Verify users appear in Table Editor > users table
-- 2. Test signup flow - new users should automatically appear in users table
-- 3. Test session creation from extension
-- 4. Check that sessions appear in focus_sessions table


-- ============================================================
-- PART 5: ADD WEBSITE VISITS TABLE
-- ============================================================
-- This table tracks website visits per session with time spent

CREATE TABLE IF NOT EXISTS website_visits (
    visit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    classification TEXT CHECK (classification IN ('productive', 'neutral', 'distracting')),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_seconds INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (session_id, domain, start_time)
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_website_visits_session ON website_visits(session_id);
CREATE INDEX IF NOT EXISTS idx_website_visits_user ON website_visits(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_website_visits_domain ON website_visits(domain);

-- Enable RLS
ALTER TABLE website_visits ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only access their own data
DO $
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE policyname = 'users_own_visits'
        AND tablename = 'website_visits'
    ) THEN
        CREATE POLICY "users_own_visits" ON website_visits
            FOR ALL USING (auth.uid() = user_id);
    END IF;
END $;

-- Admin policy: admins can read all data
DO $
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE policyname = 'admin_read_all_visits'
        AND tablename = 'website_visits'
    ) THEN
        CREATE POLICY "admin_read_all_visits" ON website_visits
            FOR SELECT USING (
                EXISTS (
                    SELECT 1
                    FROM users
                    WHERE user_id = auth.uid()
                        AND role = 'admin'
                )
            );
    END IF;
END $;

-- ============================================================
-- VERIFICATION: Check website_visits table
-- ============================================================
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'website_visits'
) AS website_visits_exists;

SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'website_visits';
