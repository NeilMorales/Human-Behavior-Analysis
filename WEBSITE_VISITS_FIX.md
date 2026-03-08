# Website Visits Tracking Fix

## Problem

The extension was tracking website visits locally but they weren't showing up on the dashboard history page. Two issues were found:

1. **Database Schema Mismatch**: The `website_visits` table had `session_id TEXT` but `focus_sessions` uses `session_id UUID`, causing a foreign key type mismatch
2. **Visit ID Generation**: Extension was generating visit IDs as string concatenations (`${sessionId}_${domain}_${startTime}`) instead of proper UUIDs

## The Fix

### 1. Fixed Database Schema
Created migration `006_fix_website_visits_schema.sql` that:
- Drops and recreates `website_visits` table with correct schema
- Changes `session_id` from `TEXT` to `UUID` with proper foreign key reference
- Ensures `visit_id` is a proper UUID

### 2. Fixed Extension Visit ID Generation
Updated `extension/src/background/tabTracker.ts`:
- Changed from string concatenation to proper UUID generation using `generateUUID()`
- Now generates proper UUIDs that match database expectations

## How Website Visit Tracking Works

### Extension Side:
1. **Tab Tracking**: `tabTracker.ts` monitors tab switches and URL changes
2. **Visit Start**: When user switches to a new domain during an active session, creates a new visit record
3. **Visit End**: When user switches away, updates the visit with end time and duration
4. **Local Storage**: Visits stored in `chrome.storage.local` with `synced: false` flag

### Sync Process:
1. **Periodic Sync**: `syncManager.ts` runs every 5 minutes (via alarm)
2. **Collects Unsynced Visits**: Finds all visits with `synced: false` and `endTime !== null`
3. **Sends to API**: POSTs to `/api/website-visits` with batch of visits
4. **Marks as Synced**: Updates local storage to mark visits as `synced: true`

### Dashboard Side:
1. **History Page**: Shows all completed sessions
2. **Expand Session**: Clicking a session fetches its website visits via `/api/sessions/[id]/visits`
3. **Display**: Shows domain, classification, duration, and timestamp for each visit

## Testing Instructions

### 1. Apply Database Migration

Run the new migration to fix the schema:

```bash
# If using Supabase CLI
supabase db reset

# Or apply the specific migration
supabase migration up
```

### 2. Reload Extension

1. Go to `chrome://extensions/`
2. Find "BehaviorIQ" extension
3. Click reload 🔄

### 3. Test Website Visit Tracking

1. **Start a session** from extension popup:
   - Task: "Testing website tracking"
   - Category: "Coding"
   - Duration: 10 minutes

2. **Browse different websites** during the session:
   - Visit github.com (should be classified as "productive")
   - Visit youtube.com (should be classified as "distracting")
   - Visit wikipedia.org (should be classified as "neutral")
   - Spend at least 10-15 seconds on each site

3. **Stop the session** from extension popup

4. **Wait for sync** (up to 5 minutes, or check console logs for sync completion)

5. **Check dashboard**:
   - Go to http://localhost:3000/dashboard/history
   - Find your completed session
   - Click to expand it
   - ✅ Should show "Websites Visited" section with all domains you visited
   - ✅ Each visit should show: domain, classification, duration, timestamp

### 4. Verify Data in Database

You can check the database directly:

```sql
-- Check if visits are being stored
SELECT * FROM website_visits ORDER BY created_at DESC LIMIT 10;

-- Check visits for a specific session
SELECT 
    wv.domain,
    wv.classification,
    wv.duration_seconds,
    wv.start_time
FROM website_visits wv
JOIN focus_sessions fs ON wv.session_id = fs.session_id
WHERE fs.task_name = 'Testing website tracking'
ORDER BY wv.start_time;
```

## Debugging

### If visits still don't show up:

1. **Check extension console** (`chrome://extensions/` → Details → Inspect views: service worker):
   ```javascript
   // Check if visits are being tracked
   chrome.storage.local.get(['websiteVisits'], (data) => {
       console.log('Website visits:', data.websiteVisits);
   });
   ```

2. **Check sync status**:
   - Look for "Sync error" or "Website visits sync error" in extension console
   - Check if `synced: true` is being set after sync

3. **Check API response**:
   - Open browser DevTools → Network tab
   - Filter for `/api/website-visits`
   - Check if POST request is successful (200 OK)
   - Check response: `{ success: true, syncedCount: X }`

4. **Check database**:
   - Verify `website_visits` table exists and has correct schema
   - Check if foreign key constraint is working (session_id must exist in focus_sessions)

## Files Modified

1. `backend/supabase/migrations/005_add_website_visits.sql` - Updated schema
2. `backend/supabase/migrations/006_fix_website_visits_schema.sql` - New migration to fix schema
3. `extension/src/background/tabTracker.ts` - Fixed visit ID generation

## Build Status

✅ Extension built successfully
✅ No TypeScript errors
✅ Database migration ready to apply

## Next Steps

1. Apply database migration
2. Reload extension
3. Test with a new session
4. Verify visits appear on dashboard
