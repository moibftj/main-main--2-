# Talk-To-My-Lawyer - Architecture Reference

> **Complete structural inventory of pages, endpoints, database schema, components, and functions**
>
> Last Updated: December 2025

This document contains a comprehensive inventory of all structural and architectural elements in the Talk-To-My-Lawyer codebase. It serves as the definitive reference for AI assistants and developers working with the project.

---

## Table of Contents

1. [Pages & Routes](#pages--routes)
2. [API Endpoints](#api-endpoints)
3. [Database Tables](#database-tables)
4. [Database Functions](#database-functions)
5. [Database Triggers](#database-triggers)
6. [Components](#components)
7. [TypeScript Types](#typescript-types)
8. [Authentication](#authentication)
9. [RLS Policies](#rls-policies)
10. [External Integrations](#external-integrations)
11. [Environment Variables](#environment-variables)

---

## Pages & Routes

### Public Routes
| Route | File | Purpose |
|-------|------|---------|
| `/` | `app/page.tsx` | Landing page |
| `/auth/login` | `app/auth/login/page.tsx` | User login |
| `/auth/signup` | `app/auth/signup/page.tsx` | User registration |
| `/auth/forgot-password` | `app/auth/forgot-password/page.tsx` | Password reset request |
| `/auth/reset-password` | `app/auth/reset-password/page.tsx` | Password reset form |
| `/auth/check-email` | `app/auth/check-email/page.tsx` | Email verification prompt |

### Subscriber Dashboard (`/dashboard`)
| Route | File | Purpose |
|-------|------|---------|
| `/dashboard` | `app/dashboard/page.tsx` | Dashboard home (role-based redirect) |
| `/dashboard/letters` | `app/dashboard/letters/page.tsx` | Letters list |
| `/dashboard/letters/new` | `app/dashboard/letters/new/page.tsx` | Create new letter |
| `/dashboard/letters/[id]` | `app/dashboard/letters/[id]/page.tsx` | View letter details |
| `/dashboard/subscription` | `app/dashboard/subscription/page.tsx` | Subscription management |
| `/dashboard/settings` | `app/dashboard/settings/page.tsx` | User settings |

### Employee Dashboard (`/dashboard`)
| Route | File | Purpose |
|-------|------|---------|
| `/dashboard/coupons` | `app/dashboard/coupons/page.tsx` | View employee coupon codes |
| `/dashboard/commissions` | `app/dashboard/commissions/page.tsx` | Commission tracking |
| `/dashboard/employee-settings` | `app/dashboard/employee-settings/page.tsx` | Employee settings |

### Admin Portal (`/secure-admin-gateway`)
| Route | File | Purpose |
|-------|------|---------|
| `/secure-admin-gateway/login` | `app/secure-admin-gateway/login/page.tsx` | Admin login (separate auth) |
| `/secure-admin-gateway` | `app/secure-admin-gateway/page.tsx` | Admin home (redirects to review) |
| `/secure-admin-gateway/review` | `app/secure-admin-gateway/review/page.tsx` | Review center (pending letters) |
| `/secure-admin-gateway/review/[id]` | `app/secure-admin-gateway/review/[id]/page.tsx` | Review specific letter |
| `/secure-admin-gateway/dashboard` | `app/secure-admin-gateway/dashboard/page.tsx` | Super admin dashboard |
| `/secure-admin-gateway/dashboard/letters` | `app/secure-admin-gateway/dashboard/letters/page.tsx` | All letters view |
| `/secure-admin-gateway/dashboard/all-letters` | `app/secure-admin-gateway/dashboard/all-letters/page.tsx` | Complete letters archive |
| `/secure-admin-gateway/dashboard/users` | `app/secure-admin-gateway/dashboard/users/page.tsx` | User management (super admin) |
| `/secure-admin-gateway/dashboard/analytics` | `app/secure-admin-gateway/dashboard/analytics/page.tsx` | Analytics (super admin) |
| `/secure-admin-gateway/dashboard/commissions` | `app/secure-admin-gateway/dashboard/commissions/page.tsx` | Commission management (super admin) |

---

## API Endpoints

### Authentication (`/api/auth`, `/api/admin-auth`)
| Endpoint | Method | File | Purpose | Access |
|----------|--------|------|---------|--------|
| `/api/auth/reset-password` | POST | `app/api/auth/reset-password/route.ts` | Request password reset | Public |
| `/api/auth/update-password` | POST | `app/api/auth/update-password/route.ts` | Update user password | Authenticated |
| `/api/admin-auth/login` | POST | `app/api/admin-auth/login/route.ts` | Admin portal login | Public |
| `/api/admin-auth/logout` | POST | `app/api/admin-auth/logout/route.ts` | Admin portal logout | Admin |
| `/api/create-profile` | POST | `app/api/create-profile/route.ts` | Create user profile (fallback) | Internal |

### Letter Operations (`/api`)
| Endpoint | Method | File | Purpose | Access |
|----------|--------|------|---------|--------|
| `/api/generate-letter` | POST | `app/api/generate-letter/route.ts` | Generate AI letter draft | Subscriber |
| `/api/letters/[id]/submit` | POST | `app/api/letters/[id]/submit/route.ts` | Submit draft for review | Subscriber |
| `/api/letters/[id]/start-review` | POST | `app/api/letters/[id]/start-review/route.ts` | Start admin review | Admin |
| `/api/letters/[id]/improve` | POST | `app/api/letters/[id]/improve/route.ts` | AI-improve letter content | Admin |
| `/api/letters/[id]/approve` | POST | `app/api/letters/[id]/approve/route.ts` | Approve letter | Admin |
| `/api/letters/[id]/reject` | POST | `app/api/letters/[id]/reject/route.ts` | Reject letter | Admin |
| `/api/letters/[id]/complete` | POST | `app/api/letters/[id]/complete/route.ts` | Mark letter as completed | Admin |
| `/api/letters/[id]/resubmit` | POST | `app/api/letters/[id]/resubmit/route.ts` | Resubmit rejected letter | Subscriber |
| `/api/letters/[id]/pdf` | GET | `app/api/letters/[id]/pdf/route.ts` | Generate PDF | Subscriber/Admin |
| `/api/letters/[id]/send-email` | POST | `app/api/letters/[id]/send-email/route.ts` | Send letter via email | Subscriber |
| `/api/letters/[id]/audit` | GET | `app/api/letters/[id]/audit/route.ts` | Get audit trail | Admin |
| `/api/letters/improve` | POST | `app/api/letters/improve/route.ts` | AI improvement (alternative) | Admin |

### Subscription Management (`/api`)
| Endpoint | Method | File | Purpose | Access |
|----------|--------|------|---------|--------|
| `/api/create-checkout` | POST | `app/api/create-checkout/route.ts` | Create Stripe checkout session | Subscriber |
| `/api/verify-payment` | POST | `app/api/verify-payment/route.ts` | Verify payment & create subscription | Subscriber |
| `/api/subscriptions/activate` | POST | `app/api/subscriptions/activate/route.ts` | Activate subscription | Internal |
| `/api/subscriptions/check-allowance` | GET | `app/api/subscriptions/check-allowance/route.ts` | Check letter allowance | Subscriber |
| `/api/subscriptions/reset-monthly` | POST | `app/api/subscriptions/reset-monthly/route.ts` | Reset monthly allowances (cron) | Cron/Admin |

### Payment & Admin (`/api`)
| Endpoint | Method | File | Purpose | Access |
|----------|--------|------|---------|--------|
| `/api/stripe/webhook` | POST | `app/api/stripe/webhook/route.ts` | Stripe webhook handler | Stripe |
| `/api/admin/super-user` | GET/POST | `app/api/admin/super-user/route.ts` | Grant/revoke super user status | Super Admin |
| `/api/admin/promote-user` | POST | `app/api/admin/promote-user/route.ts` | Promote user role | Super Admin |

---

## Database Tables

### `profiles`
**Purpose:** User accounts with role-based access control

```typescript
{
  id: string                    // UUID, PK, references auth.users(id)
  email: string                 // UNIQUE
  full_name: string | null
  role: UserRole                // 'subscriber' | 'employee' | 'admin'
  is_super_user: boolean        // DEFAULT false
  phone: string | null
  company_name: string | null
  avatar_url: string | null
  bio: string | null
  created_at: timestamptz
  updated_at: timestamptz
}
```

### `letters`
**Purpose:** Legal letter documents with status workflow

```typescript
{
  id: string                    // UUID, PK
  user_id: string               // FK -> profiles(id)
  title: string
  letter_type: string           // e.g., "Demand Letter", "Cease and Desist"
  status: LetterStatus          // draft | generating | pending_review | under_review | approved | completed | rejected | failed
  recipient_name: string | null
  recipient_address: string | null
  subject: string | null
  content: string | null
  intake_data: jsonb            // Form data from user
  ai_draft_content: string | null
  final_content: string | null
  reviewed_by: string | null    // FK -> profiles(id)
  reviewed_at: timestamptz | null
  review_notes: string | null
  rejection_reason: string | null
  approved_at: timestamptz | null
  completed_at: timestamptz | null
  sent_at: timestamptz | null
  notes: string | null
  created_at: timestamptz
  updated_at: timestamptz
}
```

**Letter Status Workflow:**
```
draft → generating → pending_review → under_review → approved → completed
                                                   ↘ rejected
                                      ↘ failed
```

### `subscriptions`
**Purpose:** User subscription management

```typescript
{
  id: string                    // UUID, PK
  user_id: string               // FK -> profiles(id)
  plan: string                  // 'one_time' | 'monthly_standard' | 'monthly_premium'
  status: SubscriptionStatus    // 'active' | 'canceled' | 'past_due'
  price: numeric(10,2)
  discount: numeric(10,2)       // DEFAULT 0
  coupon_code: string | null
  employee_id: string | null    // FK -> profiles(id)
  credits_remaining: integer    // Letter allowance
  remaining_letters: integer    // Alias for credits
  stripe_session_id: string | null
  current_period_start: timestamptz | null
  current_period_end: timestamptz | null
  last_reset_at: timestamptz    // DEFAULT NOW()
  created_at: timestamptz
  updated_at: timestamptz
  expires_at: timestamptz | null
}
```

**Subscription Plans:**
- `one_time` - $299, 1 letter
- `monthly_standard` (or `standard_4_month`) - $299/month, 4 letters
- `monthly_premium` (or `premium_8_month`) - $599/year, 8 letters

### `employee_coupons`
**Purpose:** Employee referral discount codes

```typescript
{
  id: string                    // UUID, PK
  employee_id: string | null    // FK -> profiles(id), NULL for promo codes
  code: string                  // UNIQUE, e.g., "EMP-XXXXXX" or "TALK3"
  discount_percent: integer     // DEFAULT 20
  is_active: boolean            // DEFAULT true
  usage_count: integer          // DEFAULT 0
  created_at: timestamptz
  updated_at: timestamptz
}
```

### `coupon_usage`
**Purpose:** Track coupon usage

```typescript
{
  id: string                    // UUID, PK
  user_id: string               // FK -> profiles(id)
  employee_id: string | null    // FK -> profiles(id)
  coupon_code: string
  subscription_id: string       // FK -> subscriptions(id)
  discount_percent: integer
  discount_amount: numeric(10,2)
  amount_before: numeric(10,2)
  amount_after: numeric(10,2)
  created_at: timestamptz
}
```

### `commissions`
**Purpose:** Employee commission tracking

```typescript
{
  id: string                    // UUID, PK
  user_id: string               // FK -> profiles(id) (subscriber)
  employee_id: string           // FK -> profiles(id) (employee)
  subscription_id: string       // FK -> subscriptions(id)
  commission_rate: numeric(5,4) // DEFAULT 0.05 (5%)
  subscription_amount: numeric(10,2)
  commission_amount: numeric(10,2)
  status: CommissionStatus      // 'pending' | 'paid'
  created_at: timestamptz
  updated_at: timestamptz
  paid_at: timestamptz | null
}
```

### `letter_audit_trail`
**Purpose:** Complete audit logging for all letter actions

```typescript
{
  id: string                    // UUID, PK
  letter_id: string             // FK -> letters(id)
  performed_by: string          // FK -> profiles(id)
  action: string                // e.g., 'created', 'approved', 'rejected'
  old_status: string | null
  new_status: string | null
  notes: string | null
  metadata: jsonb | null
  created_at: timestamptz
}
```

### `security_audit_log`
**Purpose:** Security event logging

```typescript
{
  id: string                    // UUID, PK
  user_id: string | null        // FK -> profiles(id)
  action: string                // Security action type
  details: jsonb | null
  ip_address: string | null
  user_agent: string | null
  created_at: timestamptz
}
```

### `security_config`
**Purpose:** Security configuration settings

```typescript
{
  id: string                    // UUID, PK
  key: string                   // Config key
  value: string | null          // Config value
  description: string | null
  is_active: boolean
  created_at: timestamptz
  updated_at: timestamptz
}
```

---

## Database Functions

### Letter Allowance Management

#### `deduct_letter_allowance(u_id UUID) -> BOOLEAN`
**Purpose:** Deducts one letter credit from user's active subscription
**Returns:** `true` if successful, `false` if no allowance available
**Logic:**
1. Check if user is super_user (returns true without deducting)
2. Find active subscription
3. Verify credits_remaining > 0
4. Deduct 1 from both credits_remaining and remaining_letters
5. Return success status

#### `check_letter_allowance(u_id UUID) -> TABLE`
**Purpose:** Non-destructive check of letter allowance
**Returns:**
```typescript
{
  has_allowance: boolean
  remaining: integer
  plan_name: string
  is_super: boolean
}
```

#### `add_letter_allowances(sub_id UUID, plan_name TEXT) -> VOID`
**Purpose:** Adds letter allowances when subscription is activated
**Logic:**
- `one_time` → 1 letter
- `monthly_standard` → 4 letters
- `monthly_premium` → 12 letters

#### `reset_monthly_allowances() -> VOID`
**Purpose:** Resets monthly letter allowances for all active subscriptions
**Called:** Monthly via cron job (1st of each month)

### Audit Trail

#### `log_letter_audit(p_letter_id UUID, p_action TEXT, p_old_status TEXT, p_new_status TEXT, p_notes TEXT, p_metadata JSONB) -> VOID`
**Purpose:** Creates audit trail entry for letter status changes
**Captured:** performed_by from auth.uid(), timestamp from NOW()

### User Management

#### `handle_new_user() -> TRIGGER FUNCTION`
**Trigger:** AFTER INSERT ON auth.users
**Purpose:** Creates profile entry when user signs up
**Logic:**
1. Extract email, full_name, role from user metadata
2. Insert into profiles table
3. Default role to 'subscriber' if not specified

#### `get_user_role() -> TEXT`
**Purpose:** Returns current user's role from profiles table
**Used:** In RLS policies for role-based access control

### Employee & Commission System

#### `create_commission_for_subscription() -> TRIGGER FUNCTION`
**Trigger:** AFTER INSERT ON subscriptions
**Purpose:** Auto-creates commission entry when subscription uses employee coupon
**Logic:**
1. Check if subscription has coupon_code
2. Find employee_id from employee_coupons table
3. Create commission entry with 5% rate
4. Status defaults to 'pending'

#### `auto_generate_employee_coupon() -> TRIGGER FUNCTION`
**Trigger:** AFTER INSERT ON profiles (when role = 'employee')
**Purpose:** Auto-generates unique coupon code for employees
**Format:** `EMP-XXXXXX` (6 random uppercase characters)

### Coupon Management

#### `validate_coupon(code TEXT) -> TABLE`
**Purpose:** Validates employee coupon code
**Returns:** Coupon details if valid and active

#### `get_employee_coupon(emp_id UUID) -> TABLE`
**Purpose:** Retrieves employee's coupon information

### Utility Functions

#### `update_updated_at_column() -> TRIGGER FUNCTION`
**Trigger:** BEFORE UPDATE ON profiles, letters, subscriptions, employee_coupons
**Purpose:** Automatically updates updated_at timestamp

---

## Database Triggers

| Trigger Name | Event | Table | Function | Purpose |
|--------------|-------|-------|----------|---------|
| `on_auth_user_created` | AFTER INSERT | `auth.users` | `handle_new_user()` | Create profile on signup |
| `on_subscription_insert` | AFTER INSERT | `subscriptions` | `create_commission_for_subscription()` | Create commission if coupon used |
| `on_employee_profile_created` | AFTER INSERT | `profiles` | `auto_generate_employee_coupon()` | Generate coupon for employees |
| `update_profiles_updated_at` | BEFORE UPDATE | `profiles` | `update_updated_at_column()` | Auto-update timestamp |
| `update_letters_updated_at` | BEFORE UPDATE | `letters` | `update_updated_at_column()` | Auto-update timestamp |
| `update_subscriptions_updated_at` | BEFORE UPDATE | `subscriptions` | `update_updated_at_column()` | Auto-update timestamp |
| `update_coupons_updated_at` | BEFORE UPDATE | `employee_coupons` | `update_updated_at_column()` | Auto-update timestamp |

---

## Components

### Admin Components (`/components/admin`)
- `admin-header.tsx` - Admin portal header with logo and user menu
- `admin-nav.tsx` - Admin navigation menu
- `admin-sidebar.tsx` - Admin sidebar navigation
- `letter-review-interface.tsx` - Complete letter review interface with AI improvement
- `review-letter-actions.tsx` - Review action buttons (approve/reject/improve)
- `user-management-actions.tsx` - User role management actions

### UI Components (`/components/ui`)
Over 50 shadcn/ui components including:

**Forms & Inputs:** input, textarea, select, checkbox, radio-group, switch, form, label, input-otp

**Layout:** card, sheet, dialog, drawer, accordion, tabs, separator, scroll-area, resizable, collapsible

**Navigation:** navigation-menu, menubar, breadcrumb, command, context-menu

**Feedback:** alert, alert-dialog, toast, toaster, badge, progress, skeleton, spinner, empty

**Data Display:** table, avatar, tooltip, hover-card, chart

**Buttons:** button, button-2, button-group, animated-button, toggle, toggle-group

**Custom:** rich-text-editor, hero, enhanced-hero-section, pricing-section, timeline-animation, kbd

### Feature Components (`/components`)
- `letter-actions.tsx` - Letter action buttons (download, email, etc.)

---

## TypeScript Types

### Enums
```typescript
type UserRole = 'subscriber' | 'employee' | 'admin'

type LetterStatus =
  | 'draft'
  | 'generating'
  | 'pending_review'
  | 'under_review'
  | 'approved'
  | 'completed'
  | 'rejected'
  | 'failed'

type SubscriptionStatus = 'active' | 'canceled' | 'past_due'

type CommissionStatus = 'pending' | 'paid'
```

### Database Types
Located in `lib/database.types.ts`:
- `Profile` - User profile interface
- `Letter` - Letter document interface
- `Subscription` - Subscription interface
- `EmployeeCoupon` - Coupon interface
- `Commission` - Commission interface
- `LetterAuditTrail` - Audit trail interface
- `SecurityAuditLog` - Security log interface
- `SecurityConfig` - Security config interface
- `CouponUsage` - Coupon usage interface

---

## Authentication

### Standard User Authentication (Supabase Auth)
1. User signup/login via Supabase Auth
2. `handle_new_user()` trigger creates profile
3. Session cookie stored (httpOnly)
4. Middleware checks session on each request
5. Role-based redirect to appropriate dashboard

### Admin Portal Authentication (Separate System)
1. Admin enters email + password + portal key
2. `verifyAdminCredentials()` checks against env vars:
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
   - `ADMIN_PORTAL_KEY`
3. Creates custom session token in httpOnly cookie
4. 30-minute session timeout with activity refresh
5. Middleware protects all `/secure-admin-gateway/*` routes
6. Super admin check for restricted routes

### Authentication Guards

**Server-side:**
- `getUser()` - `/lib/auth/get-user.ts` - Server component auth
- `requireAdminAuth()` - `/lib/auth/admin-guard.ts` - Admin API guard
- `verifyAdminSession()` - `/lib/auth/admin-session.ts` - Admin portal session
- `isSuperAdmin()` - `/lib/auth/admin-session.ts` - Super admin check

**Middleware:**
- `/middleware.ts` - Route protection and role-based redirects
- `/lib/supabase/middleware.ts` - Supabase session refresh

---

## RLS Policies

### `profiles`
| Policy | Action | Rule |
|--------|--------|------|
| Users can view own profile | SELECT | `auth.uid() = id` |
| Users can update own profile | UPDATE | `auth.uid() = id` |
| Admins can view all profiles | SELECT | `get_user_role() = 'admin'` |
| Admins can update all profiles | UPDATE | `get_user_role() = 'admin'` |

### `letters`
| Policy | Action | Rule |
|--------|--------|------|
| Users can view own letters | SELECT | `auth.uid() = user_id` |
| Users can create letters | INSERT | `auth.uid() = user_id` |
| Users can update own letters | UPDATE | `auth.uid() = user_id` |
| Admins can view all letters | SELECT | `get_user_role() = 'admin'` |
| Admins can update all letters | UPDATE | `get_user_role() = 'admin'` |
| **Employees CANNOT access** | ALL | Explicitly blocked |

### `subscriptions`
| Policy | Action | Rule |
|--------|--------|------|
| Users can view own subscription | SELECT | `auth.uid() = user_id` |
| Admins can view all subscriptions | SELECT | `get_user_role() = 'admin'` |
| System can create subscriptions | INSERT | Service role |

### `employee_coupons`
| Policy | Action | Rule |
|--------|--------|------|
| Employees can view own coupons | SELECT | `auth.uid() = employee_id` |
| Public can verify coupon codes | SELECT | Code validation only |
| Admins can view/manage all | SELECT, UPDATE | `get_user_role() = 'admin'` |

### `commissions`
| Policy | Action | Rule |
|--------|--------|------|
| Employees can view own commissions | SELECT | `auth.uid() = employee_id` |
| Admins can view/manage all | SELECT, UPDATE | `get_user_role() = 'admin'` |

### `letter_audit_trail`
| Policy | Action | Rule |
|--------|--------|------|
| Admins can view all audit logs | SELECT | `get_user_role() = 'admin'` |
| System can log events | INSERT | Service role |

---

## External Integrations

### OpenAI (via Vercel AI SDK)
**Model:** GPT-4 Turbo
**Usage:**
- `/api/generate-letter` - Letter generation
- `/api/letters/[id]/improve` - Letter improvement

**Configuration:**
```typescript
import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'

model: openai("gpt-4-turbo")
temperature: 0.7
maxTokens: 2048
```

**Environment:** `OPENAI_API_KEY`

### Stripe
**Purpose:** Payment processing
**Endpoints:**
- `/api/create-checkout` - Create checkout session
- `/api/verify-payment` - Verify payment completion
- `/api/stripe/webhook` - Webhook handler

**Environment:**
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### Supabase
**Services:**
- **Database:** PostgreSQL with RLS
- **Auth:** User authentication and sessions
- **Edge Functions:** `generate-letter` (alternative)

**Environment:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### jsPDF
**Purpose:** PDF generation from approved letters
**Endpoint:** `/api/letters/[id]/pdf`

### Email Service (Future/Simulated)
**Purpose:** Email delivery of letters
**Endpoint:** `/api/letters/[id]/send-email`
**Note:** Currently simulated, requires SMTP configuration

---

## Environment Variables

### Required Variables
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI
OPENAI_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Admin Portal
ADMIN_EMAIL=
ADMIN_PASSWORD=
ADMIN_PORTAL_KEY=
ADMIN_PORTAL_ROUTE=secure-admin-gateway  # Optional

# App
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=  # Development only

# Cron
CRON_SECRET=
```

### Optional Variables
```bash
# Redis/Upstash (for rate limiting)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

---

## Key Business Rules

1. **Free Trial:** First letter is always free (no credit card required)
2. **Super Users:** Users with `is_super_user = true` have unlimited letter generation
3. **Employee Isolation:** Employees CANNOT access any letter content (enforced by RLS)
4. **Mandatory Review:** ALL letters must be reviewed and approved by admin before subscriber can access
5. **Commission Rate:** 5% of subscription amount
6. **Coupon Discount:** 20% for employee referrals
7. **100% Discount Coupons:** Grant super_user status (e.g., TALK3)
8. **Audit Trail:** Every letter status change must be logged
9. **Session Timeout:** Admin portal sessions expire after 30 minutes of inactivity
10. **Monthly Reset:** Subscription allowances reset on 1st of each month (cron job)

---

**This document is the definitive source of truth for all structural elements in the Talk-To-My-Lawyer codebase.**
