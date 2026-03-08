# How to Start the Application

## The "Failed to fetch" error means the frontend server isn't running!

You need to start the frontend server for the extension to work.

## Start Frontend Server

Open a terminal and run:

```bash
cd frontend
npm run dev
```

Wait for:
```
✓ Ready in X ms
○ Local: http://localhost:3000
```

## Then Test Extension

1. Reload extension in Chrome (`chrome://extensions`)
2. Open extension popup
3. Try logging in again
4. Should work now!

## Keep Server Running

The frontend server MUST be running for:
- Extension login to work
- Extension to sync data
- Dashboard to be accessible
- API calls to succeed

## Alternative: Start Both Servers

If you also want the extension to auto-reload during development:

**Terminal 1 (Frontend):**
```bash
cd frontend
npm run dev
```

**Terminal 2 (Extension - optional):**
```bash
cd extension
npm run dev
```

Then reload extension in Chrome after any changes.

---

## Current Issue

Your frontend server is NOT running, so:
- Extension can't reach `http://localhost:3000/api/auth/login`
- That's why you see "Failed to fetch"

**Solution:** Start the frontend server with `cd frontend && npm run dev`
