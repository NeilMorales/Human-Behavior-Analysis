# Debug Website Visits - Step by Step

## Step 1: Check if Database Migration Was Applied

Did you run the `FIX_WEBSITE_VISITS.sql` script in your Supabase SQL Editor?

If not, do this now:
1. Go to your Supabase dashboard
2. Click "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy and paste the contents of `FIX_WEBSITE_VISITS.sql`
5. Click "Run"
6. Check for success message

## Step 2: Verify Table Schema

Run this query in Supabase SQL Editor:

```sql
-- Check if website_visits table exists and has correct schema
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'website_visits'
ORDER BY ordinal_position;
```

Expected output should show:
- visit_id (uuid)
- session_id (uuid) ← MUST be uuid, not text
- user_id (uuid)
- domain (text)
- classification (text)
- start_time (timestamp with time zone)
- end_time (timestamp with time zone)
- duration_seconds (integer)
- created_at (timestamp with time zone)

## Step 3: Check Extension Console for Errors

1. Go to `chrome://extensions/`
2. Find "BehaviorIQ" extension
3. Click "Details"
4. Click "Inspect views: service worker" (this opens the extension console)
5. Look for any errors related to:
   - "Website visits sync error"
   - "Sync error"
   - Any 500 or 400 errors

## Step 4: Check if Visits Are Being Tracked Locally

In the extension console (from Step 3), run:

```javascript
chrome.storage.local.get(['websiteVisits', 'activeSession'], (data) => {
    console.log('Active Session:', data.activeSession);
    console.log('Website Visits:', data.websiteVisits);
    console.log('Total visits:', data.websiteVisits?.length || 0);
    console.log('Unsynced visits:', data.websiteVisits?.filter(v => !v.synced).length || 0);
});
```

This will show:
- If visits are being tracked locally
- How many visits exist
- How many are waiting to be synced

## Step 5: Manually Trigger Sync

In the extension console, run:

```javascript
// Manually trigger sync
chrome.runtime.sendMessage({ type: 'MANUAL_SYNC' }, (response) => {
    console.log('Manual sync response:', response);
});
```

Wait a few seconds, then check the database again.

## Step 6: Check Database for Visits

Run this in Supabase SQL Editor:

```sql
-- Check if any visits exist
SELECT 
    wv.*,
    fs.task_name,
    fs.status
FROM website_visits wv
LEFT JOIN focus_sessions fs ON wv.session_id = fs.session_id
ORDER BY wv.created_at DESC
LIMIT 10;
```

## Step 7: Check API Endpoint

Open browser DevTools (F12) on the dashboard:
1. Go to Network tab
2. Filter for "website-visits"
3. Start a new session
4. Browse some websites
5. Stop the session
6. Wait 5 minutes
7. Check if you see a POST request to `/api/website-visits`
8. If yes, check the response - should be `{ success: true, syncedCount: X }`

## Common Issues and Fixes

### Issue 1: Migration Not Applied
**Symptom**: session_id is TEXT instead of UUID
**Fix**: Run `FIX_WEBSITE_VISITS.sql` in Supabase SQL Editor

### Issue 2: Extension Not Reloaded
**Symptom**: Old code still running
**Fix**: Go to `chrome://extensions/` and click reload on BehaviorIQ

### Issue 3: No Active Session
**Symptom**: websiteVisits array is empty
**Fix**: Make sure you start a session BEFORE browsing websites

### Issue 4: Sync Not Running
**Symptom**: Visits tracked locally but not in database
**Fix**: Check extension console for sync errors

### Issue 5: Foreign Key Constraint
**Symptom**: Error like "violates foreign key constraint"
**Fix**: Make sure the session exists in focus_sessions table before visits are synced

## Quick Test Script

Run this complete test:

```javascript
// In extension console
(async () => {
    // 1. Check storage
    const data = await chrome.storage.local.get(['websiteVisits', 'activeSession', 'accessToken']);
    console.log('=== STORAGE CHECK ===');
    console.log('Logged in:', !!data.accessToken);
    console.log('Active session:', data.activeSession?.id || 'None');
    console.log('Total visits:', data.websiteVisits?.length || 0);
    console.log('Unsynced visits:', data.websiteVisits?.filter(v => !v.synced && v.endTime !== null).length || 0);
    
    // 2. Show unsynced visits
    if (data.websiteVisits) {
        const unsynced = data.websiteVisits.filter(v => !v.synced && v.endTime !== null);
        console.log('=== UNSYNCED VISITS ===');
        unsynced.forEach(v => {
            console.log(`- ${v.domain} (${v.durationSeconds}s) [${v.classification}]`);
        });
    }
    
    // 3. Try manual sync
    console.log('=== ATTEMPTING SYNC ===');
    const { attemptSync } = await import('./background/syncManager.js');
    await attemptSync();
    console.log('Sync completed - check database');
})();
```

## Next Steps

After running these checks, report back:
1. What does Step 2 show? (Is session_id UUID or TEXT?)
2. What does Step 4 show? (Are visits being tracked?)
3. What does Step 7 show? (Is the API being called?)
4. Any errors in extension console?
