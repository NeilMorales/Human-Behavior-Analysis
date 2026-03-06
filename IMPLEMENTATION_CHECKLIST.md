# Implementation Checklist - All Remaining Issues

**Created:** Current Session  
**Goal:** Fix ALL identified issues before moving to next phase  
**Next Phase:** Phase 3 - Display Visited Websites & Google Stitch Design

---

## ✅ ALREADY FIXED (Session 7)

1. ✅ Extension login/signup UI added
2. ✅ User auto-creation trigger in database
3. ✅ Session sync to database (with auth tokens)
4. ✅ Active session display on overview page
5. ✅ 3-way sync foundation (popup ↔ focus ↔ overview)
6. ✅ Database schema fixes (domain_stats, column names)

---

## 🔴 CRITICAL ISSUES (Must Fix Now)

### 1. Token Refresh Logic
**Status:** ❌ Not Implemented  
**Impact:** Users will be logged out when tokens expire  
**Files:**
- `extension/src/shared/api.ts`
- `extension/src/background/syncManager.ts`

**Tasks:**
- [ ] Implement token refresh in api.ts
- [ ] Handle 401 responses and retry with new token
- [ ] Store refresh token and use it to get new access token

---

### 2. Interruption Counter Not Working
**Status:** ❌ Not Implemented  
**Impact:** Distraction tracking doesn't work  
**Files:**
- `extension/src/background/sessionManager.ts`
- `extension/src/background/tabTracker.ts`

**Tasks:**
- [ ] Increment interruption count when distracting site visited
- [ ] Update active session in storage
- [ ] Sync updated count to database

---

### 3. Storage Quota Monitoring
**Status:** ❌ Not Implemented  
**Impact:** Extension could crash at 10MB limit  
**Files:**
- `extension/src/background/syncManager.ts`
- `extension/src/shared/storage.ts`

**Tasks:**
- [ ] Add quota check function
- [ ] Purge old events (>30 days)
- [ ] Warn user at 8MB
- [ ] Force sync and purge at 9MB

---

### 4. Event Log Purging
**Status:** ❌ Not Implemented  
**Impact:** Storage will fill up over time  
**Files:**
- `extension/src/background/syncManager.ts`

**Tasks:**
- [ ] Implement purgeOldEvents function
- [ ] Delete events older than 30 days
- [ ] Run on sync completion
- [ ] Keep only last 100 sessions in sessionHistory

---

### 5. Daily Summary Builder
**Status:** ❌ Not Implemented  
**Impact:** Dashboard shows no real analytics  
**Files:**
- `frontend/app/api/analysis/dashboard/route.ts` (needs creation)
- Backend edge function (needs creation)

**Tasks:**
- [ ] Create buildDailySummary function
- [ ] Aggregate tab_events by date
- [ ] Calculate productive/distracting/neutral time
- [ ] Calculate behavior score
- [ ] Upsert to daily_summaries table
- [ ] Run daily via cron or on-demand

---

## ⚠️ HIGH PRIORITY ISSUES

### 6. Focus Page Timer Not Working
**Status:** ⚠️ Partially Implemented  
**Impact:** Users can't see timer on focus page  
**Files:**
- `frontend/app/dashboard/focus/page.tsx`

**Tasks:**
- [ ] Verify useActiveSession hook is fetching data
- [ ] Debug why timer shows 25:00 instead of countdown
- [ ] Add error handling for failed fetches
- [ ] Add loading state

---

### 7. History Page Shows Mock Data
**Status:** ⚠️ Mock Only  
**Impact:** Users can't see past sessions  
**Files:**
- `frontend/app/dashboard/history/page.tsx`

**Tasks:**
- [ ] Fetch real sessions from /api/sessions
- [ ] Display session list with details
- [ ] Add filters (date range, category, status)
- [ ] Add pagination
- [ ] Show visited websites per session

---

### 8. Settings Page Not Functional
**Status:** ⚠️ Mock Only  
**Impact:** Users can't customize settings  
**Files:**
- `frontend/app/dashboard/settings/page.tsx`
- `frontend/app/api/settings/route.ts`

**Tasks:**
- [ ] Implement PUT endpoint for settings
- [ ] Add form validation
- [ ] Update user_settings in database
- [ ] Sync settings to extension
- [ ] Add domain classification editor

---

### 9. Logout Not Working
**Status:** ❌ Route Missing  
**Impact:** Users can't logout  
**Files:**
- `frontend/app/api/auth/logout/route.ts`

**Tasks:**
- [ ] Create logout route
- [ ] Clear Supabase session
- [ ] Clear cookies
- [ ] Redirect to login

---

### 10. Extension Options Page Minimal
**Status:** ⚠️ Basic Only  
**Impact:** Users can't configure extension  
**Files:**
- `extension/src/options/OptionsApp.tsx`

**Tasks:**
- [ ] Add account section (show logged in user)
- [ ] Add logout button
- [ ] Add domain classification list
- [ ] Add sync status display
- [ ] Add advanced settings (idle threshold, etc.)

---

## 🟡 MEDIUM PRIORITY ISSUES

