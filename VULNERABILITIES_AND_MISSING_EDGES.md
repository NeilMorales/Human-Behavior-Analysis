# BehaviorIQ - Vulnerabilities & Missing Edges

**Analysis Date:** March 5, 2026  
**Risk Assessment:** MEDIUM-HIGH (Not production-ready)

---

## CRITICAL VULNERABILITIES (Fix Immediately)

### 1. Authentication Token Expiry - CRITICAL
**Risk Level:** 🔴 CRITICAL  
**Impact:** Users will be forcibly logged out, data sync will fail

**Issue:**
- Extension syncManager has no token refresh logic
- When access token expires (typically 1 hour), sync fails silently
- No retry mechanism with refreshed token

**Location:**
- `extension/src/background/syncManager.ts` line 24-26
- `extension/src/shared/api.ts` line 13-15

**Fix Required:**
```typescript
// In syncManager.ts
if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
        return attemptSync(); // Retry with new token
    }
    // Clear tokens and notify user to re-login
}
```

**Estimated Fix Time:** 2-3 hours

---

### 2. Message Passing Broken - CRITICAL
**Risk Level:** 🔴 CRITICAL  
**Impact:** Extension popup cannot start/stop sessions

**Issue:**
- Popup sends `chrome.runtime.sendMessage()` but no listener exists
- `START_SESSION` and `STOP_SESSION` messages go nowhere
- Users cannot control focus sessions from popup

**Location:**
- `extension/src/popup/components/StartSession.tsx` line 24
- `extension/src/popup/components/SessionTimer.tsx` line 23, 28
- `extension/src/background/index.ts` - missing listener

**Fix Required:**
```typescript
// Add to background/index.ts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'START_SESSION') {
        startSession(message.payload).then(sendResponse);
        return true; // Async response
    }
    if (message.type === 'STOP_SESSION') {
        stopSession(message.payload).then(sendResponse);
        return true;
    }
});
```

**Estimated Fix Time:** 1-2 hours

---

### 3. Missing Service Role Key - CRITICAL
**Risk Level:** 🔴 CRITICAL  
**Impact:** Server-side operations will fail

**Issue:**
- `.env.local` has placeholder `YOUR_SUPABASE_SERVICE_ROLE_KEY`
- Admin operations require service role key
- Some API routes may fail without it

**Location:**
- `frontend/.env.local` line 3

**Fix Required:**
1. Get service role key from Supabase dashboard
2. Add to `.env.local` (never commit!)
3. Add to Vercel environment variables

**Estimated Fix Time:** 15 minutes

---

### 4. Storage Quota Overflow - CRITICAL
**Risk Level:** 🔴 CRITICAL  
**Impact:** Extension could crash when hitting 10MB limit

**Issue:**
- chrome.storage.local has 10MB limit
- No monitoring of storage usage
- No automatic purging of old events
- Could fill up in ~2-3 months of heavy use

**Location:**
- `extension/src/background/syncManager.ts` - purgeOldEvents not implemented
- No quota monitoring anywhere

**Fix Required:**
```typescript
// Add quota monitoring
async function checkStorageQuota() {
    const bytes = await chrome.storage.local.getBytesInUse();
    if (bytes > STORAGE_QUOTA_WARNING_BYTES) {
        // Warn user and purge old data
        await purgeOldEvents(30);
    }
}

// Call in heartbeat
```

**Estimated Fix Time:** 3-4 hours

---

### 5. Database Schema Mismatch - CRITICAL
**Risk Level:** 🔴 CRITICAL  
**Impact:** API queries will fail

**Issue:**
- API expects `total_focus_minutes` but schema has `total_focus_time`
- API expects `domain_stats` table but it doesn't exist
- Column name inconsistencies throughout

**Location:**
- `frontend/app/api/analysis/dashboard/route.ts` line 22, 38
- `backend/supabase/migrations/001_initial_schema.sql` - missing table

**Fix Required:**
1. Create `domain_stats` table
2. Rename columns to match API expectations
3. Update all queries

**Estimated Fix Time:** 2-3 hours

---

## HIGH PRIORITY VULNERABILITIES

### 6. No Input Validation - HIGH
**Risk Level:** 🟠 HIGH  
**Impact:** SQL injection, XSS, data corruption

**Issue:**
- API routes accept user input without validation
- No sanitization of domain names, task names, notes
- Could allow malicious data injection

**Location:**
- All API routes in `frontend/app/api/`

**Fix Required:**
- Add Zod schema validation
- Sanitize all user inputs
- Validate data types and ranges

**Estimated Fix Time:** 1 day

---

### 7. No Rate Limiting - HIGH
**Risk Level:** 🟠 HIGH  
**Impact:** API abuse, DoS attacks, cost overruns

**Issue:**
- No rate limiting on any API routes
- Sync endpoint could be hammered
- Could exhaust Supabase free tier

**Location:**
- All API routes

**Fix Required:**
- Implement rate limiting middleware
- Use Redis or Upstash for distributed rate limiting
- Set per-user and per-IP limits

**Estimated Fix Time:** 4-6 hours

---

