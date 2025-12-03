# Talk-To-My-Lawyer - Copilot Instructions

> AI-powered legal letter SaaS. Full reference: see consolidated documentation in project root.

## Core Workflow
```
User → Letter Form → AI Draft (GPT-4 Turbo) → Admin Review → Approved PDF
```

## Tech Stack
Next.js 16 (App Router, React 19) | Supabase (Postgres + RLS) | OpenAI via Vercel AI SDK | Stripe | pnpm

## Role Authorization (Critical)

| Role | Access | Constraint |
|------|--------|------------|
| `subscriber` | Own letters, subscription | First letter free, then credits |
| `employee` | Own coupons, commissions | **NO letter access** (RLS enforced) |
| `admin` | `/secure-admin-gateway/*` | Env-based auth + portal key |

> ⚠️ `is_super_user` = unlimited letters, NOT admin privilege

## Supabase Client Pattern
```typescript
// Server (API routes, server components)
import { createClient } from "@/lib/supabase/server"
const supabase = await createClient()

// Client components only
import { createClient } from "@/lib/supabase/client"
```

## API Route Pattern
```typescript
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  // RLS enforces row-level access automatically
}
```

## Letter Status Flow
`draft` → `generating` → `pending_review` → `under_review` → `approved`/`rejected` → `completed`

Always audit status changes:
```typescript
await supabase.rpc('log_letter_audit', { p_letter_id, p_action, p_old_status, p_new_status, p_notes })
```

## Key Database Functions
- `check_letter_allowance(u_id)` → `{has_allowance, remaining, plan_name, is_super}`
- `deduct_letter_allowance(u_id)` → boolean (call after generation)
- `validate_coupon(code)` → validates employee coupon

## Commands
```bash
pnpm install && pnpm dev    # Development at localhost:3000
pnpm build                  # Must pass before deploy
pnpm lint                   # ESLint check
```

## Security Rules
1. **RLS mandatory** - Never bypass with service role in user-facing code
2. **Employee isolation** - No letter content access (business requirement)
3. **Admin auth** - Separate system via `lib/auth/admin-session.ts` (30min timeout)

## Common Patterns
- Free trial: `count === 0` letters check before requiring subscription
- UI: shadcn/ui from `@/components/ui/*`, toast via `sonner`
- Admin routes: Verify with `isAdminAuthenticated()` from `lib/auth/admin-session.ts`
