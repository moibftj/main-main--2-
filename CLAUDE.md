# Talk-To-My-Lawyer - AI Assistant Guide

This document provides comprehensive guidance for AI assistants working with the Talk-To-My-Lawyer codebase. It explains the project structure, development workflows, coding conventions, and important context needed to effectively contribute to this project.

---

## Quick Reference: Complete Structural Inventory

**For a complete inventory of all pages, endpoints, database tables, functions, components, and schemas, see:**

📘 **[ARCHITECTURE_REFERENCE.md](./ARCHITECTURE_REFERENCE.md)** - Comprehensive structural reference

This architecture reference document contains:
- All page routes and their files
- All API endpoints with methods and purposes
- Complete database schema (tables, functions, triggers)
- All components and their locations
- TypeScript types and interfaces
- RLS policies and security rules
- External integrations (OpenAI, Stripe, Supabase)
- Environment variables

**Use the Architecture Reference when you need to:**
- Find a specific endpoint or route
- Look up database table schemas
- Check available database functions
- Locate component files
- Verify RLS policies
- Review integration details

---

## Project Overview

Talk-To-My-Lawyer is a production-ready SaaS platform that generates legal letters with AI assistance and professional attorney review. The platform enables users to create legally sound letters through an AI-powered workflow with mandatory human oversight.

### Core Business Model
- **Free Trial**: First letter is free for new subscribers
- **Single Letter**: $299 one-time purchase
- **Monthly Plan**: $299/month (4 letters included)
- **Yearly Plan**: $599/year (8 letters included)
- **Employee Program**: 20% discount coupons with 5% commission on sales

## Tech Stack

### Frontend
- **Framework**: Next.js 16 with App Router (React 19)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4.1+ with custom design system
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Icons**: Lucide React
- **Animations**: Motion (Framer Motion), tailwindcss-animate
- **Rich Text**: TipTap editor
- **State Management**: React hooks + Supabase real-time

### Backend
- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth with role-based access control
- **API**: Next.js API Routes (App Router)
- **AI Integration**: OpenAI GPT-4 via Vercel AI SDK
- **PDF Generation**: jsPDF
- **Payments**: Stripe (checkout + webhooks)

### Infrastructure
- **Hosting**: Vercel (recommended)
- **Database**: Supabase (PostgreSQL with RLS)
- **Environment**: Node.js 18+
- **Package Manager**: pnpm

## Project Structure

```
/
├── app/                          # Next.js 16 App Router
│   ├── api/                      # API routes
│   │   ├── admin-auth/           # Admin authentication endpoints
│   │   ├── generate-letter/      # AI letter generation
│   │   ├── letters/[id]/         # Letter CRUD operations
│   │   │   ├── approve/          # Admin approval
│   │   │   ├── improve/          # AI improvement
│   │   │   ├── pdf/              # PDF generation
│   │   │   ├── reject/           # Admin rejection
│   │   │   └── ...               # Other letter actions
│   │   ├── subscriptions/        # Subscription management
│   │   └── create-checkout/      # Stripe checkout
│   ├── auth/                     # Authentication pages
│   │   ├── login/
│   │   └── signup/
│   ├── dashboard/                # User dashboards
│   │   ├── admin/                # Admin-only pages
│   │   ├── letters/              # Letter management
│   │   ├── coupons/              # Employee coupons
│   │   └── subscription/         # Subscription management
│   ├── secure-admin-gateway/     # Separate admin portal
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Landing page
│   └── globals.css               # Global styles
│
├── components/
│   ├── admin/                    # Admin-specific components
│   └── ui/                       # shadcn/ui components (50+ components)
│
├── lib/
│   ├── auth/                     # Authentication utilities
│   │   ├── get-user.ts           # User session helper
│   │   ├── admin-guard.ts        # Admin auth guards
│   │   └── admin-session.ts      # Admin session management
│   ├── supabase/                 # Supabase configuration
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server client
│   │   └── middleware.ts         # Auth middleware
│   ├── database.types.ts         # TypeScript database types
│   ├── constants.ts              # App constants
│   ├── helpers.ts                # Utility functions
│   └── utils.ts                  # cn() helper + utilities
│
├── scripts/                      # Database migration scripts (run in order)
│   ├── 001_setup_schema.sql
│   ├── 002_setup_rls.sql
│   ├── 003_seed_data.sql
│   ├── 004_create_functions.sql
│   ├── 005_letter_allowance_system.sql
│   ├── 006_audit_trail.sql
│   ├── 007_add_missing_letter_statuses.sql
│   ├── 008_employee_coupon_auto_generation.sql
│   ├── 009_add_missing_subscription_fields.sql
│   ├── 010_add_missing_functions.sql
│   └── 011_security_hardening.sql
│
├── supabase/
│   ├── migrations/               # Supabase migration files
│   └── functions/                # Edge functions
│
├── public/                       # Static assets
├── styles/                       # Additional stylesheets
│
├── .env.example                  # Environment variable template
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── components.json               # shadcn/ui configuration
├── tailwind.config.js            # Tailwind configuration
└── middleware.ts                 # Next.js middleware (session refresh)
```

