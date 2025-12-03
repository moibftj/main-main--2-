# CLAUDE.md - AI Assistant Development Guide

> Quick reference for AI assistants. For full documentation, see consolidated docs in project root.

## Project Summary
**Talk-To-My-Lawyer**: AI-powered legal letter SaaS with mandatory attorney review.

```
User → Letter Form → AI Draft (GPT-4 Turbo) → Admin Review → PDF Download
```

## Tech Stack
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL + RLS + Auth), Stripe, OpenAI via Vercel AI SDK
- **Package Manager**: pnpm

---

## ⚠️ CRITICAL: Role Authorization

| Role | Access | Hard Constraint |
|------|--------|-----------------|
| `subscriber` | Own letters, subscription, profile | First letter free, then credits |
| `employee` | Own coupons, commissions only | **NEVER access letter content** |
| `admin` | Full access via `/secure-admin-gateway` | Env-based auth + portal key |

### is_super_user vs admin
```typescript
// ❌ WRONG - is_super_user is NOT admin
if (profile.is_super_user) { /* admin logic */ }

// ✅ CORRECT - is_super_user means unlimited letters ONLY
if (profile.is_super_user) { /* skip credit check */ }

// ✅ CORRECT - admin check
if (profile.role === 'admin') { /* admin logic */ }
```

---

## ⚠️ CRITICAL: Letter Status Workflow

```
draft → generating → pending_review → under_review → approved → completed
                                                   ↘ rejected
```

### Status Rules
- **Unapproved letters**: Content HIDDEN from subscriber (show "Under Review")
- **Approved letters**: Full content visible, PDF/email enabled
- **All transitions**: MUST log via `log_letter_audit()`

```typescript
// ALWAYS audit status changes
await supabase.rpc('log_letter_audit', {
  p_letter_id: letterId,
  p_action: 'approved',
  p_old_status: 'under_review',
  p_new_status: 'approved',
  p_notes: 'Approved by admin'
})
```

---

## ⚠️ CRITICAL: Supabase Client Usage

```typescript
// Server components/API routes - ALWAYS use server client
import { createClient } from "@/lib/supabase/server"
const supabase = await createClient()

// Client components ONLY
import { createClient } from "@/lib/supabase/client"
```

---

## API Route Pattern

```typescript
import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. Auth check
    const { data: { user }, error } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // 2. Role check (if needed)
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    // 3. Business logic (RLS auto-enforces access)
    
    // 4. Response
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error("[FeatureName] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

---

## Key Database Functions

| Function | Purpose |
|----------|---------|
| `check_letter_allowance(u_id)` | Returns `{has_allowance, remaining, plan_name, is_super}` |
| `deduct_letter_allowance(u_id)` | Deducts 1 credit, returns boolean |
| `log_letter_audit(...)` | Creates audit trail entry |
| `validate_coupon(code)` | Validates employee coupon |

---

## Project Structure (Key Paths)

```
app/api/generate-letter/     # AI letter generation
app/api/letters/[id]/        # approve, reject, improve, pdf, send-email
app/dashboard/               # Subscriber dashboard
app/secure-admin-gateway/    # Admin portal (separate auth)
lib/auth/admin-session.ts    # Admin session (30min timeout)
lib/supabase/server.ts       # Server Supabase client
scripts/001-011*.sql         # Database migrations (run in order)
```

---

## Commands

```bash
pnpm install    # Install dependencies
pnpm dev        # Development server (localhost:3000)
pnpm build      # Production build (must pass)
pnpm lint       # ESLint check
```

---

## Security Checklist

1. **RLS mandatory** - Never bypass with service role in user-facing code
2. **Employee isolation** - Employees NEVER see letter content
3. **Audit logging** - All letter status changes logged
4. **Admin auth** - Separate system, env-based credentials
5. **Secrets** - Never log API keys, use `process.env` only

---

## Common Gotchas

- **Free trial**: Check `count === 0` letters before requiring subscription
- **Letter credits**: Call `deduct_letter_allowance(u_id)` after generation
- **Admin routes**: Use `isAdminAuthenticated()` from `lib/auth/admin-session.ts`
- **UI components**: Use `@/components/ui/*` (shadcn/ui), toast via `sonner`
- **TypeScript**: Use types from `lib/database.types.ts`, no `any`
