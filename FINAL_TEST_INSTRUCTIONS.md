# Final Test Instructions - The Real Fix

## What Was Wrong

The extension had **NO WAY TO LOGIN**. Sessions were stored locally but never synced to the database because there were no auth tokens.

## What I Fixed

Added a login form to the extension popup. Now users must login before using the extension, which gives it auth tokens to sync data.

---

## Testing Steps

### 1. Rebuild Extension

```bash
cd extension
npm run build
```

### 2. Reload Extension in Chrome

1. Go to `chrome://extensions/`
2. Find "BehaviorIQ" extension
3. Click the reload icon (circular arrow)

### 3. Open Extension Popup

1. Click the extension icon in Chrome toolbar
2. **You should now see a LOGIN FORM** (not the timer)

### 4. Login or Signup

**Option A: Login with existing account**
- Enter your email and password
- Click "Login"

**Option B: Create new account**
- Click "Don't have an account? Sign Up"
- Enter name, email, password
- Click "Sign Up"

### 5. Verify Login Success

After login, you should see:
- Your behavior score ring
- Today's stats (productive time, sessions, etc.)
- "New Focus Session" form at the bottom

### 6. Start a Session

1. Enter task name (e.g., "Testing the real fix")
2. Select category (e.g., "Coding")
3. Set duration (e.g., 25 minutes)
4. Click "Start Focus Session"

### 7. Verify Extension Timer

The popup should now show:
- "● IN PROGRESS" indicator
- Your task name
- Countdown timer (e.g., 24:59, 24:58...)
- Pause and Stop buttons

### 8. Check Dashboard - Overview Page

1. Open `http://localhost:3000/dashboard`
2. Login if not already logged in (same credentials)
3. **You should see:**
   - Active session banner at the top
   - Same task name
   - Same countdown timer
   - Timer should match the extension popup

### 9. Check Dashboard - Focus Page

1. Go to `http://localhost:3000/dashboard/focus`
2. **You should see:**
   - "● IN PROGRESS" indicator
   - Same task name
   - Same countdown timer
   - Stop button

### 10. Verify 3-Way Sync

Open all 3 at once:
- Extension popup
- Overview page
- Focus page

**All 3 should show the SAME countdown timer!**

Watch for 10-15 seconds - all timers should decrease together (with ~5 second delay for dashboard pages due to polling).

### 11. Check Database

1. Go to Supabase Dashboard
2. Table Editor → `focus_sessions`
3. **You should see:**
   - A row with your session
   - `status = 'in_progress'`
   - Your task name
   - Your user_id

4. Table Editor → `tab_events`
5. **You should see:**
   - Events being recorded as you switch tabs
   - Each event has `focus_session_id` matching your session

### 12. Stop Session

1. Click "Stop" in the extension popup (or dashboard)
2. **Verify:**
   - Timer disappears from all 3 places
   - Session no longer shows as active
   - Database shows `status = 'completed'`

---

## Success Criteria

✅ Extension shows login form on first open
✅ Can login/signup from extension
✅ After login, can start sessions
✅ Extension popup shows countdown timer
✅ Dashboard overview shows active session banner
✅ Dashboard focus page shows countdown timer
✅ All 3 timers are synced (same countdown)
✅ Session appears in Supabase focus_sessions table
✅ Tab events appear in Supabase tab_events table
✅ Stopping session updates all 3 places

---

## Troubleshooting

### "Login failed" error

**Check:**
1. Is the dashboard running? (`cd frontend && npm run dev`)
2. Is the URL correct in `extension/src/shared/constants.ts`?
3. Do you have the correct credentials?

**Fix:**
- Make sure dashboard is running at `http://localhost:3000`
- Check browser console (F12) for error details

### Login succeeds but timer doesn't sync

**Check:**
1. Open browser console (F12)
2. Look for sync errors
3. Check Network tab - should see requests to `/api/sessions`

**Fix:**
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set in `frontend/.env.local`
- Check Supabase logs for errors

### Dashboard doesn't show active session

**Check:**
1. Are you logged in on the dashboard?
2. Is it the SAME account as the extension?
3. Check Network tab - should see `/api/sessions/active` polling

**Fix:**
- Login to dashboard with same credentials as extension
- Check browser console for errors

### Extension popup is blank

**Check:**
1. Did you rebuild after changes? (`npm run build`)
2. Did you reload the extension in chrome://extensions/?

**Fix:**
- Rebuild: `cd extension && npm run build`
- Reload extension in Chrome

---

## What To Expect

### First 5 seconds after starting session:
- Extension: Timer starts immediately
- Dashboard: Shows "Loading..." or old state
- Database: Session being inserted

### After 5 seconds:
- Extension: Timer counting down
- Dashboard: Active session appears (first poll completes)
- Database: Session visible with status 'in_progress'

### Every 5 seconds:
- Dashboard polls `/api/sessions/active`
- Gets latest session data
- Updates timer

### When you stop:
- Extension: Sends STOP_SESSION message
- Background: Updates session, syncs to database
- Dashboard: Next poll (within 5 seconds) shows no active session

---

## Next Phase

Once this is working:

**Phase 3: Display Visited Websites**
- Show list of domains visited during session
- Display time spent per domain
- Show classification colors

**Phase 4: Google Stitch Design**
- Redesign popup with Stitch MCP
- Redesign dashboard pages
- Make UI more interactive

**Phase 5: Production Ready**
- Re-enable email verification
- Add session pause/resume
- Add manual editing
- Deploy to production

---

## Important Notes

- **Email verification is disabled** - For testing only
- **Service role key needed** - Must be in frontend/.env.local
- **Same account required** - Extension and dashboard must use same login
- **5-second polling** - Dashboard updates every 5 seconds, not real-time

---

## If It Still Doesn't Work

1. **Clear extension storage:**
   - Open DevTools (F12) on extension popup
   - Application tab → Storage → Local Storage
   - Right-click → Clear
   - Reload extension

2. **Check all services are running:**
   - Dashboard: `cd frontend && npm run dev`
   - Supabase: Check dashboard is accessible
   - Extension: Loaded in chrome://extensions/

3. **Read the logs:**
   - Browser console (F12)
   - Network tab
   - Supabase logs

4. **Share the error:**
   - Screenshot of console errors
   - Network request details
   - Supabase table contents
