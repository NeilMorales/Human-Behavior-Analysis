# BehaviorIQ - Complete Fix & Implementation Checklist

**Created:** March 5, 2026  
**Status:** Action Plan for Production-Ready System  
**Priority:** Critical Issues → Core Features → Enhancements

---

## USER-REPORTED ISSUES (Verified & Prioritized)

### 🔴 CRITICAL - Blocking All Functionality

#### Issue 1: Session Start Button Not Functional
**Problem:** Popup button doesn't start sessions  
**Root Cause:** No message listener in background script  
**Impact:** Core feature completely broken  
**Status:** ❌ BROKEN

#### Issue 2: Session Timer Not Working
**Problem:** Timer doesn't count down properly  
**Root Cause:** Timer logic incomplete, no sync mechanism  
**Impact:** Users can't track focus time  
**Status:** ❌ BROKEN

#### Issue 3: Popup Not Connected to Extension/Dashboard
**Problem:** Popup operates in isolation  
**Root Cause:** No message passing, no API integration  
**Impact:** Data doesn't flow between components  
**Status:** ❌ BROKEN

#### Issue 4: Session Closes When Switching Tabs
**Problem:** Session ends immediately on tab switch  
**Root Cause:** Session state not persisted, logic error  
**Impact:** Sessions unusable  
**Status:** ❌ BROKEN

#### Issue 5: No Session History
**Problem:** Started sessions disappear  
**Root Cause:** Not saved to storage or database  
**Impact:** No data persistence  
**Status:** ❌ BROKEN

#### Issue 6: Empty Supabase Tables
**Problem:** No data in database despite user actions  
**Root Cause:** Sync not working, API not inserting data  
**Impact:** Complete data loss  
**Status:** ❌ BROKEN

#### Issue 7: Login Data Not Visible
**Problem:** User profiles not created in Supabase  
**Root Cause:** Signup flow incomplete, trigger not working  
**Impact:** Users can't be tracked  
**Status:** ❌ BROKEN

---

## NEW REQUIREMENTS FROM USER

### Real-Time Session Sync (3-Way)
- [ ] Session visible on Focus page
- [ ] Session visible on Overview page
- [ ] Session visible in Popup
- [ ] All 3 show exact same time (live sync)
- [ ] Auto-update every second

### Website Tracking During Sessions
- [ ] Track all websites visited during session
- [ ] Store domain + time spent + classification
- [ ] Display in session details
- [ ] Calculate productivity based on visited sites

### Productivity Formula Enhancement
- [ ] Factor 1: Time on productive sites
- [ ] Factor 2: Time on distracting sites
- [ ] Factor 3: Session completion
- [ ] Factor 4: Idle time
- [ ] Factor 5: Tab switches (context switching)
- [ ] Factor 6: User manual input (self-rating)

### User Control Features
- [ ] Manual record input (add past sessions)
- [ ] Edit existing session records
- [ ] Edit website classifications (productive/unproductive)
- [ ] Visual indicator beside each website URL
- [ ] Bulk classification editor

### Deployment & Access
- [ ] Easy website access (custom domain)
- [ ] Extension auto-login sync
- [ ] One-click extension installation
- [ ] Automatic account linking
- [ ] Cross-device sync

---

## MASTER CHECKLIST - ORGANIZED BY PHASE

## PHASE 1: CRITICAL FIXES (Week 1) - Make It Work

### 1.1 Fix Message Passing System
- [ ] Add `chrome.runtime.onMessage` listener in background/index.ts
- [ ] Handle START_SESSION message
- [ ] Handle STOP_SESSION message
- [ ] Handle GET_ACTIVE_SESSION message
- [ ] Handle UPDATE_SESSION message
- [ ] Test popup → background communication
- [ ] Add error handling for failed messages

**Files to modify:**
- `extension/src/background/index.ts`
- `extension/src/popup/components/StartSession.tsx`
- `extension/src/popup/components/SessionTimer.tsx`

**Estimated Time:** 3-4 hours

---

### 1.2 Fix Session Persistence
- [ ] Save session to chrome.storage.local immediately on start
- [ ] Load session from storage on popup open
- [ ] Persist session across tab switches
- [ ] Persist session across browser restarts
- [ ] Add session recovery on extension reload
- [ ] Test session survives service worker death

**Files to modify:**
- `extension/src/background/sessionManager.ts`
- `extension/src/shared/storage.ts`

