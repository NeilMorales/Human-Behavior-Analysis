-- Drop and recreate website_visits table with correct schema
DROP TABLE IF EXISTS website_visits CASCADE;

CREATE TABLE website_visits (
    visit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES focus_sessions(session_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    classification TEXT CHECK (classification IN ('productive', 'neutral', 'distracting')),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_seconds INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (session_id, domain, start_time)
);

CREATE INDEX idx_website_visits_session ON website_visits(session_id);
CREATE INDEX idx_website_visits_user ON website_visits(user_id, created_at DESC);
CREATE INDEX idx_website_visits_domain ON website_visits(domain);

ALTER TABLE website_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_visits" ON website_visits
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "admin_read_all_visits" ON website_visits
    FOR SELECT USING (
        EXISTS (
            SELECT 1
            FROM users
            WHERE user_id = auth.uid()
                AND role = 'admin'
        )
    );

-- Verify it worked
SELECT 
    column_name, 
    data_type
FROM information_schema.columns
WHERE table_name = 'website_visits'
    AND column_name = 'session_id';