## Database Schema

### Core Tables

#### `profiles`
User accounts with role-based access control
```typescript
{
  id: string              // UUID, matches auth.users.id
  email: string           // User email
  full_name: string | null
  role: 'subscriber' | 'employee' | 'admin'
  is_super_user: boolean  // Super admin flag
  phone: string | null
  company_name: string | null
  created_at: string
  updated_at: string
}
```

#### `letters`
Legal letter documents with status workflow
```typescript
{
  id: string
  user_id: string                    // Foreign key to profiles
  title: string
  letter_type: string                // e.g., "Demand Letter", "Cease and Desist"
  status: LetterStatus               // See workflow below
  intake_data: Record<string, any>   // Form data from user
  ai_draft_content: string | null    // AI-generated draft
  final_content: string | null       // Admin-approved content
  reviewed_by: string | null         // Admin who reviewed
  reviewed_at: string | null
  review_notes: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}
```

**Letter Status Workflow:**
```
draft → generating → pending_review → under_review → approved → completed
                                                   ↘ rejected
```

#### `subscriptions`
User subscription management
```typescript
{
  id: string
  user_id: string
  plan: 'single' | 'monthly' | 'yearly'
  status: 'active' | 'canceled' | 'past_due'
  price: number
  discount: number                // Applied discount percentage
  coupon_code: string | null      // Employee coupon used
  employee_id: string | null      // Employee who referred
  credits_remaining: number       // Letter allowance
  created_at: string
  updated_at: string
  expires_at: string | null
}
```

#### `employee_coupons`
Employee referral discount codes
```typescript
{
  id: string
  employee_id: string             // Foreign key to profiles
  code: string                    // Unique coupon code (auto-generated)
  discount_percent: number        // Default: 20
  is_active: boolean
  usage_count: number
  created_at: string
}
```

#### `commissions`
Employee commission tracking
```typescript
{
  id: string
  employee_id: string
  subscription_id: string
  subscription_amount: number
  commission_rate: number         // Default: 5%
  commission_amount: number
  status: 'pending' | 'paid'
  created_at: string
  paid_at: string | null
}
```

#### `letter_audit_trail`
Complete audit logging for all letter actions
```typescript
{
  id: string
  letter_id: string
  performed_by: string            // User ID who performed action
  action: string                  // e.g., 'created', 'approved', 'rejected'
  old_status: string | null
  new_status: string | null
  notes: string | null
  created_at: string
}
```

### Database Functions

#### `deduct_letter_allowance(u_id: uuid)`
Deducts one letter credit from user's active subscription. Returns `true` if successful, `false` if no credits available.

#### `add_letter_allowances(u_id: uuid, amount: int)`
Adds letter credits to user's subscription.

#### `reset_monthly_allowances()`
Resets monthly letter allowances for all active subscriptions. Called via cron job on 1st of each month.

#### `log_letter_audit(p_letter_id: uuid, p_action: text, p_old_status: text, p_new_status: text, p_notes: text)`
Creates audit trail entry for letter status changes.

