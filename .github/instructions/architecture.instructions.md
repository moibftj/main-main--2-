# Architecture Instructions for AI Assistants

> **Detailed architectural guidance for Talk-To-My-Lawyer development**
>
> See [ARCHITECTURE_REFERENCE.md](../../ARCHITECTURE_REFERENCE.md) for complete structural inventory

---

## Purpose

This document provides detailed instructions for working with the Talk-To-My-Lawyer architecture. It complements the [ARCHITECTURE_REFERENCE.md](../../ARCHITECTURE_REFERENCE.md) which contains the complete structural inventory.

---

## Architecture Overview

### Application Structure

```
Talk-To-My-Lawyer
├── Frontend: Next.js 16 App Router (React 19, TypeScript)
├── Backend: Next.js API Routes + Supabase PostgreSQL
├── Auth: Supabase Auth + Custom Admin Portal Auth
├── AI: OpenAI GPT-4 Turbo via Vercel AI SDK
├── Payments: Stripe Checkout + Webhooks
└── Deployment: Vercel + Supabase Cloud
```

### Three-Tier User System

**1. Subscribers**
- Can create and view their own letters
- Can manage their subscription
- First letter is free (free trial)
- Subsequent letters require active subscription with credits

**2. Employees**
- Cannot access any letter content (RLS enforced)
- Can view their coupon codes
- Can track their commissions
- Get 5% commission on referrals via their 20% discount coupons

**3. Admin** (Single user only)
- Reviews and approves/rejects all letters
- Can improve letters using AI
- Manages users (view/promote to super_user)
- Views analytics and commissions
- Separate authentication system (`/secure-admin-gateway`)

---

## Routing Architecture

### Route Structure

```
app/
├── page.tsx                          # Landing page (public)
├── auth/                             # Authentication (public)
│   ├── login/
│   ├── signup/
│   └── reset-password/
├── dashboard/                        # User dashboards (authenticated)
│   ├── letters/                      # Subscriber only
│   ├── subscription/                 # Subscriber only
│   ├── coupons/                      # Employee only
│   └── commissions/                  # Employee only
└── secure-admin-gateway/             # Admin portal (separate auth)
    ├── login/                        # Admin login
    └── dashboard/                    # Admin features
        ├── letters/                  # Review queue
        ├── all-letters/              # All letters
        ├── users/                    # User management
        ├── analytics/                # Analytics
        └── commissions/              # Commission management
```

### Route Protection

**Middleware (`middleware.ts` + `lib/supabase/middleware.ts`):**
1. Checks Supabase session for `/dashboard/*`
2. Checks admin session for `/secure-admin-gateway/*` (except `/login`)
3. Blocks legacy `/dashboard/admin/*` routes (redirects to `/dashboard`)
4. Performs role-based redirects

**Example Protection Flow:**
```typescript
// User tries to access /secure-admin-gateway/dashboard/letters
↓
Middleware checks admin session cookie
↓
If no valid admin session → redirect to /secure-admin-gateway/login
↓
If valid admin session → verifies role = 'admin' in database
↓
If role !== 'admin' → redirect to /dashboard
↓
If role === 'admin' → allow access
```

---

## API Architecture

### API Route Pattern

All API routes follow this structure:

```typescript
// app/api/[feature]/route.ts
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    // 1. Authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 2. Authorization (if needed)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // 3. Input validation
    const body = await request.json()
    if (!body.requiredField) {
      return NextResponse.json({ error: "Missing required field" }, { status: 400 })
    }

    // 4. Business logic
    const result = await performOperation(body)

    // 5. Audit logging (for letter operations)
    await supabase.rpc('log_letter_audit', {
      p_letter_id: letterId,
      p_action: 'operation_performed',
      p_notes: 'Operation details'
    })

    // 6. Success response
    return NextResponse.json({ success: true, data: result })

  } catch (error: any) {
    console.error('[API] Error:', error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
```

### API Endpoint Organization

**Letter Operations:** `/api/letters/[id]/`
- `submit` - Submit letter for review
- `start-review` - Start admin review
- `approve` - Approve letter
- `reject` - Reject letter
- `improve` - AI improve letter
- `pdf` - Generate PDF
- `send-email` - Send via email
- `audit` - Get audit trail

**Why this structure?**
- RESTful resource-based routing
- Each operation is atomic and focused
- Easy to add new operations
- Clear authorization per operation

---

## Database Architecture

### Schema Design Philosophy

1. **RLS First:** All security is enforced at database level
2. **Audit Everything:** Every important action is logged
3. **Immutable History:** Audit trail is append-only
4. **Automatic Timestamps:** Triggers update `updated_at` on all tables
5. **Referential Integrity:** Foreign keys enforce relationships

### Key Relationships

