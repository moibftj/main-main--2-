#!/bin/bash
# Auto-commit script for quick commits
# Usage: ./auto-commit.sh "Your commit message"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default commit message
MESSAGE="${1:-Auto-commit: $(date '+%Y-%m-%d %H:%M:%S')}"

echo -e "${BLUE}🔄 Checking for changes...${NC}"

# Add all changes
git add -A

# Check if there are changes to commit
if git diff --staged --quiet; then
    echo -e "${GREEN}✅ No changes to commit${NC}"
    exit 0
fi

# Show what will be committed
echo -e "${BLUE}📝 Changes to commit:${NC}"
git status --short

# Commit
echo -e "${BLUE}💾 Committing changes...${NC}"
git commit -m "$MESSAGE"

# Push
echo -e "${BLUE}🚀 Pushing to origin...${NC}"
git push origin main

echo -e "${GREEN}✅ Done!${NC}"
