# Database Setup Instructions

## Problem Explained

**Why users appear in Authentication but not in Table Editor:**

Supabase has TWO separate systems:

1. **Authentication (auth.users)** - Stores login credentials (email/password)
   - This is managed by Supabase Auth
   - You see users here when they sign up
   - This is CORRECT and necessary

2. **Table Editor (public.users)** - Stores your application data
   - This is YOUR database tables
   - You need to see users here to track their sessions, settings, etc.
   - This was MISSING the automatic creation trigger

## Solution

We've created a database trigger that automatically creates a row in `public.users` whenever someone signs up in Supabase Auth.

---

## Step-by-Step Setup

### Step 1: Run the Complete Migration

1. Open your Supabase Dashboard
2. Go to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy the ENTIRE contents of `COMPLETE_MIGRATION.sql`
5. Paste it into the SQL Editor
6. Click **Run** (or press Cmd/Ctrl + Enter)

### Step 2: Verify the Migration

After running the migration, verify it worked:

1. Go to **Table Editor** (left sidebar)
2. Click on the **users** table
3. You should now see rows for all existing auth users

If you don't see any users yet, that's okay - they'll be created automatically when someone signs up.

### Step 3: Test with Existing Users

If you already have users in Authentication:

1. Go to **SQL Editor**
2. Run this query to check if users were backfilled:

```sql
SELECT u.user_id, u.name, u.email, u.created_at 
FROM users u 
ORDER BY u.created_at DESC;
```

You should see all your existing users.

### Step 4: Test New Signup

1. Create a new test account through your signup page
2. After signup, go to **Table Editor > users**
3. You should immediately see the new user row
4. Also check **Table Editor > user_settings** - should be auto-created too

---

## What This Migration Does

### 1. Creates Missing Tables
- `domain_stats` - Tracks time spent on each website

### 2. Fixes Column Names
- Renames `total_focus_time` to `total_focus_minutes` for consistency
- Adds missing columns

### 3. Disables Email Verification (Testing Only)
- Users can login immediately without confirming email
- **IMPORTANT:** Re-enable before production deployment

### 4. Auto-Creates User Rows
- **NEW:** Trigger that creates `public.users` row when someone signs up
- **NEW:** Backfills existing auth users into `public.users` table
- **NEW:** Auto-creates `user_settings` row via existing trigger

---

## Verification Checklist

After running the migration, verify:

- [ ] Users table has rows (Table Editor > users)
- [ ] User_settings table has rows (Table Editor > user_settings)
- [ ] Domain_stats table exists (Table Editor > domain_stats)
- [ ] Email confirmation is disabled (Authentication > Settings > Email Auth)
- [ ] New signups automatically create user rows

---

## Troubleshooting

### Users still not appearing in Table Editor

1. Check if migration ran successfully:
```sql
SELECT * FROM users LIMIT 5;
```

2. Check if trigger exists:
```sql
SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

3. Manually create a user row (replace with your auth user ID):
```sql
INSERT INTO users (user_id, name, email, timezone, role, is_active)
SELECT id, 
       COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)),
       email,
       'UTC',
       'user',
       true
FROM auth.users
WHERE id = 'YOUR_USER_ID_HERE'
ON CONFLICT (user_id) DO NOTHING;
```

### Sessions not appearing

1. Check if user exists in users table first
2. Verify extension is logged in (check chrome.storage.local)
3. Check browser console for sync errors
4. Verify SUPABASE_SERVICE_ROLE_KEY is set in frontend/.env.local

---

## Next Steps After Migration

1. **Test the full flow:**
   - Sign up a new user
   - Verify user appears in Table Editor
   - Start a session from extension
   - Verify session appears in focus_sessions table

2. **Check data is syncing:**
   - Open extension popup
   - Start a focus session
   - Switch tabs to different websites
   - Stop the session
   - Check Table Editor > focus_sessions
   - Check Table Editor > tab_events

3. **Verify dashboard displays data:**
   - Login to dashboard
   - Check overview page shows your score
   - Check focus page shows active session
   - Check history page shows completed sessions

---

## Important Notes

- **Email verification is DISABLED** - This is for testing only
- **Re-enable email verification before production** - See DISABLE_EMAIL_VERIFICATION.md
- **Service role key needed** - Add to frontend/.env.local from Supabase dashboard
- **RLS policies are active** - Users can only see their own data

---

## Files Reference

- `COMPLETE_MIGRATION.sql` - Run this in Supabase SQL Editor
- `backend/supabase/migrations/004_auto_create_user_on_signup.sql` - The new trigger migration
- `DISABLE_EMAIL_VERIFICATION.md` - Instructions for email settings
- `TESTING_GUIDE.md` - Full testing instructions
