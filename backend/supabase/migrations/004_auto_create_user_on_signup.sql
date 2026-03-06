-- ============================================================
-- AUTO-CREATE USER ROW ON AUTH SIGNUP
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
-- ADD POLICY FOR USERS TABLE
-- ============================================================
-- Allow users to read their own data
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
-- VERIFY: Check that all auth users have corresponding user rows
-- ============================================================
-- This query should return 0 rows if everything is working correctly
-- You can run this manually to verify:
-- SELECT au.id, au.email 
-- FROM auth.users au 
-- LEFT JOIN public.users u ON u.user_id = au.id 
-- WHERE u.user_id IS NULL;