```
profiles (users)
    ├─→ letters (one-to-many)
    ├─→ subscriptions (one-to-many)
    ├─→ employee_coupons (one-to-many, employee only)
    └─→ commissions (one-to-many, employee only)

letters
    ├─→ letter_audit_trail (one-to-many)
    └─→ reviewed_by → profiles (many-to-one)

subscriptions
    ├─→ commissions (one-to-many)
    └─→ employee_id → profiles (many-to-one)

employee_coupons
    └─→ coupon_usage (one-to-many)
```

### Function Usage Patterns

**Check Allowance (before creating letter):**
```typescript
const { data } = await supabase.rpc('check_letter_allowance', { u_id: userId })
if (!data.has_allowance) {
  // User needs subscription
  return redirect('/dashboard/subscription')
}
```

**Deduct Allowance (when creating letter):**
```typescript
const { data: success } = await supabase.rpc('deduct_letter_allowance', { u_id: userId })
if (!success) {
  // Deduction failed
  return error('Insufficient letter credits')
}
```

**Log Audit Trail (on every status change):**
```typescript
await supabase.rpc('log_letter_audit', {
  p_letter_id: letterId,
  p_action: 'status_changed',
  p_old_status: 'pending_review',
  p_new_status: 'approved',
  p_notes: 'Letter approved by admin',
  p_metadata: { admin_notes: 'Looks good' }
})
```

### Migration Strategy

**Rules:**
1. Never modify existing migrations
2. Always create new migration for schema changes
3. Use descriptive names: `NNN_verb_noun.sql`
4. Test migrations locally before deploying
5. Include both up and down migrations
6. Document breaking changes

**Example Migration Pattern:**
```sql
-- Migration: 019_add_letter_templates.sql

-- Add new table
CREATE TABLE IF NOT EXISTS letter_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  letter_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE letter_templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "admins_can_manage_templates"
ON letter_templates FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "subscribers_can_view_templates"
ON letter_templates FOR SELECT
TO authenticated
USING (get_user_role(auth.uid()) IN ('subscriber', 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_letter_templates_updated_at
BEFORE UPDATE ON letter_templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

---

## Authentication Architecture

### Dual Authentication System

**System 1: Supabase Auth (Subscribers & Employees)**
- Email/password authentication
- Session stored in httpOnly cookies
- Automatic session refresh via middleware
- Role stored in `profiles.role`

**System 2: Custom Admin Auth (Admin Only)**
- Email + password + portal key
- Separate session cookie (`admin_session`)
- 30-minute timeout with activity refresh
- Credentials from environment variables

### Why Two Systems?

1. **Security:** Admin portal is completely isolated
2. **Flexibility:** Can change admin auth without affecting users
3. **Audit:** Separate session tracking for admin actions
4. **Simplicity:** No complex role hierarchies in Supabase Auth

### Authentication Flow Diagrams

**Subscriber Login:**
```
User enters email/password
    ↓
POST to Supabase Auth
    ↓
Session cookie created
    ↓
Middleware checks session
    ↓
Loads profile from database
    ↓
Redirect based on role:
    - subscriber → /dashboard/letters
    - employee → /dashboard/commissions
```

**Admin Login:**
```
Admin enters email + password + portal key
    ↓
POST to /api/admin-auth/login
    ↓
Verify against environment variables:
    - ADMIN_EMAIL
    - ADMIN_PASSWORD
    - ADMIN_PORTAL_KEY
    ↓
Create admin session cookie
    ↓
Middleware verifies admin session
    ↓
Load admin profile from database
    ↓
Verify role = 'admin'
    ↓
Redirect to /secure-admin-gateway/dashboard
```

---

## AI Integration Architecture

### OpenAI Integration via Vercel AI SDK

**Why Vercel AI SDK?**
- Type-safe end-to-end
- Built-in error handling
- Streaming support
- Easy to test and debug
- Single deployment pipeline
- No extra network hop

**Architecture:**
```
Client Request
    ↓
Next.js API Route
    ↓
Vercel AI SDK (generateText)
    ↓
OpenAI GPT-4 Turbo API
    ↓
Response
    ↓
Save to Database
    ↓
Update Letter Status
    ↓
Log Audit Trail
    ↓