**Estimated Time:** 2-3 hours

---

### 1.3 Fix Database Connection & User Creation
- [ ] Verify Supabase connection in dashboard
- [ ] Fix signup flow to create user in `users` table
- [ ] Verify trigger creates `user_settings` row
- [ ] Test login creates session
- [ ] Verify RLS policies allow user data access
- [ ] Add error logging for failed DB operations

**Files to modify:**
- `frontend/app/api/auth/signup/route.ts`
- `backend/supabase/migrations/001_initial_schema.sql` (verify trigger)

**Estimated Time:** 2-3 hours

---

### 1.4 Fix Sync Pipeline (Extension → Database)
- [ ] Verify extension sends events to /api/sync
- [ ] Fix API route to insert into tab_events
- [ ] Fix API route to insert into focus_sessions
- [ ] Add proper error responses
- [ ] Test end-to-end sync flow
- [ ] Verify data appears in Supabase dashboard

**Files to modify:**
- `extension/src/background/syncManager.ts`
- `frontend/app/api/sync/route.ts`
- `frontend/app/api/sessions/route.ts`

**Estimated Time:** 3-4 hours

---

### 1.5 Fix Database Schema Issues
- [ ] Add missing `domain_stats` table
- [ ] Fix column name: `total_focus_time` → `total_focus_minutes`
- [ ] Fix column name: `total_idle_minutes` vs `idle_time`
- [ ] Update all API queries to match schema
- [ ] Run migration to update existing database
- [ ] Verify all queries work

**Files to modify:**
- `backend/supabase/migrations/002_fix_schema.sql` (new file)
- `frontend/app/api/analysis/dashboard/route.ts`

**Estimated Time:** 2 hours

---

### 1.6 Add Service Role Key
- [ ] Get service role key from Supabase dashboard
- [ ] Add to `frontend/.env.local`
- [ ] Add to Vercel environment variables (when deploying)
- [ ] Test admin operations work
- [ ] Document key rotation process

**Files to modify:**
- `frontend/.env.local`

**Estimated Time:** 15 minutes

---

## PHASE 2: CORE FEATURES (Week 2) - Make It Useful

### 2.1 Implement Real-Time Session Sync (3-Way)
- [ ] Create WebSocket or polling mechanism
- [ ] Dashboard polls /api/sessions/active every 5 seconds
- [ ] Popup reads from chrome.storage.local every 1 second
- [ ] All 3 locations show same session data
- [ ] All 3 locations show same countdown timer
- [ ] Add loading states during sync
- [ ] Handle sync conflicts gracefully

**New files to create:**
- `frontend/hooks/useActiveSession.ts`
- `frontend/app/api/sessions/active/route.ts`

**Files to modify:**
- `extension/src/popup/PopupApp.tsx`
- `frontend/app/dashboard/page.tsx`
- `frontend/app/dashboard/focus/page.tsx`

**Estimated Time:** 1 day

---

### 2.2 Implement Website Tracking During Sessions
- [ ] Enhance tab_events to include session_id
- [ ] Track domain + timestamp for each tab focus
- [ ] Calculate time spent per domain
- [ ] Store in domain_stats table
- [ ] Link domain_stats to focus_sessions
- [ ] Display visited websites in session details
- [ ] Show time spent per website
- [ ] Show classification per website

**Files to modify:**
- `extension/src/background/tabTracker.ts`
- `frontend/app/api/sync/route.ts`
- Create `frontend/lib/domainStatsBuilder.ts`

**Estimated Time:** 1 day

---

### 2.3 Implement Enhanced Productivity Formula
- [ ] Create new scoring algorithm
- [ ] Factor: Productive time percentage (30%)
- [ ] Factor: Distracting time penalty (20%)
- [ ] Factor: Session completion (20%)
- [ ] Factor: Idle time penalty (10%)
- [ ] Factor: Tab switch penalty (10%)
- [ ] Factor: User self-rating (10%)
- [ ] Update scoreEngine.ts with new formula
- [ ] Test with various scenarios
- [ ] Document formula in UI

**Files to modify:**
- `extension/src/shared/scoreEngine.ts`
- `frontend/lib/scoreEngine.ts`

**Estimated Time:** 4-6 hours

---

