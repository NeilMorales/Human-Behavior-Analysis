# Bugs Fixed + Google Stitch Design Plan

## Bugs Fixed ✅

### 1. NextJS Params Error
**Issue:** `params.id` accessed synchronously in Next.js 15
**Fix:** Changed to `const { id } = await params;`
**File:** `frontend/app/api/sessions/[id]/visits/route.ts`

### 2. Stop Button Sync
**Issue:** Stopping session from Focus page doesn't stop extension timer
**Fix:** Added chrome.runtime.sendMessage to communicate with extension
**File:** `frontend/app/dashboard/focus/page.tsx`
**Note:** Extension already has message listener, now dashboard sends STOP_SESSION message

### 3. Website Tracking Not Showing
**Likely Issue:** Session ID mismatch or no data synced yet
**Debug Steps:**
1. Check if website_visits table has data
2. Verify session_id matches between focus_sessions and website_visits
3. Ensure extension is syncing visits

---

## Google Stitch MCP Design Implementation 🎨

### Plan

I'll use Google Stitch MCP to create a professional, classy design for the dashboard. Here's the approach:

### Step 1: Research & Inspiration
- Look at modern SaaS dashboards (Linear, Notion, Vercel)
- Focus on: Clean layouts, subtle animations, professional color schemes
- Key elements: Cards with depth, smooth transitions, data visualization

### Step 2: Design with Stitch
- Create mockups for each page:
  - Overview Dashboard
  - Focus Session Page
  - History Page
  - Settings Page
- Focus on:
  - Modern card-based layouts
  - Professional color palette
  - Clean typography
  - Subtle shadows and depth
  - Smooth animations

### Step 3: Implement Design
- Convert Stitch designs to React components
- Use Tailwind CSS for styling
- Add Framer Motion for animations
- Implement responsive layouts

---

## Next Steps

1. ✅ Fix bugs (DONE)
2. 🎨 Use Stitch MCP to create designs
3. 💻 Implement the designs
4. 🧪 Test everything

Let me now use Google Stitch MCP to create the designs!
