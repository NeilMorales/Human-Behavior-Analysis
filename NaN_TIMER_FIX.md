# NaN:NaN Timer Fix

## What Was Wrong

The polling code in `extension/src/background/index.ts` was only mapping some fields when syncing a session from the dashboard to the extension. The `FocusSession` type requires ALL fields to be present, but we were only setting a few, causing `undefined` values that displayed as `NaN:NaN` in the timer.

## The Fix

Updated the polling code to map ALL required fields from the database response (snake_case) to the extension storage format (camelCase):

```typescript
activeSession: {
    id: remoteSession.session_id,
    userId: remoteSession.user_id,
    taskName: remoteSession.task_name,
    category: remoteSession.category,
    mode: remoteSession.mode || 'free',
    plannedDuration: remoteSession.planned_duration,
    startTime: new Date(remoteSession.start_time).getTime(),
    endTime: null,
    actualDuration: null,
    status: remoteSession.status || 'in_progress',
    idleTimeDuring: 0,
    interruptionCount: 0,
    notes: null,
    selfRating: null,
    focusScore: null,
    synced: true,
}
```

## Testing Instructions

1. **Reload the extension** in Chrome:
   - Go to `chrome://extensions/`
   - Find "BehaviorIQ" extension
   - Click the reload icon 🔄

2. **Test Dashboard → Extension Sync**:
   - Make sure frontend is running: `cd frontend && npm run dev`
   - Open extension popup (should show no active session)
   - Go to http://localhost:3000/dashboard/focus
   - Select a category (e.g., "Coding")
   - Set duration (e.g., 25 minutes)
   - Click "Start Focus Session"
   - Wait up to 30 seconds
   - Open extension popup again
   - ✅ Timer should now show correctly (e.g., "25:00" counting down)
   - ✅ Task name and category should display

3. **Test Extension → Dashboard Sync**:
   - Start a session from extension popup
   - Go to dashboard Focus page
   - ✅ Should immediately show the active session

## Build Status

✅ Extension built successfully
✅ No TypeScript errors
✅ All fields properly mapped

## Files Modified

- `extension/src/background/index.ts` - Fixed field mapping in polling logic
