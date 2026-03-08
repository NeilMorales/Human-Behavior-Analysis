# Quick Fix for Website Visits - Do This Now

## Problem
Website visits aren't showing up in the dashboard history, even after waiting 5+ minutes.

## Most Likely Cause
The database migration wasn't applied, so the `website_visits` table still has the wrong schema (session_id as TEXT instead of UUID).

## Quick Fix Steps

### 1. Apply Database Migration (REQUIRED)

Go to your Supabase dashboard and run this SQL:

```sql
-- Drop and recreate website_visits table with correct schema
DROP TABLE IF EXISTS website_visits CASCADE;

CREATE TABLE website_visits (
    visit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES focus_sessions(session_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    classification TEXT CHECK (classification IN ('productive', 'neutral', 'distracting')),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_seconds INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (session_id, domain, start_time)
);

CREATE INDEX idx_website_visits_session ON website_visits(session_id);
CREATE INDEX idx_website_visits_user ON website_visits(user_id, created_at DESC);
CREATE INDEX idx_website_visits_domain ON website_visits(domain);

ALTER TABLE website_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_visits" ON website_visits
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "admin_read_all_visits" ON website_visits
    FOR SELECT USING (
        EXISTS (
            SELECT 1
            FROM users
            WHERE user_id = auth.uid()
                AND role = 'admin'
        )
    );

-- Verify it worked
SELECT 
    column_name, 
    data_type
FROM information_schema.columns
WHERE table_name = 'website_visits'
    AND column_name = 'session_id';
-- Should show: session_id | uuid
```

### 2. Reload Extension

1. Go to `chrome://extensions/`
2. Find "BehaviorIQ"
3. Click the reload icon 🔄

### 3. Clear Old Data (Optional but Recommended)

In extension console (`chrome://extensions/` → Details → Inspect views: service worker):

```javascript
// Clear old website visits that have wrong format
chrome.storage.local.set({ websiteVisits: [] }, () => {
    console.log('Cleared old website visits');
});
```

### 4. Test with Fresh Session

1. **Start a NEW session** from extension popup:
   - Task: "Testing website tracking v2"
   - Category: "Coding"
   - Duration: 3 minutes

2. **Browse these websites** (spend 10-15 seconds on each):
   - github.com
   - youtube.com
   - stackoverflow.com

3. **Stop the session** from extension popup

4. **Check extension console** for sync logs:
   - Should see: "Website visits sync" or similar
   - Should NOT see any errors

5. **Wait 5 minutes** for sync to complete

6. **Check dashboard**:
   - Go to http://localhost:3000/dashboard/history
   - Find "Testing website tracking v2" session
   - Click to expand
   - Should show the 3 websites you visited

### 5. If Still Not Working - Debug

Run this in extension console:

```javascript
// Check what's in storage
chrome.storage.local.get(['websiteVisits', 'activeSession'], (data) => {
    console.log('=== WEBSITE VISITS DEBUG ===');
    console.log('Total visits:', data.websiteVisits?.length || 0);
    
    if (data.websiteVisits && data.websiteVisits.length > 0) {
        console.log('Sample visit:', data.websiteVisits[0]);
        console.log('Unsynced visits:', data.websiteVisits.filter(v => !v.synced && v.endTime !== null).length);
    } else {
        console.log('❌ No visits tracked - this is the problem!');
        console.log('Active session:', data.activeSession);
    }
});
```

## Why This Happens

The original `website_visits` table was created with `session_id TEXT`, but:
- The `focus_sessions` table uses `session_id UUID`
- The extension generates UUIDs for session IDs
- When syncing, the database rejects the data because of type mismatch

The fix changes `session_id` to `UUID` and adds a proper foreign key constraint.

## Verification

After applying the fix, verify in Supabase SQL Editor:

```sql
-- Should return rows if working
SELECT 
    wv.domain,
    wv.classification,
    wv.duration_seconds,
    fs.task_name
FROM website_visits wv
JOIN focus_sessions fs ON wv.session_id = fs.session_id
ORDER BY wv.created_at DESC
LIMIT 5;
```

## Still Not Working?

If visits still don't show up after following ALL steps above:

1. Check extension console for errors
2. Check browser DevTools Network tab for failed API calls
3. Check Supabase logs for errors
4. Share the error messages so I can help debug further

The most common mistake is forgetting to reload the extension after applying the database fix!
