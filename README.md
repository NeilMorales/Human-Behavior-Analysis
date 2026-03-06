# BehaviorIQ - Human Behavior Analysis

A Chrome Extension + Next.js Dashboard for tracking browser behavior and productivity analysis.

## 🎯 Project Overview

BehaviorIQ helps users understand and improve their productivity by:
- Tracking browser activity and tab usage
- Running focused work sessions with timers
- Analyzing time spent on productive vs distracting websites
- Providing behavior scores and insights
- Syncing data across extension and web dashboard

## 🏗️ Architecture

### Tech Stack
- **Extension**: Chrome MV3, React, TypeScript, Vite
- **Dashboard**: Next.js 14, React, TypeScript, Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth

### Project Structure
```
├── extension/          # Chrome Extension (MV3)
│   ├── src/
│   │   ├── background/    # Service worker, session management
│   │   ├── popup/         # Extension popup UI
│   │   ├── content/       # Content scripts
│   │   └── shared/        # Shared utilities, types
│   └── dist/             # Built extension (gitignored)
│
├── frontend/          # Next.js Dashboard
│   ├── app/              # App router pages
│   ├── components/       # React components
│   ├── lib/              # Utilities, API clients
│   └── hooks/            # Custom React hooks
│
└── backend/           # Database
    └── supabase/
        └── migrations/   # SQL migrations
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Chrome browser
- Supabase account

### 1. Database Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor in Supabase Dashboard
3. Run the complete migration:
   ```sql
   -- Copy and paste contents of COMPLETE_MIGRATION.sql
   ```
4. Get your API keys from Settings → API

### 2. Frontend Setup

```bash
cd frontend
npm install

# Create .env.local file
cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
EOF

# Start development server
npm run dev
```

Dashboard will be at: `http://localhost:3000`

### 3. Extension Setup

```bash
cd extension
npm install
npm run build
```

**Load in Chrome:**
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension/dist` folder

### 4. Test the Flow

1. Click extension icon → Login/Signup
2. Start a focus session
3. Open dashboard → See active session
4. Verify 3-way sync (popup ↔ focus page ↔ overview page)

## 📚 Documentation

- **[QUICK_START_GUIDE.md](QUICK_START_GUIDE.md)** - 5-step setup guide
- **[DATABASE_SETUP_INSTRUCTIONS.md](DATABASE_SETUP_INSTRUCTIONS.md)** - Detailed database setup
- **[FINAL_TEST_INSTRUCTIONS.md](FINAL_TEST_INSTRUCTIONS.md)** - Testing guide
- **[ROOT_CAUSE_ANALYSIS.md](ROOT_CAUSE_ANALYSIS.md)** - Technical deep dive
- **[PROJECT_COMPREHENSIVE_ANALYSIS.md](PROJECT_COMPREHENSIVE_ANALYSIS.md)** - Full project analysis

## ✨ Features

### Extension
- ✅ Focus session timer with categories
- ✅ Tab tracking and website classification
- ✅ Idle detection
- ✅ Real-time sync to database
- ✅ Login/signup from popup
- ✅ Behavior score display

### Dashboard
- ✅ Overview page with behavior score
- ✅ Active session display (3-way sync)
- ✅ Focus mode page with live timer
- ✅ Session history
- ✅ Activity charts
- ✅ Settings management

### Database
- ✅ User management with RLS
- ✅ Focus sessions tracking
- ✅ Tab events logging
- ✅ Daily summaries
- ✅ Domain statistics
- ✅ Auto-create user on signup

## 🔧 Development

### Extension Development
```bash
cd extension
npm run dev    # Watch mode
npm run build  # Production build
```

### Dashboard Development
```bash
cd frontend
npm run dev    # Development server
npm run build  # Production build
```

### Database Migrations
New migrations go in `backend/supabase/migrations/`

## 🐛 Known Issues & Roadmap

### Current Status: ~50% Complete

**Working:**
- ✅ User authentication
- ✅ Session creation and tracking
- ✅ 3-way sync (extension ↔ dashboard)
- ✅ Tab tracking
- ✅ Database schema

**In Progress:**
- 🚧 Display visited websites in session details
- 🚧 Productivity score calculation
- 🚧 Manual session editing
- 🚧 Website classification editing

**Planned:**
- 📋 Session pause/resume
- 📋 Pomodoro mode
- 📋 Advanced analytics
- 📋 Achievement system
- 📋 Google Stitch UI redesign
- 📋 Email verification (re-enable for production)

See [COMPLETE_FIX_CHECKLIST.md](COMPLETE_FIX_CHECKLIST.md) for detailed roadmap.

## 🔐 Security Notes

- Email verification is **DISABLED** for testing
- Re-enable before production deployment
- Service role key should never be exposed client-side
- RLS policies protect user data

## 📝 Recent Changes

### Session 7 Fixes (Latest)
- Added extension login/signup UI
- Fixed user creation in database (auto-trigger)
- Implemented real-time 3-way sync
- Fixed session persistence
- Added active session display on overview page

See [SESSION_7_FIXES.md](SESSION_7_FIXES.md) for details.

## 🤝 Contributing

This is a semester project. For development:

1. Create a feature branch
2. Make changes
3. Test thoroughly
4. Push to main

## 📄 License

Private project - All rights reserved

## 👥 Team

- Developer: Pranshu
- Project: Human Behavior Analysis (Semester 6)

## 🆘 Support

If something isn't working:
1. Check [FINAL_TEST_INSTRUCTIONS.md](FINAL_TEST_INSTRUCTIONS.md)
2. Read [ROOT_CAUSE_ANALYSIS.md](ROOT_CAUSE_ANALYSIS.md)
3. Check browser console for errors
4. Verify all services are running

---

**Note:** This project is under active development. Some features may be incomplete or require additional testing.
