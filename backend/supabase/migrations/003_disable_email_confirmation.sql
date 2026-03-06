-- Disable email confirmation for testing phase
-- WARNING: Re-enable before production deployment!

-- This migration disables email confirmation in Supabase Auth
-- Users can sign up and login immediately without email verification

-- Note: This is done through Supabase Dashboard settings, not SQL
-- But we'll document the steps here for reference

/*
MANUAL STEPS TO DISABLE EMAIL CONFIRMATION:

1. Go to Supabase Dashboard
2. Select your project
3. Go to Authentication → Settings
4. Scroll to "Email Auth"
5. UNCHECK "Enable email confirmations"
6. Click Save

This allows users to:
- Sign up without email verification
- Login immediately after signup
- Test the full flow without checking email

IMPORTANT: Re-enable before production!
*/

-- However, we can add a helper function to check if a user is confirmed
-- This will be useful when we re-enable email confirmation

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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_user_confirmed(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_confirmed(TEXT) TO anon;