Return to Client
```

### AI Prompt Engineering

**System Prompt Pattern:**
```typescript
system: `You are a professional legal attorney with expertise in [specific area].
Always:
- Use formal, professional legal language
- Include proper formatting (paragraphs, sections)
- Be specific and actionable
- Cite relevant laws when applicable
- Maintain professional tone throughout

Never:
- Use casual or informal language
- Make absolute guarantees
- Provide actual legal advice (only draft letters)
- Include placeholder text like [INSERT NAME]`
```

**User Prompt Pattern:**
```typescript
prompt: `Draft a ${letterType} letter with the following details:

Sender Information:
${senderDetails}

Recipient Information:
${recipientDetails}

Issue Description:
${issueDescription}

Desired Outcome:
${desiredOutcome}

Requirements:
- Professional legal tone
- 300-500 words
- Include deadline for response (14 days)
- Clear statement of consequences if not resolved
- Proper letter formatting`
```

### AI Error Handling

**Always include comprehensive error handling:**
```typescript
try {
  // Validate API key is configured
  if (!process.env.OPENAI_API_KEY) {
    console.error('[AI] Missing OPENAI_API_KEY')
    throw new Error('AI service not configured')
  }

  // Generate content
  const { text } = await generateText({
    model: openai("gpt-4-turbo"),
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.7,
    maxTokens: 2048,
  })

  // Validate response
  if (!text || text.trim().length < 100) {
    throw new Error('AI generated insufficient content')
  }

  // Save to database
  await supabase.from('letters').update({
    ai_draft_content: text,
    status: 'pending_review'
  }).eq('id', letterId)

  // Log success
  await supabase.rpc('log_letter_audit', {
    p_letter_id: letterId,
    p_action: 'ai_generated',
    p_notes: 'AI successfully generated letter content'
  })

} catch (error: any) {
  console.error('[AI] Generation error:', error)

  // Update letter status to failed
  await supabase.from('letters').update({
    status: 'failed'
  }).eq('id', letterId)

  // Log failure
  await supabase.rpc('log_letter_audit', {
    p_letter_id: letterId,
    p_action: 'ai_failed',
    p_notes: `AI generation failed: ${error.message}`
  })

  throw error
}
```

---

## Component Architecture

### Component Organization

```
components/
├── admin/              # Admin-specific components
│   ├── admin-header.tsx
│   ├── admin-nav.tsx
│   └── letter-review-interface.tsx
├── ui/                 # shadcn/ui primitives (DO NOT MODIFY)
│   ├── button.tsx
│   ├── card.tsx
│   └── [50+ components]
└── [feature-components] # Feature-specific components
    └── letter-actions.tsx
```

### Component Patterns

**Server Components (Default):**
```typescript
// app/dashboard/letters/page.tsx
import { getUser } from "@/lib/auth/get-user"
import { createClient } from "@/lib/supabase/server"

export default async function LettersPage() {
  const { session, profile } = await getUser()
  const supabase = await createClient()

  const { data: letters } = await supabase
    .from('letters')
    .select('*')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })

  return <LettersView letters={letters} />
}
```

**Client Components (When Needed):**
```typescript
// components/letter-actions.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface LetterActionsProps {
  letterId: string
  onDownload?: () => void
}