### 2.4 Implement Daily Summary Builder
- [ ] Create summaryBuilder.ts
- [ ] Parse event log for given date
- [ ] Calculate total focus time
- [ ] Calculate productive/neutral/distracting time
- [ ] Calculate tab switches
- [ ] Calculate idle time
- [ ] Compute behavior score
- [ ] Upsert to daily_summaries table
- [ ] Call from /api/sync after event insert
- [ ] Test with real data

**New file:**
- `frontend/lib/summaryBuilder.ts`

**Files to modify:**
- `frontend/app/api/sync/route.ts`

**Estimated Time:** 2 days

---

### 2.5 Implement Token Refresh Logic
- [ ] Add refresh token endpoint
- [ ] Implement refresh logic in extension
- [ ] Retry failed requests with new token
- [ ] Handle refresh failure (force re-login)
- [ ] Test token expiry scenario
- [ ] Add token expiry monitoring

**New file:**
- `frontend/app/api/auth/refresh/route.ts`

**Files to modify:**
- `extension/src/background/syncManager.ts`
- `extension/src/shared/api.ts`

**Estimated Time:** 3-4 hours

---

## PHASE 3: USER CONTROL FEATURES (Week 3) - Make It Flexible

### 3.1 Manual Session Input
- [ ] Create "Add Session" form in dashboard
- [ ] Fields: task name, category, date, start time, duration
- [ ] Validate input (no future dates, reasonable duration)
- [ ] Insert into focus_sessions table
- [ ] Trigger summary rebuild for that date
- [ ] Show in history list
- [ ] Add "Manual" badge to distinguish

**New file:**
- `frontend/components/sessions/AddSessionModal.tsx`

**Files to modify:**
- `frontend/app/dashboard/history/page.tsx`

**Estimated Time:** 4-6 hours

---

### 3.2 Edit Existing Sessions
- [ ] Add "Edit" button to each session in history
- [ ] Open modal with pre-filled form
- [ ] Allow editing: task name, category, notes, rating
- [ ] Prevent editing: start time, duration (data integrity)
- [ ] Update database
- [ ] Trigger summary rebuild
- [ ] Show "Edited" indicator

**New file:**
- `frontend/components/sessions/EditSessionModal.tsx`

**Files to modify:**
- `frontend/app/dashboard/history/page.tsx`
- `frontend/app/api/sessions/[id]/route.ts`

**Estimated Time:** 4-6 hours

---

### 3.3 Website Classification Editor
- [ ] Create settings page section for classifications
- [ ] List all known domains from tab_events
- [ ] Show current classification (productive/neutral/distracting)
- [ ] Add dropdown to change classification
- [ ] Save to user_settings.custom_classifications
- [ ] Sync to extension storage
- [ ] Apply retroactively to past events (optional)
- [ ] Add bulk edit feature
- [ ] Add search/filter

**New file:**
- `frontend/components/settings/DomainClassificationEditor.tsx`

**Files to modify:**
- `frontend/app/dashboard/settings/page.tsx`
- `frontend/app/api/settings/route.ts`

**Estimated Time:** 1 day

---

### 3.4 Visual Classification Indicators
- [ ] Add colored badge beside each domain
- [ ] Green = Productive
- [ ] Yellow = Neutral
- [ ] Red = Distracting
- [ ] Show in session details
- [ ] Show in domain stats list
- [ ] Show in top domains chart
- [ ] Add legend explaining colors

**Files to modify:**
- `frontend/app/dashboard/page.tsx`
- `frontend/app/dashboard/history/page.tsx`
- `frontend/components/dashboard/DomainList.tsx` (new)

**Estimated Time:** 3-4 hours

---

## PHASE 4: UI/UX POLISH (Week 4) - Make It Beautiful

### 4.1 Loading States
- [ ] Add spinner to all async operations
- [ ] Add skeleton loaders for charts
- [ ] Add skeleton loaders for lists
- [ ] Add progress indicators for long operations
- [ ] Disable buttons during loading
- [ ] Show "Syncing..." indicator in extension

**Estimated Time:** 1 day

---

### 4.2 Error Handling & Feedback
- [ ] Create toast notification system
- [ ] Show success messages (session started, saved, etc.)
- [ ] Show error messages (sync failed, etc.)
- [ ] Add error boundaries
- [ ] Add 404 page
- [ ] Add 500 error page
- [ ] Log errors to console (dev) or Sentry (prod)

**New files:**
- `frontend/components/ui/toast.tsx`
- `frontend/components/ui/toaster.tsx`
- `frontend/app/error.tsx`
- `frontend/app/not-found.tsx`

