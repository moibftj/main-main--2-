# Auto-Commit Configuration

I've set up several options for auto-committing your changes to Git:

## ✅ Option 1: Git Post-Commit Hook (Already Configured)
**What it does:** Automatically pushes to `origin/main` after every commit.

**How to use:**
```bash
git add .
git commit -m "Your message"
# Automatically pushes after commit!
```

---

## 🚀 Option 2: Quick Commit Script
**What it does:** Commits all changes with a custom or auto-generated message and pushes.

**How to use:**
```bash
# With custom message
./auto-commit.sh "Updated landing page"

# With auto-generated timestamp message
./auto-commit.sh
```

---

## 📦 Option 3: NPM Scripts (Easiest)
**What it does:** Use simple npm commands to commit and push.

**How to use:**
```bash
# Commit with custom message and push
npm run commit -- "Your message here" && npm run push

# Quick save with auto-generated message
npm run save
```

---

## 👀 Option 4: Auto-Watch Script
**What it does:** Continuously watches for file changes and auto-commits every 30 seconds.

**How to use:**
```bash
# Start watching (runs in foreground)
./watch-and-commit.sh

# Or run in background
./watch-and-commit.sh &

# Stop watching
# Press Ctrl+C (if foreground) or:
pkill -f watch-and-commit
```

**⚠️ Warning:** This will commit very frequently. Best for development sessions.

---

## 🎯 Recommended Workflow

For most cases, I recommend **Option 3 (NPM Scripts)**:

```bash
# When you want to save your work:
npm run save
```

This is the simplest and gives you control over when commits happen.

---

## 📝 Current Status

✅ All scripts are configured and ready to use!
✅ Post-commit hook is active
✅ NPM scripts added to package.json

---

## 🔧 Additional Commands

```bash
# Check git status
git status

# See commit history
git log --oneline -10

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Push current changes
git push origin main
```
