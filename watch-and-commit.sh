#!/bin/bash
# Auto-commit watcher - commits changes automatically when files change
# Usage: ./watch-and-commit.sh

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}👀 Starting auto-commit watcher...${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop${NC}\n"

# Function to commit and push
commit_changes() {
    if ! git diff --quiet || ! git diff --cached --quiet; then
        echo -e "${BLUE}📝 Changes detected at $(date '+%H:%M:%S')${NC}"
        
        git add -A
        
        if ! git diff --staged --quiet; then
            TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
            git commit -m "Auto-commit: $TIMESTAMP"
            
            echo -e "${BLUE}🚀 Pushing changes...${NC}"
            git push origin main
            
            echo -e "${GREEN}✅ Changes committed and pushed!${NC}\n"
        fi
    fi
}

# Watch for changes every 30 seconds
while true; do
    commit_changes
    sleep 30
done