**Estimated Time:** 1 day

---

### 4.3 Empty States
- [ ] Add empty state for no sessions
- [ ] Add empty state for no data
- [ ] Add helpful text and CTAs
- [ ] Add illustrations (optional)
- [ ] Add onboarding hints for new users

**Estimated Time:** 4 hours

---

### 4.4 Confirmation Dialogs
- [ ] Add confirmation for delete session
- [ ] Add confirmation for delete account
- [ ] Add confirmation for reset data
- [ ] Add "Are you sure?" modals

**New file:**
- `frontend/components/ui/confirm-dialog.tsx`

**Estimated Time:** 2-3 hours

---

## PHASE 5: DEPLOYMENT & ACCESS (Week 5) - Make It Live

### 5.1 Dashboard Deployment
- [ ] Create Vercel account (if not exists)
- [ ] Connect GitHub repository
- [ ] Configure environment variables
- [ ] Set up custom domain (optional)
- [ ] Deploy to production
- [ ] Test production deployment
- [ ] Set up automatic deployments on push

**Environment Variables Needed:**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

**Estimated Time:** 2-3 hours

---

### 5.2 Extension Production Build
- [ ] Update DASHBOARD_URL to production URL
- [ ] Build extension: `npm run build`
- [ ] Test production build locally
- [ ] Zip dist folder
- [ ] Prepare Chrome Web Store listing
- [ ] Create screenshots
- [ ] Write store description
- [ ] Submit for review

**Files to modify:**
- `extension/src/shared/constants.ts`

**Estimated Time:** 4-6 hours

---

### 5.3 Auto-Login Sync (Extension ↔ Dashboard)
- [ ] Extension checks for auth token on install
- [ ] If no token, show "Login" button in popup
- [ ] Button opens dashboard login page
- [ ] After login, dashboard sends token to extension
- [ ] Extension stores token in chrome.storage.sync
- [ ] Extension starts syncing automatically
- [ ] Test cross-device sync

**Implementation Options:**
1. **OAuth Flow** (recommended)
2. **Magic Link** (email-based)
3. **QR Code** (scan from dashboard)

**Files to modify:**
- `extension/src/popup/PopupApp.tsx`
- `extension/src/options/OptionsApp.tsx`
- `frontend/app/api/auth/extension-token/route.ts` (new)

**Estimated Time:** 1-2 days

---

### 5.4 One-Click Extension Installation
- [ ] Add "Install Extension" button on dashboard
- [ ] Link to Chrome Web Store (after approval)
- [ ] Add installation instructions
- [ ] Add video tutorial (optional)
- [ ] Test installation flow

**Files to modify:**
- `frontend/app/page.tsx`
- `frontend/app/dashboard/page.tsx`

**Estimated Time:** 2 hours

---

## PHASE 6: ADVANCED FEATURES (Week 6+) - Make It Powerful

### 6.1 Anomaly Detection
- [ ] Implement 7 detection rules
- [ ] Generate alerts
- [ ] Display in dashboard
- [ ] Allow dismissing alerts
- [ ] Add alert preferences

**Estimated Time:** 2 days

---

### 6.2 Supabase Edge Functions
- [ ] Create daily-summary cron job
- [ ] Create weekly-digest cron job
- [ ] Deploy to Supabase
- [ ] Test cron execution
- [ ] Monitor logs

**Estimated Time:** 1 day

---

### 6.3 PDF Report Generation
- [ ] Implement @react-pdf/renderer
- [ ] Create report template
- [ ] Add download button
- [ ] Generate on client-side
- [ ] Test with real data

**Estimated Time:** 1-2 days

---

### 6.4 CSV/JSON Export
- [ ] Add export buttons
- [ ] Generate CSV from sessions
- [ ] Generate JSON from all data
- [ ] Trigger download
- [ ] Test with large datasets

**Estimated Time:** 4-6 hours

---

## PHASE 7: SECURITY & MONITORING (Ongoing)

### 7.1 Security Hardening
- [ ] Add input validation (Zod schemas)
- [ ] Add rate limiting
- [ ] Configure CORS properly
- [ ] Add CSRF protection
- [ ] Rotate API keys
- [ ] Audit dependencies
- [ ] Add security headers

**Estimated Time:** 2 days

---