### 11. No Error Boundaries
**Status:** ❌ Not Implemented  
**Impact:** Crashes show blank screen  
**Files:**
- `frontend/app/error.tsx` (needs creation)
- `frontend/components/ErrorBoundary.tsx` (needs creation)

**Tasks:**
- [ ] Create error boundary component
- [ ] Add to layout
- [ ] Add error logging
- [ ] Show user-friendly error messages

---

### 12. No Loading States
**Status:** ⚠️ Minimal  
**Impact:** Poor UX during data fetching  
**Files:**
- All dashboard pages

**Tasks:**
- [ ] Add loading skeletons
- [ ] Add loading spinners
- [ ] Add optimistic updates
- [ ] Add error states

---

### 13. No Rate Limiting
**Status:** ❌ Not Implemented  
**Impact:** API abuse possible  
**Files:**
- `frontend/middleware.ts`

**Tasks:**
- [ ] Add rate limiting middleware
- [ ] Limit by IP or user ID
- [ ] Return 429 when exceeded
- [ ] Add retry-after header

---

### 14. No Input Validation
**Status:** ⚠️ Minimal  
**Impact:** Security risk, bad data  
**Files:**
- All API routes

**Tasks:**
- [ ] Add Zod schemas for validation
- [ ] Validate all inputs
- [ ] Sanitize user inputs
- [ ] Return 400 with clear errors

---

### 15. No CORS Configuration
**Status:** ❌ Not Configured  
**Impact:** Extension can't call API from different origin  
**Files:**
- `frontend/next.config.ts`

**Tasks:**
- [ ] Add CORS headers
- [ ] Allow extension origin
- [ ] Configure for production

---

## 🟢 LOW PRIORITY / POLISH

### 16. Content Script Empty
**Status:** ❌ Placeholder Only  
**Impact:** No page interaction features  
**Files:**
- `extension/src/content/index.ts`

**Tasks:**
- [ ] Add page time tracking
- [ ] Add scroll tracking
- [ ] Add click tracking (optional)
- [ ] Send events to background

---

### 17. No Charts on Dashboard
**Status:** ⚠️ Only ActivityChart  
**Impact:** Limited data visualization  
**Files:**
- `frontend/components/charts/`

**Tasks:**
- [ ] Add PieChart for time distribution
- [ ] Add BarChart for category breakdown
- [ ] Add LineChart for score trends
- [ ] Add HeatMap for activity patterns

---

### 18. No PDF Export
**Status:** ❌ Not Implemented  
**Impact:** Users can't export reports  
**Files:**
- `frontend/lib/pdfExport.ts` (needs creation)

**Tasks:**
- [ ] Create PDF template
- [ ] Add export button
- [ ] Generate PDF from data
- [ ] Download file

---

### 19. No Anomaly Detection
**Status:** ❌ Not Implemented  
**Impact:** No behavioral insights  
**Files:**
- Backend edge function (needs creation)

**Tasks:**
- [ ] Implement 7 anomaly rules
- [ ] Generate alerts
- [ ] Store in anomaly_alerts table
- [ ] Display on dashboard

---

### 20. No Achievements System
**Status:** ❌ Not Implemented  
**Impact:** No gamification  
**Files:**
- Backend edge function (needs creation)

**Tasks:**
- [ ] Define achievement types
- [ ] Check conditions
- [ ] Unlock achievements
- [ ] Display on dashboard

---

## 📋 IMPLEMENTATION ORDER

### Phase 1: Critical Fixes (This Session)
1. Token refresh logic
2. Interruption counter
3. Storage quota monitoring
4. Event log purging
5. Daily summary builder

### Phase 2: High Priority (Next Session)
6. Focus page timer fix
7. History page real data
8. Settings page functionality
9. Logout implementation
10. Extension options page

### Phase 3: Medium Priority
11. Error boundaries
12. Loading states
13. Rate limiting
14. Input validation
15. CORS configuration

### Phase 4: Polish & Features
16. Content script
17. Charts
18. PDF export
19. Anomaly detection
20. Achievements

---

## 🎯 NEXT PHASE AFTER ALL FIXES

**Phase 3: Display Visited Websites & Google Stitch Design**

### Part A: Display Visited Websites
- Show list of domains visited during each session
- Display time spent per domain
- Show classification colors (productive/neutral/distracting)
- Add domain details modal
- Add filtering and sorting

### Part B: Google Stitch Design Improvements
- Use Stitch MCP to redesign popup
- Redesign dashboard pages
- Make UI more interactive and engaging
- Add animations and transitions
- Improve color scheme and typography

---

## 📊 PROGRESS TRACKING

**Total Issues:** 20  
**Fixed:** 6 (30%)  
**Remaining:** 14 (70%)  

**Critical:** 5 issues  
**High Priority:** 5 issues  
**Medium Priority:** 5 issues  
**Low Priority:** 5 issues  

**Estimated Time:**
- Critical: 4-6 hours
- High Priority: 4-6 hours
- Medium Priority: 3-4 hours
- Low Priority: 6-8 hours
- **Total: 17-24 hours**

---

## 🚀 LET'S START!

Ready to implement? Let's tackle the critical issues first!
