# Quick Start Guide - BehaviorIQ

## 🚀 Get Your Project Running in 5 Steps

### Step 1: Setup Database (5 minutes)

1. Open Supabase Dashboard → **SQL Editor**
2. Copy entire contents of `COMPLETE_MIGRATION.sql`
3. Paste and click **Run**
4. Go to **Table Editor** → verify `users` table has data
5. If no users yet, they'll appear automatically on next signup

**Detailed instructions:** See `DATABASE_SETUP_INSTRUCTIONS.md`

---

### Step 2: Configure Environment Variables

#### Root .env file
```bash
# Create .env in project root
cat > .env << EOF
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
EOF

# Copy to frontend directory (Next.js requires it there)
cp .env frontend/.env
```

Get these values from: Supabase Dashboard → Settings → API

**Note:** The project uses a single `.env` file at the root, which is copied to `frontend/.env` for Next.js to read.

---

### Step 3: Build Extension

```bash
cd extension
npm install
npm run build
```

**Load in Chrome:**
1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select `extension/dist` folder

---

### Step 4: Start Dashboard

```bash
cd frontend
npm install
npm run dev
```

Dashboard will be at: `http://localhost:3000`

---

### Step 5: Test the Flow

1. **Signup:**
   - Go to `http://localhost:3000/signup`
   - Create test account
   - Verify user appears in Supabase Table Editor → users

2. **Start Session:**
   - Click extension icon in Chrome
   - Enter task name (e.g., "Testing BehaviorIQ")
   - Select category and duration
   - Click "Start Focus Session"

3. **Verify 3-Way Sync:**
   - **Popup:** Should show timer counting down
   - **Focus Page:** Go to `http://localhost:3000/dashboard/focus` - should show same timer
   - **Overview Page:** Go to `http://localhost:3000/dashboard` - should show active session banner

4. **Check Database:**
   - Supabase → Table Editor → focus_sessions
   - Should see your session with status 'in_progress'
   - Table Editor → tab_events
   - Should see events being recorded

5. **Stop Session:**
   - Click "Stop" in popup
   - Session should disappear from all 3 places
   - Database should show status 'completed'

---

## ✅ Success Indicators

You'll know everything is working when:

- [ ] Users appear in Table Editor (not just Authentication)
- [ ] Extension popup shows timer
- [ ] Focus page shows same timer
- [ ] Overview page shows active session banner
- [ ] All 3 timers are synced (same countdown)
- [ ] Sessions appear in focus_sessions table
- [ ] Tab events appear in tab_events table
- [ ] Stopping session updates database

---

## 🐛 Troubleshooting

### Users not in Table Editor
→ Run `COMPLETE_MIGRATION.sql` again
→ Check SQL Editor for errors

### Extension not starting sessions
→ Check browser console (F12) for errors
→ Verify extension is loaded in chrome://extensions/
→ Rebuild extension: `cd extension && npm run build`

### Dashboard not showing active session
→ Check frontend console for errors
→ Verify environment variables in .env and frontend/.env
→ Check Network tab - should see /api/sessions/active polling

### Sessions not in database
→ Check extension is logged in (popup should show user data)
→ Check browser console for sync errors
→ Verify user exists in users table first

---

## 📁 Important Files

- `COMPLETE_MIGRATION.sql` - Run this in Supabase SQL Editor
- `DATABASE_SETUP_INSTRUCTIONS.md` - Detailed database setup
- `SESSION_7_FIXES.md` - What we fixed in this session
- `TESTING_GUIDE.md` - Comprehensive testing instructions
- `COMPLETE_FIX_CHECKLIST.md` - Full project roadmap

---

## 🎯 What's Working Now

✅ User signup creates rows in both auth.users and public.users
✅ Email verification disabled (for testing)
✅ Extension popup starts/stops sessions
✅ Sessions sync to database in real-time
✅ 3-way sync: Popup ↔ Focus Page ↔ Overview Page
✅ Tab tracking records visited websites
✅ All timers show same countdown

---

## 🚧 Next Phase

### Phase 3: Display Visited Websites
- Show list of domains visited during session
- Display time spent per domain
- Show classification colors

### Phase 4: Google Stitch Design
- Redesign popup with Stitch MCP
- Redesign dashboard pages
- Make UI more interactive and engaging

### Phase 5: Production Ready
- Re-enable email verification
- Add session pause/resume
- Add manual editing features
- Add website classification editing
- Deploy to production

---

## 💡 Tips

- **Keep browser console open** while testing (F12)
- **Check Supabase logs** if API calls fail
- **Reload extension** after rebuilding (chrome://extensions/)
- **Clear chrome.storage** if data gets corrupted (DevTools → Application → Storage)
- **Use incognito** for testing fresh user experience

---

## 📞 Need Help?

Check these files for detailed info:
- Database issues → `DATABASE_SETUP_INSTRUCTIONS.md`
- Testing → `TESTING_GUIDE.md`
- Architecture → `PROJECT_COMPREHENSIVE_ANALYSIS.md`
- Security → `VULNERABILITIES_AND_MISSING_EDGES.md`