export function LetterActions({ letterId, onDownload }: LetterActionsProps) {
  const [loading, setLoading] = useState(false)

  const handleDownload = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/letters/${letterId}/pdf`)
      const blob = await response.blob()
      // ... download logic
      onDownload?.()
    } catch (error) {
      console.error('Download failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleDownload} disabled={loading}>
      {loading ? 'Downloading...' : 'Download PDF'}
    </Button>
  )
}
```

---

## Security Architecture

### Row Level Security (RLS)

**Why RLS?**
- Security enforced at database level
- Cannot be bypassed by application code
- Automatic protection for all queries
- No accidental data leaks
- Centralized security logic

**RLS Pattern:**
```sql
-- Pattern: Users can only access their own data
CREATE POLICY "users_own_data"
ON table_name FOR ALL
TO authenticated
USING (user_id = auth.uid());

-- Pattern: Admins can access all data
CREATE POLICY "admins_all_data"
ON table_name FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) = 'admin');

-- Pattern: Employees cannot access specific data
CREATE POLICY "employees_no_access"
ON letters FOR ALL
TO authenticated
USING (
  get_user_role(auth.uid()) != 'employee'
);
```

### Critical Security Rules

**1. Never Bypass RLS:**
```typescript
// ❌ WRONG: Bypassing RLS with service role
const supabaseServiceRole = createClient(serviceRoleKey)
const { data } = await supabaseServiceRole.from('letters').select('*')

// ✅ CORRECT: Use authenticated client (RLS enforced)
const supabase = await createClient()
const { data } = await supabase.from('letters').select('*')
```

**2. Always Validate Input:**
```typescript
// ✅ CORRECT: Validate all inputs
const body = await request.json()

if (!body.letterType || typeof body.letterType !== 'string') {
  return NextResponse.json({ error: "Invalid letterType" }, { status: 400 })
}

if (!ALLOWED_LETTER_TYPES.includes(body.letterType)) {
  return NextResponse.json({ error: "Invalid letterType" }, { status: 400 })
}
```

**3. Log Security Events:**
```typescript
// Log security-relevant events
await supabase.from('security_audit_log').insert({
  user_id: user.id,
  action: 'admin_login_attempt',
  details: { success: true },
  ip_address: request.headers.get('x-forwarded-for'),
  user_agent: request.headers.get('user-agent')
})
```

---

## Deployment Architecture

### Vercel + Supabase

**Vercel (Frontend + API):**
- Automatic deployments from Git
- Edge network for global performance
- Environment variables management
- Cron jobs for scheduled tasks

**Supabase (Database + Auth):**
- Managed PostgreSQL
- Built-in Auth service
- Real-time subscriptions
- Edge Functions (alternative to Next.js API)

### Environment Variable Management

**Required Setup:**
1. Development: `.env.local` (git-ignored)
2. Production: Vercel dashboard
3. Staging: Vercel preview environments

**Critical Variables:**
- `OPENAI_API_KEY` - Never commit to git
- `SUPABASE_SERVICE_ROLE_KEY` - Never expose to client
- `ADMIN_PASSWORD` - Use strong password, never commit
- `CRON_SECRET` - Random string for cron job auth

---

## Performance Optimization

### Database Performance

**1. Index Strategy:**
```sql
-- Index foreign keys
CREATE INDEX idx_letters_user_id ON letters(user_id);
CREATE INDEX idx_letters_status ON letters(status);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);

-- Compound indexes for common queries
CREATE INDEX idx_letters_user_status ON letters(user_id, status);
```

**2. Query Optimization:**
```typescript
// ✅ GOOD: Select only needed columns
const { data } = await supabase
  .from('letters')
  .select('id, title, status, created_at')
  .eq('user_id', userId)
  .limit(20)

// ❌ BAD: Select all columns and data
const { data } = await supabase
  .from('letters')
  .select('*')
```

### Next.js Performance

**1. Use Server Components by Default:**
- Faster initial page load
- Smaller client bundle
- Better SEO

**2. Optimize Client Components:**
```typescript
// Use dynamic imports for large components
import dynamic from 'next/dynamic'

const RichTextEditor = dynamic(
  () => import('@/components/ui/rich-text-editor'),
  { ssr: false, loading: () => <Skeleton /> }
)
```

**3. Image Optimization:**
```typescript
import Image from 'next/image'

// Always use Next.js Image component
<Image
  src="/logo.svg"
  alt="Logo"
  width={40}
  height={40}
  priority={true}  // For above-the-fold images
/>
```

---

## Testing Strategy

### What to Test

**1. API Routes:**
- Authentication checks
- Authorization checks
- Input validation
- Error handling
- Business logic

**2. Database Functions:**
- Allowance calculations
- Audit trail logging
- Commission creation

**3. RLS Policies:**
- Users can only access their data
- Admins can access all data
- Employees cannot access letters

**4. Integration:**
- Letter generation flow
- Subscription creation flow
- Commission tracking flow

---

## Common Pitfalls to Avoid

### 1. Authorization Confusion
```typescript
// ❌ WRONG: Using is_super_user for authorization
if (profile.is_super_user) {
  // Allow admin access
}

// ✅ CORRECT: Using role for authorization
if (profile.role === 'admin') {
  // Allow admin access
}

// ℹ️  CORRECT: Using is_super_user for business logic
if (profile.is_super_user) {
  // Grant unlimited letter allowance
}
```

### 2. Mixing Authentication Systems
```typescript
// ❌ WRONG: Checking Supabase session for admin routes
const { data: { user } } = await supabase.auth.getUser()

// ✅ CORRECT: Using admin session for admin routes
const adminSession = verifyAdminSession(request)
```

### 3. Bypassing RLS
```typescript
// ❌ WRONG: Using service role client in user-accessible code
const { data } = await supabaseServiceRole.from('letters').select('*')

// ✅ CORRECT: Using authenticated client (RLS enforced)
const { data } = await supabase.from('letters').select('*')
```

### 4. Forgetting Audit Trail
```typescript
// ❌ WRONG: Changing letter status without logging
await supabase.from('letters').update({ status: 'approved' })

// ✅ CORRECT: Always log status changes
await supabase.from('letters').update({ status: 'approved' })
await supabase.rpc('log_letter_audit', { ... })
```

---

## Summary

This architecture is designed for:
- **Security:** RLS-enforced, dual auth systems
- **Scalability:** Serverless architecture, indexed database
- **Maintainability:** Clear patterns, comprehensive logging
- **Performance:** Server components, optimized queries
- **Developer Experience:** Type-safe, well-documented

**Always refer to [ARCHITECTURE_REFERENCE.md](../../ARCHITECTURE_REFERENCE.md) for specific implementation details.**
