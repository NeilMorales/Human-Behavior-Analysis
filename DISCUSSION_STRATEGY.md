# BehaviorIQ - Discussion & Strategy

**Date:** March 5, 2026

---

## YOUR ISSUES - ROOT CAUSES

### 1. Session Button Not Working
**Cause:** No message listener in background script  
**Fix:** Add `chrome.runtime.onMessage` listener

### 2. Session Closes on Tab Switch
**Cause:** State only in popup memory, not persisted  
**Fix:** Save to chrome.storage.local immediately

### 3. No Session History
**Cause:** Sessions not synced to database  
**Fix:** Add sessions to sync queue

### 4. Empty Supabase Tables
**Causes:**
- Signup doesn't create user row
- Sync not authenticated
- RLS blocking inserts

**Fix:** Fix signup flow, verify auth, test RLS

---

## REAL-TIME 3-WAY SYNC

**Requirement:** Popup, Focus page, Overview page show same session

**Solution: Polling (Recommended)**
- Dashboard polls /api/sessions/active every 5 sec
- Popup reads chrome.storage.local every 1 sec
- Simple, reliable, works offline

**Alternative:** WebSockets (more complex, real-time)

---

## ENHANCED PRODUCTIVITY FORMULA

**Proposed Weights:**
1. Productive time: 25%
2. Distraction penalty: 20%
3. Session completion: 15%
4. Focus quality (tab switches): 10%
5. Idle penalty: 5%
6. User self-rating: 10%

**Factors:**
- Time on productive sites
- Time on distracting sites
- Tab switch count
- Idle time
- Session completion rate
- User manual rating

---

## WEBSITE CLASSIFICATION EDITOR

**UI Location:** Settings page

**Features:**
- List all visited domains
- Show current classification
- Dropdown to change
- Visual indicators (🟢🟡🔴)
- Search/filter
- Bulk edit

**Display Everywhere:**
- Session details
- Domain stats
- Top domains chart

---

## DEPLOYMENT STRATEGY

### Dashboard (Vercel)
1. Push to GitHub
2. Connect to Vercel
3. Add environment variables
4. Deploy (automatic)
5. Get URL: behavioriq.vercel.app

**Cost:** Free

### Extension (Chrome Web Store)
1. Create developer account ($5)
2. Prepare listing
3. Upload ZIP
4. Submit for review
5. Publish

**Timeline:** 1-3 days review

### Auto-Login Sync
**Method:** Token copy-paste
1. User logs in on dashboard
2. Dashboard shows token
3. User pastes in extension
4. Extension stores and syncs

---

## QUESTIONS FOR YOU

1. **Formula weights** - Agree with proposed distribution?
2. **Classification defaults** - Add more distracting sites?
3. **Session editing** - Allow editing start time/duration?
4. **Sync method** - Polling or WebSockets?
5. **Distribution** - Chrome Web Store or direct download?

---

## IMMEDIATE NEXT STEPS

### Today
1. Review all documents
2. Answer questions above
3. Decide priorities

### This Week (Phase 1)
1. Fix message passing
2. Fix session persistence
3. Fix database connection
4. Test end-to-end

### Next Week (Phase 2)
1. Implement 3-way sync
2. Add website tracking
3. Build classification editor

### Timeline
- MVP: 2-3 weeks
- Production: 4-6 weeks
- Polished: 8-10 weeks

---

Ready to start? Let me know which issue to fix first!
