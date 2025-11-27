# GitHub Copilot Instructions

## Project Overview

Talk-To-My-Lawyer is a SaaS platform for AI-generated legal letters with **mandatory professional attorney review**. The system has three distinct user roles with strictly enforced access boundaries and a separate admin portal for review workflow.

**Stack**: Next.js 16 (App Router) + Supabase (PostgreSQL) + OpenAI GPT-4 + Stripe

## Critical Architecture Principles

### 1. **Separate Admin Portal Authentication**
Admin review workflow uses **separate authentication system** from regular users:
- Portal location: `/secure-admin-gateway` (configurable via `ADMIN_PORTAL_ROUTE`)
- Authentication: Environment-based credentials (not database), see `/lib/auth/admin-session.ts`
- Session: Custom httpOnly cookie with 30-minute timeout
- Never merge with regular user auth - they are intentionally isolated

### 2. **Row-Level Security (RLS) is Sacred**
All data access goes through RLS policies - never bypass with service role key in client code:
- **Employees**: NO ACCESS to letter content (business requirement, see `scripts/002_setup_rls.sql`)
- **Subscribers**: Only own letters, subscriptions, and transactions
- **Admins**: Full access via admin portal only

### 3. **Audit Trail Everything**
All letter status changes MUST call `log_letter_audit()` RPC function:
```typescript
await supabase.rpc('log_letter_audit', {
  p_letter_id: letterId,
  p_action: 'approved',
  p_old_status: 'under_review',
  p_new_status: 'approved',
  p_notes: 'Approved after AI improvements'
})
```

### 4. **Letter Status Flow**
```
draft → generating → pending_review → under_review → approved/rejected → completed
```
- `generating`: OpenAI API call in progress
- `pending_review`: Awaiting admin review (FIFO queue)
- `under_review`: Admin actively reviewing
- `approved`: Ready for subscriber download
- `rejected`: Needs subscriber revision

## Development Patterns

### Authentication Approach

**Server Components** (preferred):
```typescript
import { getUser } from '@/lib/auth/get-user'

// Auto-redirects to /auth/login if not authenticated
const { session, profile } = await getUser()
```

**Admin Portal Routes** (separate auth):
```typescript
import { verifyAdminSession } from '@/lib/auth/admin-session'

const session = await verifyAdminSession()
if (!session) redirect('/secure-admin-gateway/login')
```

### API Route Structure

Always follow this pattern (`/app/api/generate-letter/route.ts` is canonical):
```typescript
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // 1. Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 2. Role check (if needed)
    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", user.id).single()

    // 3. Business logic with RLS protection
    // 4. Audit logging for letter changes
    // 5. Error handling with console.error prefix: "[FeatureName]"
    
  } catch (error: any) {
    console.error("[FeatureName] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

### Database Function Usage

**Letter Credit Management**:
```typescript
// Check allowance (non-destructive)
const { data } = await supabase.rpc('check_letter_allowance', { u_id: user.id })

// Deduct credit (handles super_user bypass automatically)
const { data: canDeduct } = await supabase.rpc('deduct_letter_allowance', { u_id: user.id })
```

See `DATABASE_FUNCTIONS.md` for complete function reference.

### Free Trial Logic

First letter is always free - check in `generate-letter/route.ts`:
```typescript
const { count } = await supabase
  .from("letters")
  .select("*", { count: "exact", head: true })
  .eq("user_id", user.id)

const isFreeTrial = (count || 0) === 0
// Skip allowance check and deduction for free trial
```

### Component Patterns

**Client Components** use shadcn/ui (50+ components in `components/ui/`):
```typescript
"use client"

import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { toast } from "sonner" // For user notifications
```

**Rich Text Editing**: Use TipTap editor (`components/ui/rich-text-editor.tsx`) for letter content editing in admin review modal.

## Key Files & Their Purposes

| File | Purpose | Don't Touch If... |
|------|---------|-------------------|
| `/middleware.ts` | Route protection + admin portal auth | You're not changing access rules |
| `/lib/auth/admin-session.ts` | Admin portal session management | Admin auth is working |
| `/app/api/generate-letter/route.ts` | Letter generation flow | This is the canonical example |
| `/components/review-letter-modal.tsx` | Admin review UI with AI improvement | Review workflow is stable |
| `/scripts/002_setup_rls.sql` | Security policies | RLS is working correctly |

## Database Migrations

Always create numbered SQL files in `/scripts/` directory:
```
012_descriptive_name.sql
```

Every new table MUST have:
1. RLS enabled: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
2. Policies for each role (subscriber/employee/admin)
3. Updated types in `lib/database.types.ts`

## Common Pitfalls

❌ **Don't**:
- Let employees access letter content (violates business rules)
- Skip audit logging on letter status changes
- Use service role key in client-accessible code
- Bypass RLS with raw queries
- Merge admin portal auth with regular user auth
- Use `any` types (TypeScript strict mode enabled)

✅ **Do**:
- Check `is_super_user` flag for unlimited letter access
- Call `log_letter_audit()` for all letter modifications
- Use OpenAI `gpt-4-turbo` model (not `gpt-3.5` or `gpt-4`)
- Follow existing patterns before creating new ones
- Test with all three roles (subscriber/employee/admin)

## Testing Workflow

1. **Subscriber**: Create account → generate free trial letter → purchase plan → generate paid letter
2. **Admin**: Login to `/secure-admin-gateway` → review pending letters → use AI improve → approve/reject
3. **Employee**: View coupon dashboard → share coupon → track commissions
4. **Security**: Verify employee cannot access `/api/letters/[id]` endpoints for letter content

## Build & Deploy

```bash
# Development
npm run dev

# Production build (TypeScript errors ignored in build, see next.config.mjs)
npm run build

# Deployment: Vercel with environment variables from .env.example
```

**Cron Job Required**: Monthly subscription reset
```bash
# Runs 1st of each month
0 0 1 * * curl -X POST https://app.com/api/subscriptions/reset-monthly \
  -H "Authorization: Bearer $CRON_SECRET"
```

## AI Integration

**Letter Generation** (`/api/generate-letter`):
```typescript
import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"

const { text } = await generateText({
  model: openai("gpt-4-turbo"), // Must use gpt-4-turbo
  system: "You are a professional legal attorney...",
  prompt: buildPrompt(letterType, intakeData),
  temperature: 0.7,
  maxTokens: 2048,
})
```

**AI Improvement** (`/api/letters/[id]/improve`): Same pattern with additional instruction parameter.

## Documentation Reference

- `CLAUDE.md`: Complete codebase guide (most comprehensive)
- `PLATFORM_ARCHITECTURE.md`: Detailed workflow breakdowns
- `DATABASE_FUNCTIONS.md`: RPC function reference
- `MASTER_PLAN_ARCHITECTURE.md`: Implementation checklist
- `FREE_TRIAL_IMPLEMENTATION.md`: Free trial logic details
- `GEMINI_INTEGRATION.md`: AI integration patterns (now using OpenAI)

---

**When in doubt**: Read existing code in similar features before implementing. This codebase has consistent patterns - follow them.