### 7.2 Monitoring & Logging
- [ ] Set up Sentry for error tracking
- [ ] Add Vercel Analytics
- [ ] Set up uptime monitoring
- [ ] Create dashboard for metrics
- [ ] Set up alerts for errors

**Estimated Time:** 1 day

---

### 7.3 Privacy & Compliance
- [ ] Write privacy policy
- [ ] Write terms of service
- [ ] Add cookie consent
- [ ] Add data deletion workflow
- [ ] Document GDPR compliance

**Estimated Time:** 1-2 days

---

## TESTING CHECKLIST

### Manual Testing
- [ ] Test session start/stop in popup
- [ ] Test session visibility in all 3 places
- [ ] Test tab switching during session
- [ ] Test browser restart during session
- [ ] Test sync to database
- [ ] Test login/signup flow
- [ ] Test classification editor
- [ ] Test manual session input
- [ ] Test session editing
- [ ] Test all charts with real data
- [ ] Test on different screen sizes
- [ ] Test in incognito mode
- [ ] Test with slow network
- [ ] Test with no network (offline)

### Automated Testing (Future)
- [ ] Unit tests for scoreEngine
- [ ] Unit tests for summaryBuilder
- [ ] Integration tests for API routes
- [ ] E2E tests for critical flows
- [ ] Performance tests

---

## DOCUMENTATION CHECKLIST

### User Documentation
- [ ] Installation guide
- [ ] Quick start guide
- [ ] Feature overview
- [ ] FAQ
- [ ] Troubleshooting guide
- [ ] Video tutorials

### Developer Documentation
- [ ] README.md for each folder
- [ ] API documentation
- [ ] Database schema documentation
- [ ] Deployment guide
- [ ] Contributing guidelines
- [ ] Code comments

---

## TIMELINE SUMMARY

| Phase | Duration | Priority | Status |
|-------|----------|----------|--------|
| Phase 1: Critical Fixes | Week 1 | 🔴 CRITICAL | Not Started |
| Phase 2: Core Features | Week 2 | 🔴 CRITICAL | Not Started |
| Phase 3: User Control | Week 3 | 🟠 HIGH | Not Started |
| Phase 4: UI/UX Polish | Week 4 | 🟠 HIGH | Not Started |
| Phase 5: Deployment | Week 5 | 🟠 HIGH | Not Started |
| Phase 6: Advanced Features | Week 6+ | 🟡 MEDIUM | Not Started |
| Phase 7: Security & Monitoring | Ongoing | 🟠 HIGH | Not Started |

**Total Estimated Time:** 6-8 weeks for MVP, 10-12 weeks for production-ready

---

## IMMEDIATE NEXT STEPS (Start Today)

### Step 1: Fix Message Passing (2-3 hours)
```typescript
// In extension/src/background/index.ts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    (async () => {
        try {
            if (message.type === 'START_SESSION') {
                const session = await startSession(message.payload);
                sendResponse({ success: true, session });
            } else if (message.type === 'STOP_SESSION') {
                const session = await stopSession(message.payload);
                sendResponse({ success: true, session });
            } else if (message.type === 'GET_ACTIVE_SESSION') {
                const { activeSession } = await readStorage(['activeSession']);
                sendResponse({ success: true, session: activeSession });
            }
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    })();
    return true; // Required for async response
});
```

### Step 2: Fix Database Schema (1 hour)
Create `backend/supabase/migrations/002_fix_schema.sql`

### Step 3: Fix Signup Flow (1 hour)
Ensure user row is created in `users` table

### Step 4: Test End-to-End (2 hours)
1. Sign up new user
2. Start session in popup
3. Verify session in dashboard
4. Verify data in Supabase

---

## SUCCESS CRITERIA

### Minimum Viable Product (MVP)
- ✅ User can sign up and login
- ✅ User can start/stop sessions from popup
- ✅ Sessions persist across tab switches
- ✅ Sessions visible in dashboard
- ✅ Data syncs to Supabase
- ✅ Basic productivity score calculated
- ✅ History page shows past sessions

### Production Ready
- ✅ All MVP features
- ✅ Real-time 3-way sync
- ✅ Website tracking during sessions
- ✅ Manual session input/editing
- ✅ Classification editor
- ✅ Error handling & feedback
- ✅ Deployed and accessible
- ✅ Extension published to Chrome Web Store
- ✅ Security hardened
- ✅ Monitoring in place

---

*End of Checklist - Let's build this! 🚀*
