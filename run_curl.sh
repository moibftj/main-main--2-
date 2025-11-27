#!/bin/bash

# Read environment variables
source <(grep -E "^NEXT_PUBLIC_SUPABASE_URL=|^SUPABASE_SERVICE_ROLE_KEY=" .env.local)

# Extract the project ref from the URL
PROJECT_REF=$(echo $NEXT_PUBLIC_SUPABASE_URL | cut -d'.' -f1 | cut -d'/' -f3)

echo "Project Ref: $PROJECT_REF"
echo "Applying migration to fix search_path..."

# Read the migration SQL
MIGRATION_SQL=$(cat scripts/012_fix_search_path_add_letter_allowances.sql)

# Escape the SQL for JSON
ESCAPED_SQL=$(echo "$MIGRATION_SQL" | sed 's/"/\\"/g' | tr '\n' '\\n')

echo "Executing SQL..."
echo "---"

# Use the Supabase SQL execution endpoint
curl -X POST "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" \
  -H "Authorization: Bearer sbp_f68a433be9db029bfe87ba6f9e86da4d71829479" \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"$ESCAPED_SQL\"
  }"

echo -e "\n---"
echo "Migration executed!"