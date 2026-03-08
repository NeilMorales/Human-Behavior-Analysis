-- ============================================================
-- Add website_visits table for tracking website visits per session
-- ============================================================

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
-- VERIFICATION
-- ============================================================
-- Check if table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'website_visits'
) AS website_visits_exists;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'website_visits';