### 8. No CORS Configuration - HIGH
**Risk Level:** 🟠 HIGH  
**Impact:** Unauthorized cross-origin requests

**Issue:**
- No CORS headers configured
- Extension and dashboard on different origins
- Could allow unauthorized access

**Location:**
- `frontend/next.config.ts`
- API routes

**Fix Required:**
```typescript
// In next.config.ts
async headers() {
    return [
        {
            source: '/api/:path*',
            headers: [
                { key: 'Access-Control-Allow-Origin', value: 'chrome-extension://*' },
                { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE' },
            ],
        },
    ];
}
```

**Estimated Fix Time:** 1-2 hours

---

### 9. Exposed API Key - HIGH
**Risk Level:** 🟠 HIGH  
**Impact:** Unauthorized Stitch API usage

**Issue:**
- Stitch API key hardcoded in `.kiro/settings/mcp.json`
- Should be in environment variable
- Could be committed to git

**Location:**
- `.kiro/settings/mcp.json` line 6

**Fix Required:**
- Move to environment variable
- Add to .gitignore
- Rotate key if already exposed

**Estimated Fix Time:** 30 minutes

---

### 10. No Error Boundaries - HIGH
**Risk Level:** 🟠 HIGH  
**Impact:** React errors crash entire app

**Issue:**
- No error boundaries in React app
- Single component error breaks everything
- No graceful degradation

**Location:**
- `frontend/app/layout.tsx`
- All page components

**Fix Required:**
- Add error boundary wrapper
- Implement fallback UI
- Log errors to monitoring service

**Estimated Fix Time:** 2-3 hours

---

## MEDIUM PRIORITY VULNERABILITIES

### 11. Silent Failures - MEDIUM
**Risk Level:** 🟡 MEDIUM  
**Impact:** Users unaware of issues

**Issue:**
- Sync failures are silent
- API errors not shown to user
- No feedback on failed operations

**Fix Required:**
- Add toast notifications
- Log errors to console
- Show user-friendly error messages

**Estimated Fix Time:** 1 day

---

### 12. No Data Backup - MEDIUM
**Risk Level:** 🟡 MEDIUM  
**Impact:** Data loss if Supabase fails

**Issue:**
- No backup strategy
- No export functionality
- No disaster recovery plan

**Fix Required:**
- Implement automated backups
- Add CSV/JSON export
- Document recovery procedures

**Estimated Fix Time:** 2 days

---

### 13. No Monitoring - MEDIUM
**Risk Level:** 🟡 MEDIUM  
**Impact:** Can't detect production issues

**Issue:**
- No error tracking (Sentry, etc.)
- No performance monitoring
- No uptime monitoring

**Fix Required:**
- Add Sentry for error tracking
- Add Vercel Analytics
- Set up uptime monitoring

**Estimated Fix Time:** 4 hours

---

### 14. Hardcoded Localhost URL - MEDIUM
**Risk Level:** 🟡 MEDIUM  
**Impact:** Extension won't work in production

**Issue:**
- `DASHBOARD_URL` hardcoded to `http://localhost:3000`
- Must be updated before deployment
- No environment-based configuration

**Location:**
- `extension/src/shared/constants.ts` line 3

**Fix Required:**
- Use environment variable
- Build separate dev/prod versions
- Document build process

**Estimated Fix Time:** 1 hour

---

### 15. No CSRF Protection - MEDIUM
**Risk Level:** 🟡 MEDIUM  
**Impact:** Cross-site request forgery

**Issue:**
- No CSRF tokens
- State-changing operations vulnerable
- Could allow unauthorized actions

**Fix Required:**
- Implement CSRF token middleware
- Validate tokens on POST/PUT/DELETE
- Use SameSite cookies

**Estimated Fix Time:** 3-4 hours

---

## MISSING CRITICAL FEATURES

### 16. Daily Summary Builder - CRITICAL MISSING
**Impact:** Core analytics don't work

**Issue:**
- `buildDailySummary` function not implemented
- Events stored but never aggregated
- Dashboard shows no real data