#### `validate_coupon(code: text)`
Validates employee coupon code and returns coupon details.

### Row Level Security (RLS)

**Critical Security Principle**: All database access is controlled via RLS policies. Direct database queries in code assume RLS is enforced.

#### Profile Access
- Subscribers: Can read/update own profile
- Employees: Can read/update own profile + view own coupons/commissions
- Admins: Can read all profiles, update roles

#### Letter Access
- Subscribers: Full access to own letters only
- Employees: **NO ACCESS** to any letter content (business requirement)
- Admins: Full access to all letters

#### Subscription Access
- Subscribers: Read own subscriptions
- Employees: No direct access (only via commission records)
- Admins: Read all subscriptions

## Development Workflows

### Adding New Features

1. **Understand the Role Context**: Determine which user role(s) will use the feature (subscriber/employee/admin)
2. **Check RLS Policies**: Ensure database access patterns align with RLS policies
3. **Follow Existing Patterns**: Match the code structure of similar features
4. **Add Audit Logging**: For any letter status changes, use `log_letter_audit()`
5. **Update Types**: Add/modify types in `lib/database.types.ts` if needed
6. **Test All Roles**: Verify feature works correctly for all applicable user roles

### Database Changes

1. **Create Migration Script**: Add numbered SQL file to `/scripts/` directory
2. **Follow Naming Convention**: `###_descriptive_name.sql` (e.g., `012_add_letter_templates.sql`)
3. **Include RLS Policies**: Every new table MUST have RLS policies defined
4. **Test Locally**: Run migration against local Supabase instance
5. **Update Types**: Regenerate TypeScript types if schema changed
6. **Document Functions**: Add new database functions to `DATABASE_FUNCTIONS.md`

### API Route Development

#### Standard API Route Pattern

```typescript
// app/api/feature/route.ts
import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. Authentication Check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 2. Role Check (if needed)
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // 3. Input Validation
    const body = await request.json()
    // Validate body fields...

    // 4. Business Logic
    // ... your logic here ...

    // 5. Response
    return NextResponse.json({ success: true, data: result })

  } catch (error: any) {
    console.error("[Feature] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

#### Admin API Routes

For admin-only endpoints, use the admin guard:

```typescript
import { requireAdminAuth } from "@/lib/auth/admin-guard"

export async function POST(request: NextRequest) {
  // Check admin authentication
  const authError = await requireAdminAuth()
  if (authError) return authError

  // Admin-only logic here...
}
```

### Component Development

#### Standard Component Pattern

```typescript
// components/feature/my-component.tsx
"use client" // Only if component uses hooks, events, or state

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface MyComponentProps {
  userId: string
  onSuccess?: () => void
}

export function MyComponent({ userId, onSuccess }: MyComponentProps) {
  const [loading, setLoading] = useState(false)

  const handleAction = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/feature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })

      if (!response.ok) throw new Error("Action failed")

      onSuccess?.()
    } catch (error) {
      console.error("Action error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <Button onClick={handleAction} disabled={loading}>
        {loading ? "Processing..." : "Action"}
      </Button>
    </Card>
  )
}
```

#### Using shadcn/ui Components

The project uses shadcn/ui components extensively. These are located in `components/ui/` and can be imported directly:

```typescript
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
```

**Available Components**: 50+ pre-built components including buttons, cards, dialogs, forms, tables, tooltips, and more. Check `components/ui/` for full list.

### Authentication Patterns

#### Server Components (Recommended)

```typescript
import { getUser } from "@/lib/auth/get-user"

export default async function Page() {
  const { session, profile } = await getUser()

  // User is guaranteed to be authenticated here
  // If not authenticated, getUser() redirects to /auth/login

  return <div>Hello {profile.full_name}</div>
}
```

#### Client Components

```typescript
"use client"

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"

export function ClientComponent() {
  const [user, setUser] = useState(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })
  }, [])

  // ... component logic
}
```

### AI Integration

The platform uses OpenAI GPT-4 for letter generation and improvement via the Vercel AI SDK.

#### Letter Generation Pattern

```typescript
import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"

