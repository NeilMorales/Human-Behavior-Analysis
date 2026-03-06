# Git Workflow Guide

## Repository Setup ✅

Your project is now on GitHub at:
**https://github.com/NeilMorales/Human-Behavior-Analysis**

## What Was Pushed

### Code
- ✅ Extension (Chrome MV3) - Complete source code
- ✅ Frontend (Next.js) - Complete dashboard
- ✅ Backend (Supabase) - All migration scripts

### Documentation
- ✅ README.md - Project overview
- ✅ QUICK_START_GUIDE.md - Setup instructions
- ✅ DATABASE_SETUP_INSTRUCTIONS.md - Database guide
- ✅ FINAL_TEST_INSTRUCTIONS.md - Testing guide
- ✅ ROOT_CAUSE_ANALYSIS.md - Technical deep dive
- ✅ All other documentation files

### Configuration
- ✅ .gitignore - Excludes node_modules, .env, build files
- ✅ Package files - All dependencies tracked
- ✅ TypeScript configs
- ✅ Build configs

## Regular Workflow

### Making Changes

1. **Check status:**
```bash
git status
```

2. **Add changes:**
```bash
# Add specific files
git add path/to/file

# Or add all changes
git add .
```

3. **Commit with message:**
```bash
git commit -m "Description of what you changed"
```

4. **Push to GitHub:**
```bash
git push origin main
```

### Example Workflow

```bash
# After making changes to extension
cd extension
npm run build

# Go back to root
cd ..

# Check what changed
git status

# Add and commit
git add extension/
git commit -m "Fix: Extension login form styling"

# Push to GitHub
git push origin main
```

## Commit Message Guidelines

### Good commit messages:
- `feat: Add session pause/resume functionality`
- `fix: Extension timer not syncing with dashboard`
- `docs: Update setup instructions`
- `refactor: Improve session manager code`
- `style: Update dashboard UI colors`

### Bad commit messages:
- `update`
- `changes`
- `fix stuff`
- `asdfasdf`

## Branches (Future)

For now, we're working directly on `main`. Later, you can use branches:

```bash
# Create feature branch
git checkout -b feature/session-pause

# Make changes, commit
git add .
git commit -m "feat: Add session pause button"

# Push branch
git push origin feature/session-pause

# Merge to main (on GitHub or locally)
git checkout main
git merge feature/session-pause
git push origin main
```

## Useful Commands

### View commit history
```bash
git log --oneline
```

### See what changed
```bash
git diff
```

### Undo uncommitted changes
```bash
# Undo changes to specific file
git checkout -- path/to/file

# Undo all changes
git reset --hard
```

### Pull latest from GitHub
```bash
git pull origin main
```

### Check remote URL
```bash
git remote -v
```

## What's Ignored (.gitignore)

These files are NOT pushed to GitHub:
- `node_modules/` - Dependencies (too large)
- `extension/dist/` - Built extension (generated)
- `frontend/.next/` - Built frontend (generated)
- `.env.local` - Environment variables (secrets)
- `.DS_Store` - Mac system files
- `.kiro/` - Kiro IDE settings

## Important Notes

### Environment Variables
Your `.env.local` file is NOT in GitHub (for security). When cloning on a new machine:

1. Clone the repo
2. Create `frontend/.env.local`
3. Add your Supabase keys

### Node Modules
After cloning, always run:
```bash
cd extension && npm install
cd ../frontend && npm install
```

### Build Files
After cloning, rebuild:
```bash
cd extension && npm run build
cd ../frontend && npm run build
```

## Current Status

- ✅ Initial commit pushed
- ✅ All code and documentation on GitHub
- ✅ Ready for regular development workflow
- ✅ .gitignore properly configured

## Next Steps

1. Continue development locally
2. Commit changes regularly
3. Push to GitHub frequently
4. Keep README.md updated with new features

## Troubleshooting

### "Permission denied" error
You may need to authenticate with GitHub:
```bash
# Use GitHub CLI
gh auth login

# Or use SSH keys
# See: https://docs.github.com/en/authentication
```

### "Merge conflict"
If you edit on GitHub and locally:
```bash
git pull origin main
# Resolve conflicts in files
git add .
git commit -m "Resolve merge conflicts"
git push origin main
```

### "Large files" error
If you accidentally try to commit large files:
```bash
# Remove from staging
git rm --cached path/to/large/file

# Add to .gitignore
echo "path/to/large/file" >> .gitignore

# Commit
git add .gitignore
git commit -m "Remove large file from tracking"
```

---

**Repository:** https://github.com/NeilMorales/Human-Behavior-Analysis
**Status:** Active development
**Last Push:** Initial commit with all current work