**Location:**
- Should be in `frontend/lib/summaryBuilder.ts` (doesn't exist)
- Called from `frontend/app/api/sync/route.ts` (commented out)

**Implementation Required:**
1. Create summaryBuilder.ts
2. Implement event log parsing
3. Calculate all metrics (focus time, productive time, etc.)
4. Compute behavior score
5. Upsert to daily_summaries table

**Estimated Time:** 2-3 days

---

### 17. Anomaly Detection - CRITICAL MISSING
**Impact:** No behavioral insights

**Issue:**
- 7 anomaly detection rules not implemented
- No alerts generated
- Key feature completely missing

**Location:**
- Should be in `frontend/lib/anomalyDetector.ts` (doesn't exist)

**Implementation Required:**
1. Create anomalyDetector.ts
2. Implement all 7 rules from spec
3. Add deduplication logic
4. Insert alerts to database

**Estimated Time:** 2-3 days

---

### 18. Supabase Edge Functions - CRITICAL MISSING
**Impact:** No automated daily processing

**Issue:**
- No cron jobs configured
- Daily summaries won't run automatically
- Weekly digests won't be sent

**Location:**
- `backend/supabase/functions/` is empty

**Implementation Required:**
1. Create daily-summary Edge Function
2. Create weekly-digest Edge Function
3. Configure cron schedules
4. Deploy to Supabase

**Estimated Time:** 1-2 days

---

### 19. Active Session Polling - HIGH MISSING
**Impact:** Dashboard doesn't show live sessions

**Issue:**
- No real-time sync between extension and dashboard
- Active session not displayed
- Timer not live

**Implementation Required:**
1. Create GET /api/sessions/active route
2. Implement polling in dashboard
3. Add WebSocket for real-time (optional)

**Estimated Time:** 1 day

---

### 20. Interruption Counter - HIGH MISSING
**Impact:** Interruption tracking doesn't work

**Issue:**
- Interruption count never incremented
- Notifications fire but count stays 0
- Affects behavior score calculation

**Location:**
- `extension/src/background/tabTracker.ts` line 42

**Fix Required:**
```typescript
// After firing notification
const { activeSession } = await readStorage(['activeSession']);
if (activeSession) {
    activeSession.interruptionCount++;
    await writeStorage({ activeSession });
}
```

**Estimated Time:** 30 minutes

---

## MISSING EDGES (UX Issues)

### 21. No Loading States
- All async operations show nothing while loading
- Users don't know if app is working
- Poor UX

**Fix:** Add loading spinners, skeleton loaders

---

### 22. No Error Messages
- Failed operations show no feedback
- Users confused when things don't work
- No guidance on how to fix

**Fix:** Add toast notifications, error messages

---

### 23. No Empty States
- Empty lists show nothing
- New users see blank screens
- No onboarding

**Fix:** Add empty state illustrations, helpful text

---

### 24. No Confirmation Dialogs
- Destructive actions (delete) have no confirmation
- Easy to accidentally delete data
- No undo

**Fix:** Add confirmation modals

---

### 25. No Keyboard Shortcuts
- Everything requires mouse clicks
- Power users can't be efficient
- Poor accessibility

**Fix:** Add keyboard shortcuts

---

### 26. No Mobile Responsiveness
- Dashboard not tested on mobile
- Likely broken on small screens
- Extension is desktop-only (by nature)

**Fix:** Add responsive breakpoints

---

### 27. No Accessibility
- No ARIA labels
- No keyboard navigation
- No screen reader support
- Fails WCAG guidelines

**Fix:** Add accessibility features

---

### 28. No Onboarding
- New users don't know what to do
- No tutorial or guide
- High abandonment risk

**Fix:** Add onboarding flow

---

### 29. No Help/Documentation
- No in-app help
- No FAQ
- No troubleshooting guide

**Fix:** Add help center

---

### 30. No Feedback Mechanism
- Users can't report bugs
- No feature requests
- No contact form

**Fix:** Add feedback widget

---

## SECURITY CHECKLIST

### Authentication & Authorization
- [ ] Token refresh implemented
- [ ] Logout functionality working
- [ ] Session timeout configured
- [ ] Password reset flow
- [ ] Email verification
- [ ] 2FA support (future)

### Data Protection
- [ ] Input validation on all endpoints
- [ ] SQL injection protection
- [ ] XSS protection
- [ ] CSRF protection
- [ ] Rate limiting
- [ ] CORS configured
- [ ] HTTPS enforced
- [ ] Secrets in environment variables

### Privacy & Compliance
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] GDPR compliance
- [ ] Data deletion workflow
- [ ] Cookie consent
- [ ] Analytics opt-out

### Monitoring & Logging
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring
- [ ] Uptime monitoring
- [ ] Audit logging
- [ ] Security alerts

### Infrastructure
- [ ] Automated backups
- [ ] Disaster recovery plan
- [ ] Secrets rotation
- [ ] Dependency updates
- [ ] Security patches

---

## PRIORITY MATRIX

### Fix This Week (Critical)
1. Message passing (popup ↔ background)
2. Service role key
3. Database schema fixes
4. Token refresh logic
5. Storage quota monitoring

### Fix Next Week (High)
6. Input validation
7. Rate limiting
8. CORS configuration
9. Error boundaries
10. Daily summary builder

### Fix This Month (Medium)
11. Anomaly detection
12. Edge Functions
13. Active session polling
14. Monitoring setup
15. Error handling

### Fix Eventually (Low)
16. All UX improvements
17. Accessibility
18. Mobile responsiveness
19. Onboarding
20. Help documentation

---

## RISK ASSESSMENT SUMMARY

**Overall Risk Level:** 🟠 MEDIUM-HIGH

**Deployment Readiness:** ❌ NOT READY

**Estimated Time to Production-Ready:** 8-10 weeks

**Biggest Risks:**
1. Authentication will break (token expiry)
2. Extension popup doesn't work (message passing)
3. Data pipeline incomplete (no summaries)
4. No error handling (silent failures)
5. Security vulnerabilities (no validation, rate limiting)

**Recommendation:** Do NOT deploy to production until critical vulnerabilities are fixed and core features are complete.

---

*End of Vulnerability Assessment*
