# BehaviorIQ - Testing Guide

**Quick guide to test all the fixes we just applied**

---

## STEP 1: Apply Database Migration

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Click **New Query**
5. Copy the entire contents of `backend/supabase/migrations/002_fix_schema.sql`
6. Paste and click **Run**
7. Verify: "Success. No rows returned"

---

## STEP 2: Add Service Role Key

1. In Supabase dashboard, go to **Settings** → **API**
2. Find "service_role" key (NOT the anon key)
3. Click **Reveal** and copy it
4. Open `frontend/.env.local`
5. Replace `YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE` with your key
6. Save the file

---

## STEP 3: Build Extension

```bash
cd extension
npm install  # if not done already
npm run build
```

Expected output: `dist/` folder created

---

## STEP 4: Load Extension in Chrome

1. Open Chrome
2. Go to `chrome://extensions`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked**
5. Select the `extension/dist` folder
6. Extension should appear with BehaviorIQ icon

---

## STEP 5: Start Dashboard

```bash
cd frontend
npm install  # if not done already
npm run dev
```

Dashboard should open at: http://localhost:3000

---

## STEP 6: Test Signup Flow

1. Go to http://localhost:3000
2. Click **Get Started** or **Sign Up**
3. Fill in:
   - Name: Test User
   - Email: test@example.com
   - Password: password123
4. Click **Create Account**
5. Should redirect to dashboard

**Verify in Supabase:**
- Go to **Table Editor** → **users**
- Should see your new user
- Go to **user_settings**
- Should see settings row for your user

---

## STEP 7: Test Extension Popup

1. Click the BehaviorIQ extension icon in Chrome toolbar
2. Popup should open (320x420px)
3. Should show:
   - Today's Score (0 for new user)
   - Stats (all 0)
   - "New Focus Session" form

---

## STEP 8: Test Session Start

1. In popup, enter task name: "Test Session"
2. Select category: "Coding"
3. Set duration: 5 minutes
4. Click **Start Focus Session**
5. Should see:
   - "● IN PROGRESS" indicator
   - Task name displayed
   - Timer counting down (5:00, 4:59, 4:58...)
   - Stop button

---

## STEP 9: Test Session Persistence

1. With session running, switch to another tab
2. Come back and click extension icon again
3. Session should still be running
4. Timer should show correct remaining time

**This was the main bug - it should work now!**

---

## STEP 10: Test Session Stop

1. Click **■ Stop** button in popup
2. Should return to "New Focus Session" form
3. Session should be saved

**Verify in Supabase:**
- Go to **Table Editor** → **focus_sessions**
- Should see your completed session
- Check: task_name, status, actual_duration

---

## STEP 11: Test Dashboard Display

1. Go to dashboard (http://localhost:3000/dashboard)
2. Should see:
   - Your behavior score
   - Session count: 1
   - Focus time: ~5 minutes
   - Charts (may be empty for first session)

---

## STEP 12: Test Tab Tracking

1. Start a new session in popup
2. Visit different websites:
   - github.com (productive)
   - youtube.com (distracting)
   - google.com (neutral)
3. Spend 30 seconds on each
4. Stop the session

**Verify in Supabase:**
- Go to **Table Editor** → **tab_events**
- Should see events for each site visited
- Check: domain, classification, focus_session_id

---

## TROUBLESHOOTING

### Extension doesn't load
- Check console for errors: Right-click extension → Inspect popup
- Rebuild: `npm run build` in extension folder
- Reload extension in chrome://extensions

### Popup buttons don't work
- Open console: Right-click extension → Inspect popup
- Check for errors
- Verify message listener is registered

### Sessions not in database
- Check browser console for sync errors
- Verify you're logged in (check chrome.storage.local)
- Check Supabase logs for errors

### Database errors
- Verify migration ran successfully
- Check RLS policies are enabled
- Verify service role key is correct

---

## SUCCESS CRITERIA

✅ All tests pass if:
1. Can sign up and see user in Supabase
2. Can start session from popup
3. Session persists when switching tabs
4. Can stop session
5. Session appears in Supabase
6. Tab events are tracked
7. Dashboard shows session data

---

## NEXT: Make It Beautiful!

Once all tests pass, we'll use **Google Stitch** to redesign:
1. Extension popup (modern, animated)
2. Dashboard pages (interactive, engaging)
3. Focus timer (beautiful countdown)
4. Charts (smooth animations)

Ready to test? Let me know the results! 🚀