const { text } = await generateText({
  model: openai("gpt-4-turbo"),
  system: "You are a professional legal attorney...",
  prompt: "Draft a letter...",
  temperature: 0.7,
  maxTokens: 2048,
})
```

**Important**: Always use `gpt-4-turbo` for legal content generation to ensure quality and accuracy.

## Coding Conventions

### TypeScript

- **Strict Mode Enabled**: All code must pass TypeScript strict checks
- **No `any` Types**: Use proper types or `unknown` with type guards
- **Interface over Type**: Prefer `interface` for object shapes
- **Explicit Return Types**: Always specify return types for functions

### Naming Conventions

- **Components**: PascalCase (e.g., `LetterReviewInterface`)
- **Files**: kebab-case (e.g., `letter-review-interface.tsx`)
- **Functions**: camelCase (e.g., `generateLetter()`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_LETTERS_PER_MONTH`)
- **API Routes**: `route.ts` in named folders (Next.js convention)

### File Organization

- **Colocation**: Keep related components, types, and utilities together
- **Barrel Exports**: Use index files for cleaner imports when appropriate
- **Single Responsibility**: One component per file (except small sub-components)

### Import Order

```typescript
// 1. React/Next.js imports
import { useState } from "react"
import { redirect } from "next/navigation"

// 2. Third-party libraries
import { openai } from "@ai-sdk/openai"

// 3. Internal utilities
import { createClient } from "@/lib/supabase/server"
import { getUser } from "@/lib/auth/get-user"

// 4. Components
import { Button } from "@/components/ui/button"

// 5. Types
import type { Letter, Profile } from "@/lib/database.types"
```

### Error Handling

- **API Routes**: Return JSON with error message and appropriate status code
- **Components**: Use try-catch and display user-friendly error messages
- **Console Logging**: Prefix logs with feature name: `console.error("[FeatureName] Error:", error)`
- **User Feedback**: Use `toast` from `sonner` for user notifications

### Security Best Practices

1. **Never Bypass RLS**: Always use Supabase client, never direct SQL with service role key in client-accessible code
2. **Validate Inputs**: Sanitize and validate all user inputs on the server
3. **No Secrets in Client**: Only use `NEXT_PUBLIC_*` env vars in client components
4. **Admin Authentication**: Always verify admin role for admin operations
5. **Audit Trail**: Log all letter status changes using `log_letter_audit()`
6. **Employee Isolation**: Employees must NEVER access letter content

## Environment Setup

### Required Environment Variables

Create `.env.local` based on `.env.example`:

```bash
# Base URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Configuration
OPENAI_API_KEY=sk-...

# Security
CRON_SECRET=your-random-secret-key
```

### First-Time Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values

# 3. Run database migrations (in order)
# Use Supabase dashboard SQL editor or CLI
supabase db push scripts/001_setup_schema.sql
# ... continue with other scripts

# 4. Start development server
pnpm dev
```

### Database Setup

All database migrations are in the `/scripts/` directory and must be run in numerical order:

1. `001_setup_schema.sql` - Core table definitions
2. `002_setup_rls.sql` - Row Level Security policies
3. `003_seed_data.sql` - Initial data (test users, etc.)
4. `004_create_functions.sql` - Database functions
5. `005_letter_allowance_system.sql` - Subscription credit system
6. `006_audit_trail.sql` - Audit logging
7. `007_add_missing_letter_statuses.sql` - Letter status updates
8. `008_employee_coupon_auto_generation.sql` - Auto-generate employee coupons
9. `009_add_missing_subscription_fields.sql` - Subscription enhancements
10. `010_add_missing_functions.sql` - Additional database functions
11. `011_security_hardening.sql` - Security improvements

### Common Tasks

```bash
# Development
pnpm dev              # Start dev server (localhost:3000)
pnpm build            # Build for production
pnpm start            # Start production server
pnpm lint             # Run ESLint

