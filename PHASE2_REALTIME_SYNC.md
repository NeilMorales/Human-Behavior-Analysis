# Phase 2: Real-Time 3-Way Sync Implementation

**Goal:** Sync timer across Popup, Focus Page, and Overview Page

---

## ARCHITECTURE

```
Extension Popup (reads every 1 sec)
        ↓
chrome.storage.local (source of truth)
        ↑
Background Script (updates storage)
        ↓
Syncs to Supabase every 5 min
        ↓
Dashboard API (polls every 5 sec)
        ↓
Focus Page + Overview Page
```

---

## IMPLEMENTATION PLAN

### Step 1: Create Active Session API Route
### Step 2: Add Polling Hook in Dashboard
### Step 3: Update Focus Page with Live Timer
### Step 4: Update Overview Page with Live Timer
### Step 5: Ensure Tab Tracking Works

Let's implement each step...
