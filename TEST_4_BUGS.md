# Test Guide - Verify 4 Bug Fixes

## Prerequisites
- ✅ Database migration completed (website_visits table created)
- ✅ Extension built successfully
- ⏳ Extension needs to be reloaded in Chrome
- ⏳ Frontend needs to be running

---

## Setup Steps

### 1. Reload Extension
```
1. Open Chrome
2. Go to chrome://extensions
3. Find "BehaviorIQ" extension
4. Click the reload button 🔄
```

### 2. Start Frontend (if not running)
```bash
cd frontend
npm run dev
```

Wait for: `✓ Ready in X ms`

---

## Bug 1: SSO Redirect Loop ✅

**What was broken:** After SSO login, navigating to any dashboard page redirected back to login

**Test Steps:**
1. Open extension popup
2. If not logged in, login with your credentials
3. Click "View Dashboard" button
4. ✅ Should redirect to dashboard (not login page)
5. Click "Focus Session" in sidebar
6. ✅ Should stay on Focus page (not redirect to login)
7. Click "History" in sidebar
8. ✅ Should stay on History page (not redirect to login)
9. Click "Settings" in sidebar
10. ✅ Should stay on Settings page (not redirect to login)

**Expected Result:** No redirects to login page after initial SSO authentication

**If it fails:** Check browser console for errors, check that cookies are being set

---

## Bug 2: No Session Data in Dashboard ✅

**What was broken:** Sessions started from extension didn't appear in dashboard

**Test Steps:**
1. Open extension popup
2. Click "Start Session" (or similar button)
3. Fill in:
   - Task name: "Test Session"
   - Category: "Coding"
   - Duration: 5 minutes
4. Click Start
5. ✅ Session should start in popup (timer counting down)
6. Open dashboard in browser (or refresh if already open)
7. Go to "Overview" page
8. ✅ Should see active session with live timer
9. Go to "Focus Session" page
10. ✅ Should see active session details
11. Wait 30 seconds, then stop the session in extension
12. Go to "History" page in dashboard
13. ✅ Should see completed session with correct duration (not 0m)

**Expected Result:** Session appears in dashboard immediately, shows correct duration

**If it fails:** 
- Check browser console for sync errors
- Check extension console (chrome://extensions → Details → Inspect views: service worker)
- Verify session exists in Supabase (Table Editor → focus_sessions)

---

## Bug 3: Website Tracking Not Recording ✅

**What was broken:** Extension didn't track which websites you visited during sessions

**Test Steps:**
1. Start a new session in extension (5 minutes)
2. Visit these websites in order (spend ~30 seconds on each):
   - google.com
   - github.com
   - stackoverflow.com
   - youtube.com
3. Switch between tabs a few times
4. Stop the session
5. Open dashboard → History page
6. Click on the session you just completed
7. ✅ Should see list of websites visited
8. ✅ Each website should show time spent (e.g., "google.com: 30s")
9. ✅ Websites should be color-coded by classification:
   - Green = Productive (github, stackoverflow)
   - Yellow = Neutral (google)
   - Red = Distracting (youtube)

**Expected Result:** All visited websites appear with accurate time tracking

**If it fails:**
- Check extension console for tracking errors
- Verify website_visits table has data (Supabase → Table Editor → website_visits)
- Check that tabTracker is running (extension console should show tab_focus/tab_blur events)

---

## Bug 4: Supabase Connection Timeout ✅

**What was broken:** Intermittent connection timeouts when accessing dashboard

**Test Steps:**
1. Open dashboard
2. Navigate between pages quickly:
   - Overview → Focus → History → Settings → Overview
3. Refresh the page multiple times (Cmd+R / Ctrl+R)
4. ✅ Pages should load without timeout errors
5. Open browser console (F12)
6. ✅ Should NOT see "Connect Timeout Error" messages
7. ✅ Should NOT see "fetch failed" errors
8. Check Network tab in DevTools
9. ✅ API calls should complete in < 5 seconds

**Expected Result:** No timeout errors, all pages load smoothly

**If it fails:**
- Check if Supabase project is active (not paused)
- Verify network connection is stable
- Check browser console for specific error messages

---

## Summary Checklist

After testing all 4 bugs:

- [ ] Bug 1: SSO works, no redirect loops
- [ ] Bug 2: Sessions sync to dashboard with correct duration
- [ ] Bug 3: Website tracking shows visited domains with time
- [ ] Bug 4: No timeout errors, pages load quickly

---

## If All Tests Pass ✅

Great! All 4 critical bugs are fixed. 

**Next:** Phase 3 will automatically start - Design improvements with Google Stitch

---

## If Any Test Fails ❌

1. Note which test failed
2. Copy any error messages from console
3. Check the specific file mentioned in the test
4. Report the issue with:
   - Which bug test failed
   - Error message (if any)
   - What you expected vs what happened

---

## Ready to Test?

1. Reload extension in Chrome
2. Start frontend: `cd frontend && npm run dev`
3. Follow the test steps above
4. Report results or proceed to Phase 3 if all pass!