# Git shortcuts (use with caution)
pnpm commit           # Stage all + commit with message
pnpm push             # Push to origin main
pnpm save             # Auto-commit with timestamp + push
```

## Testing & Quality Assurance

### Manual Testing Checklist

When implementing features, test with all user roles:

1. **Subscriber Role**
   - Can create letters
   - Can view own letters only
   - Cannot access admin pages
   - Letter credits deduct properly

2. **Employee Role**
   - Cannot access letter content
   - Can view own coupons and commissions
   - Cannot access admin pages
   - Coupon codes work correctly

3. **Admin Role**
   - Can access all letters
   - Can review and improve letters
   - Can manage users
   - Can view analytics

### Security Testing

- Verify RLS policies prevent unauthorized access
- Test with different user roles
- Ensure admin endpoints require authentication
- Check that employee coupons apply discounts correctly

## Deployment

### Vercel Deployment (Recommended)

1. Connect repository to Vercel
2. Add all environment variables in Vercel dashboard
3. Deploy

### Environment Variables (Production)

Ensure all variables from `.env.example` are set in Vercel:
- `NEXT_PUBLIC_APP_URL` (production domain)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `CRON_SECRET`

### Cron Jobs

Set up monthly subscription reset:

```bash
# Vercel Cron (preferred)
# Add to vercel.json:
{
  "crons": [{
    "path": "/api/subscriptions/reset-monthly",
    "schedule": "0 0 1 * *"
  }]
}

# Or manual cron:
0 0 1 * * curl -X POST https://your-domain.com/api/subscriptions/reset-monthly \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Important Notes for AI Assistants

### When Working with This Codebase

1. **Always Read First**: Read existing code before modifying. Understand patterns before suggesting changes.

2. **Security First**: This handles legal documents and payment data. Always consider security implications.

3. **Respect RLS**: Never suggest bypassing Row Level Security. If data access seems restricted, that's intentional.

4. **Audit Everything**: Letter status changes must be logged via `log_letter_audit()`.

5. **Employee Isolation**: Employees must NEVER see letter content. This is a core business requirement.

6. **Free Trial Logic**: First letter is always free. Check `count === 0` in letter generation flow.

7. **Admin Review Required**: All letters must go through admin review before completion. No exceptions.

8. **Type Safety**: Use TypeScript types from `lib/database.types.ts`. Don't use `any`.

9. **Error Messages**: Be user-friendly but don't expose internal implementation details.

10. **Test All Roles**: When modifying features, consider impact on all three user roles.

### Common Pitfalls to Avoid

- ❌ Don't bypass RLS policies
- ❌ Don't skip audit logging for letter changes
- ❌ Don't allow employees to access letter content
- ❌ Don't forget to check letter credits before generation
- ❌ Don't use service role key in client-accessible code
- ❌ Don't modify database schema without migration script
- ❌ Don't forget to update TypeScript types after schema changes
- ❌ Don't skip error handling in API routes
- ❌ Don't use `any` type in TypeScript
- ❌ Don't commit environment variables to Git

### When Making Changes

1. Understand the feature context and user role implications
2. Follow existing patterns in similar features
3. Maintain type safety throughout
4. Add comprehensive error handling
5. Test with all applicable user roles
6. Update documentation if adding new patterns
7. Ensure audit logging for any letter status changes

## Additional Documentation

- `README.md` - Project overview and quick start
- `PLATFORM_ARCHITECTURE.md` - Detailed architecture documentation
- `DATABASE_FUNCTIONS.md` - Database function reference
- `SECURITY_CHECKLIST.md` - Security guidelines and checklist
- `SUPABASE_DEPLOYMENT.md` - Supabase deployment guide
- `MANUAL_QA_SCRIPT.md` - Quality assurance testing guide

## Support & Resources

- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **shadcn/ui**: https://ui.shadcn.com
- **OpenAI API**: https://platform.openai.com/docs
- **Vercel AI SDK**: https://sdk.vercel.ai/docs

---

**Last Updated**: November 2025

**Project Status**: Production-ready with active development

**Key Contributors**: Development team actively maintaining and enhancing the platform
- this is pnpm install and pnpm run dev