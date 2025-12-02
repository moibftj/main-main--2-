# GitHub Copilot Instructions for Talk-To-My-Lawyer

> **Quick Reference for AI Assistants working with this codebase**
>
> For complete architectural details, see [ARCHITECTURE_REFERENCE.md](../ARCHITECTURE_REFERENCE.md)

---

## Critical Context

This is a **production-ready SaaS platform** with a complete implementation. Your role is to **extend, not rebuild**.

**Tech Stack:**
- Next.js 16 App Router + TypeScript
- Supabase (PostgreSQL + Auth + RLS)
- OpenAI GPT-4 via Vercel AI SDK
- Stripe for payments
- shadcn/ui components

---

## Quick Architecture Reference

### Core Structure

**Pages:** See [ARCHITECTURE_REFERENCE.md#pages--routes](../ARCHITECTURE_REFERENCE.md#pages--routes)
- Public: `/`, `/auth/*`
- Subscriber: `/dashboard/letters/*`, `/dashboard/subscription`
- Employee: `/dashboard/coupons`, `/dashboard/commissions`
- Admin: `/secure-admin-gateway/*` (separate auth)

**API Endpoints:** See [ARCHITECTURE_REFERENCE.md#api-endpoints](../ARCHITECTURE_REFERENCE.md#api-endpoints)
- Letter operations: `/api/letters/[id]/{approve,reject,improve,pdf}`
- AI generation: `/api/generate-letter`
- Subscriptions: `/api/create-checkout`, `/api/verify-payment`
- Admin: `/api/admin-auth/login`, `/api/admin/super-user`

**Database:** See [ARCHITECTURE_REFERENCE.md#database-tables](../ARCHITECTURE_REFERENCE.md#database-tables)
- Tables: `profiles`, `letters`, `subscriptions`, `employee_coupons`, `commissions`, `letter_audit_trail`
- Functions: `check_letter_allowance()`, `log_letter_audit()`, `deduct_letter_allowance()`
- RLS policies enforce all access control

**Components:** See [ARCHITECTURE_REFERENCE.md#components](../ARCHITECTURE_REFERENCE.md#components)
- Admin: `components/admin/*`
- UI: `components/ui/*` (50+ shadcn components)

---

## Critical Rules

### 1. Authorization
```typescript
// ✅ CORRECT: Admin check
if (profile.role !== 'admin') return unauthorized

// ❌ WRONG: Never use is_super_user for authorization
if (!profile.is_super_user) return unauthorized  // is_super_user is business logic, not auth
```

**Key Distinction:**
- `role = 'admin'` → Authorization (who can access admin features)
- `is_super_user = true` → Business logic (unlimited letter allowance)

### 2. AI Integration
```typescript
// ✅ CORRECT: Use Vercel AI SDK
import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"

const { text } = await generateText({
  model: openai("gpt-4-turbo"),
  system: "You are a professional legal attorney...",
  prompt: userPrompt,
  temperature: 0.7,
  maxTokens: 2048
})

// ❌ WRONG: Never call OpenAI directly
fetch("https://api.openai.com/v1/chat/completions", ...)  // Never do this
```

### 3. Database Operations
```typescript
// ✅ CORRECT: Use database functions
const { data } = await supabase.rpc('check_letter_allowance', { u_id: userId })

// ✅ CORRECT: Log audit trail
await supabase.rpc('log_letter_audit', {
  p_letter_id: letterId,
  p_action: 'approved',
  p_old_status: 'pending_review',
  p_new_status: 'approved',
  p_notes: 'Letter approved by admin'
})

// ❌ WRONG: Never bypass RLS
const { data } = await supabaseServiceRole.from('letters').select('*')  // Don't bypass RLS
```

### 4. Admin Routes
```typescript
// ✅ CORRECT: All admin pages under /secure-admin-gateway
app/secure-admin-gateway/dashboard/...

// ❌ WRONG: Never create routes under /dashboard/admin (legacy, blocked)
app/dashboard/admin/...  // This path is blocked by middleware
```

---

## Common Patterns

### API Route Pattern
```typescript
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    // 1. Auth check
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 2. Role check (if needed)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // 3. Business logic
    // ...

    // 4. Success response
    return NextResponse.json({ success: true, data: result })

  } catch (error) {
    console.error('[API] Error:', error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
```

### Server Component Auth Pattern
```typescript
import { getUser } from "@/lib/auth/get-user"

export default async function Page() {
  const { session, profile } = await getUser()
  // User is guaranteed authenticated here (redirects to login if not)

  return <div>Hello {profile.full_name}</div>
}
```

### Admin API Guard Pattern
```typescript
import { requireAdminAuth } from "@/lib/auth/admin-guard"

export async function POST(request: Request) {
  const authError = await requireAdminAuth()
  if (authError) return authError

  // Admin-only logic here
}
```

---

## Letter Lifecycle

```
User Creates → draft
    ↓
AI Generates → generating
    ↓ (success)
Pending Review → pending_review
    ↓
Admin Opens → under_review
    ↓
Admin Decision:
    ├→ Approve → approved → completed
    └→ Reject → rejected (user can resubmit)

Errors → failed
```

**Status Types:** `draft | generating | pending_review | under_review | approved | completed | rejected | failed`

---

## Key Business Rules

1. **Free Trial:** First letter is free (no subscription required)
2. **Super Users:** `is_super_user = true` grants unlimited letters (business logic, NOT authorization)
3. **Employee Isolation:** Employees CANNOT access letter content (RLS enforced)
4. **Mandatory Review:** All letters must be admin-approved before subscriber access
5. **Audit Trail:** Every letter status change must be logged via `log_letter_audit()`
6. **Commission Rate:** 5% of subscription amount
7. **Employee Coupon Discount:** 20%
8. **Monthly Reset:** Subscription allowances reset on 1st of month (cron job)

---

## Environment Variables

See [ARCHITECTURE_REFERENCE.md#environment-variables](../ARCHITECTURE_REFERENCE.md#environment-variables)

**Required:**
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_PORTAL_KEY`
- `NEXT_PUBLIC_APP_URL`
- `CRON_SECRET`

---

## Extension Guidelines

### ✅ DO THIS:
- Add new API endpoints in `app/api/`
- Create new components in `components/` following existing patterns
- Add new pages under existing route groups
- Extend database schema with NEW migrations in `supabase/migrations/`
- Wire up incomplete features
- Add validation and error handling to existing functions
- Use existing UI components from `components/ui/`

### ❌ DON'T DO THIS:
- Create new `/src` folder or reorganize existing structure
- Replace shadcn/ui with a different UI library
- Drop and recreate existing database tables
- Rewrite working features "to make them better"
- Create routes under `/app/dashboard/admin` (use `/secure-admin-gateway`)
- Add new admin roles (single admin only)
- Use `is_super_user` for authorization (it's for business logic only)
- Bypass RLS policies
- Call OpenAI directly (always use Vercel AI SDK)

---

## Before Writing Code

1. **Search** for similar existing functionality
2. **Read** the relevant section in [ARCHITECTURE_REFERENCE.md](../ARCHITECTURE_REFERENCE.md)
3. **Copy** the patterns you find (imports, error handling, typing)
4. **Extend** with your specific logic
5. **Stay consistent** with the rest of the codebase

---

## Additional Documentation

- **[ARCHITECTURE_REFERENCE.md](../ARCHITECTURE_REFERENCE.md)** - Complete structural inventory
- **[CLAUDE.md](../CLAUDE.md)** - Comprehensive development guide
- **[DATABASE_FUNCTIONS.md](../DATABASE_FUNCTIONS.md)** - Database function reference
- **[PLATFORM_ARCHITECTURE.md](../PLATFORM_ARCHITECTURE.md)** - Detailed architecture documentation
- **[FREE_TRIAL_IMPLEMENTATION.md](../FREE_TRIAL_IMPLEMENTATION.md)** - Free trial system guide
- **[SECURITY_CHECKLIST.md](../SECURITY_CHECKLIST.md)** - Security guidelines

---

## Summary: Key Principles

1. **Extend, never reconstruct** – Work within existing architecture
2. **Single admin only** – Never create multiple admin users or roles
3. **`is_super_user` is business logic, not authorization** – Use `role = 'admin'` for auth
4. **AI via Vercel AI SDK** – Use `@ai-sdk/openai` in Next.js API routes only
5. **Pattern matching** – Find similar code and follow its patterns
6. **RLS on everything** – Enforce security at database level
7. **Audit trail** – Log all important actions via `log_letter_audit()`
8. **Validate input** – Never trust client data
9. **Use GPT-4 Turbo** – For all legal content generation
10. **Keep it simple** – Don't over-engineer solutions

---

**When in doubt, check [ARCHITECTURE_REFERENCE.md](../ARCHITECTURE_REFERENCE.md) first.**
