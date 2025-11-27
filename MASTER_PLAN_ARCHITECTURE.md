# 🎯 MASTER PLAN ARCHITECTURE

## Your Goal in This Task

Take this repo from "almost there" to **production-ready MVP** by completing, wiring, and hardening all flows for:

- ✅ **Subscriber**
- ✅ **Employee**
- ✅ **Admin**

Including:
- AI letter generation + admin AI review
- Free trial
- Subscriptions + letter allowance
- Coupon + commission system for employees
- Dashboards
- RLS + security
- Basic deployment readiness

---

## 📋 Execution Steps

Follow the steps below in order. At the end of each step, list:
- Files you changed
- What you did in 1–2 lines each

---

## 🧱 STEP 1 – Understand the Current App (NO CODE YET)

### Tasks:

1. **Unzip and inspect the repo**: `main-main/`

2. **Carefully read these docs** (they are product + architecture spec for THIS repo):
   - `SETUP.md`
   - `DEPLOYMENT.md`
   - `FREE_TRIAL_IMPLEMENTATION.md`
   - `GEMINI_INTEGRATION.md`
   - `DASHBOARD_REVAMP_PLAN.md`
   - `DATABASE_FUNCTIONS.md`
   - `PLATFORM_ARCHITECTURE.md`

3. **Skim these folders/files**:
   - `app/dashboard/**`
   - `app/api/generate-letter/route.ts`
   - `app/api/letters/[id]/*`
   - `app/api/subscriptions/*`
   - `app/api/create-checkout/route.ts`
   - `components/review-letter-modal.tsx`
   - `lib/auth/get-user.ts`
   - `lib/supabase/server.ts`
   - `lib/supabase/middleware.ts`
   - `scripts/*.sql`

### Output:

Write a short summary:
- What's already implemented for:
  - subscriber
  - employee
  - admin
- What's clearly incomplete / TODO based on docs vs code

**Do not modify any code in this step. Just analyze and report.**

---

## 👤 STEP 2 – Roles, Auth & Dashboards Match DASHBOARD_REVAMP_PLAN.md

### Goal:
Role-based dashboards fully aligned with the plan.

### Tasks:

1. **Ensure role detection uses `profiles.role` consistently** (subscriber, employee, admin)
   - Check:
     - `app/dashboard/page.tsx`
     - `lib/auth/get-user.ts`
     - `lib/supabase/middleware.ts`

2. **Make sure `/dashboard` redirects**:
   - `admin` → `/dashboard/admin`
   - `employee` → `/dashboard/commissions` (or `/dashboard/employee` if defined)
   - otherwise → subscriber dashboard

3. **Access control**:
   - Subscribers can't hit `/dashboard/admin/*` or employee-only pages
   - Employees can't hit admin routes or subscriber-only letter pages
   - Admins can see all admin routes

4. **Update subscriber dashboard** to match `DASHBOARD_REVAMP_PLAN.md`:
   - `/dashboard` & `/dashboard/letters`:
     - Header: title, subtitle, "Create New Letter" CTA
     - Table columns: Title, Type, Status pill, Created Date, Actions
     - Empty state UX as described

5. **Tidy**:
   - Ensure Profile / Subscription / Letters links are present in nav

### Output:
- Files changed
- 1–2 lines why for each

---

## 🧠 STEP 3 – AI Letter Flow & Admin AI Review Are Fully Wired

### Goal:
Subscriber → Gemini draft → Admin AI Editor → Approve/Reject → Subscriber "My Letters"
matching `GEMINI_INTEGRATION.md` + `DATABASE_FUNCTIONS.md`.

### Tasks:

#### **A. Subscriber letter generation**

1. Confirm `/dashboard/letters/new` is:
   - Validating form inputs
   - Calling `POST /api/generate-letter` with `letterType` + `intakeData`

2. In `app/api/generate-letter/route.ts`:
   - Ensure:
     - Auth enforced
     - Free trial / subscription + allowance check is done exactly as in `FREE_TRIAL_IMPLEMENTATION.md` & `DATABASE_FUNCTIONS.md`
     - Status transitions follow:
       ```
       draft → generating → pending_review (and later under_review etc.)
       ```
     - Gemini is called via `GEMINI_INTEGRATION.md` pattern
     - Result stored in `letters.ai_draft_content` and related fields

#### **B. Admin review center**

Files to check:
- `app/dashboard/admin/letters/page.tsx`
- `components/review-letter-modal.tsx`
- `app/api/letters/[id]/improve/route.ts`
- `app/api/letters/[id]/approve/route.ts`
- `app/api/letters/[id]/reject/route.ts`

Ensure:
- Admin-only access enforced server-side
- Modal:
  - Pre-fills `finalContent` with `ai_draft_content`
  - "Improve with AI":
    - Calls `/api/letters/[id]/improve` with `{ content, instruction }`
    - That route calls Gemini, returns improved text
    - UI properly handles loading/errors and lets admin apply result
  - Approve:
    - Final editor content is saved to letters (final body)
    - Status set to `completed` or `approved` as per `DATABASE_FUNCTIONS.md`
    - Audit trail recorded (DB function or direct insert into audit table)
  - Reject:
    - Status updated to `rejected`
    - Rejection reason saved (letter notes / audit trail)

#### **C. Subscriber My Letters**

Files:
- `/dashboard/letters/page.tsx`
- `/dashboard/letters/[id]/page.tsx`

Ensure:
- Subscriber only sees their letters
- Status pills and messaging match definitions in `SETUP.md` + `DASHBOARD_REVAMP_PLAN.md`
- For approved/completed letters:
  - `/api/letters/[id]/pdf` works and returns a real PDF
  - `/api/letters/[id]/send-email` sends email (if email provider configured) or fails gracefully with a clear message

### Output:
- Files changed
- What you wired/fixed

---

## 💸 STEP 4 – Free Trial, Plans, Subscriptions, Allowance

### Goal:
Free trial & paid plans behave exactly as documented.

### Tasks:

1. **Read**:
   - `FREE_TRIAL_IMPLEMENTATION.md`
   - `DATABASE_FUNCTIONS.md` (letter allowance section)
   - `scripts/005_letter_allowance_system.sql`

2. **Check**:
   - `app/api/generate-letter/route.ts`
   - `app/api/create-checkout/route.ts`
   - `app/api/subscriptions/check-allowance/route.ts`
   - `app/api/subscriptions/activate/route.ts`
   - `app/api/subscriptions/reset-monthly/route.ts`

3. **Ensure**:
   - First letter is free (no subscription needed), as per docs
   - After free letter:
     - Letter generation requires active subscription and allowance
   - `create-checkout`:
     - Accepts `planType` + optional `couponCode`
     - Creates/upserts subscriptions, transactions, allowance rows according to SQL
   - Allowance:
     - `check-allowance` and deduct logic matches DB functions
     - `letters_remaining` (or equivalent) updates correctly when generating letters

4. **Update subscriber dashboard**:
   - Show "letters remaining" if available
   - After free trial draft is generated:
     - Blur content + show pricing overlay as specified
     - Don't show full letter content until plan is purchased

### Output:
- Files changed
- Summary of allowance + free trial behavior

---

## 🎟 STEP 5 – Employees, Coupons & Commissions

### Goal:
Employee flows + data match docs and SQL.

### Tasks:

1. **Read SQL for**:
   - `employee_coupons`
   - `employee_commissions`
   - Related views/functions in `DATABASE_FUNCTIONS.md`

2. **Check**:
   - `/dashboard/commissions`
   - `/dashboard/coupons`
   - `/dashboard/admin/commissions`
   - `app/api/create-checkout/route.ts`

3. **Implement/verify**:
   - Each employee has a default coupon code
     - Can be seeded on employee creation or via a DB function; follow existing pattern if present
   - `create-checkout`:
     - Validates `couponCode`
     - Applies discount
     - Records coupon usage and creates `employee_commissions` with 5% of plan price
     - Increments employee points (1 point per coupon use)
   - Employee dashboard:
     - Coupons page: show code, discount %, usage count, "copy" button
     - Commissions page: show:
       - Total commission
       - Total points
       - List of commission records
   - Admin commissions view:
     - Show list of employees, their coupon performance, and total revenue/commission

### Output:
- Files changed
- Short summary of coupon + commission behavior

---

## 🔐 STEP 6 – RLS, Security, PDF/Storage, and Basic Hardening

### Goal:
Lock it down enough for a real MVP launch.

### Tasks:

#### **A. RLS & schema**

1. **Read**:
   - `scripts/001_setup_schema.sql`
   - `scripts/002_setup_rls.sql`

2. **Verify**:
   - Subscribers can only access their own letters, subs, transactions
   - Employees only see their own coupon & commission data
   - Admin can see all

3. **Fix any queries** that might bypass RLS (e.g. using service role in API in ways that expose other users' data)

#### **B. PDFs & Storage**

1. **Check**:
   - `/api/letters/[id]/pdf/route.ts`
   - Any Supabase storage usage

2. **Ensure**:
   - PDFs either:
     - Generated on-the-fly, or
     - Stored in buckets with RLS limiting access to owner + admin
   - Routes enforce auth + ownership

#### **C. Error handling & logs**

1. **Make sure API routes**:
   - Return consistent JSON error shapes
   - Log meaningful errors (no secrets)
   - Don't expose stack traces in production responses

### Output:
- Files changed
- Any important security notes/TODOs

---

## 🚀 STEP 7 – Final QA & Deployment Readiness

### Goal:
This thing can be deployed and used.

### Tasks:

1. **Make sure `README.md`, `SETUP.md`, and `DEPLOYMENT.md` are accurate** for this codebase:
   - How to:
     - Set env vars (`.env.example`)
     - Run SQL scripts against Supabase
     - Run dev (`npm run dev` / `pnpm dev`)
     - Build (`npm run build`)
     - Deploy to Vercel

2. **Run**:
   ```bash
   npm install  # or pnpm install
   npm run lint # or pnpm lint
   npm run build
   ```
   - Fix any build/lint errors

3. **Provide a manual QA script**:
   - Step-by-step manual test:
     1. Create subscriber → generate free trial letter → see pricing overlay
     2. Purchase plan → generate another letter → see status progression
     3. Admin login → review & improve with AI → approve letter
     4. Subscriber → see approved letter in My Letters, download PDF
     5. Create employee → get coupon → subscriber uses coupon in checkout → employee sees commission & points update

4. **Finally, output**:
   - **Changelog**:
     - All files touched
     - Short description per file
   - **Known limitations / next-phase items** (e.g. advanced analytics, realtime, notification center, etc.)

---

## ✅ End of Master Plan

## 🚀 What Do You Actually Do Now?

Super simple:

1. **Unzip the repo locally** and make sure you can run it:
   - Set env vars from `.env.example`
   - Run SQL scripts into your Supabase project

2. **Open your Vercel AI / "Dev" agent**

3. **Paste this MASTER PLAN ARCHITECTURE** and start executing step-by-step

4. **Document progress** after each step with:
   - Files changed
   - What was implemented/fixed
   - Any blockers or notes

---

## 📊 Current Implementation Status

### ✅ Already Implemented

#### **Authentication & Authorization**
- ✅ User signup/login with Supabase Auth
- ✅ Profile creation via `handle_new_user()` trigger
- ✅ Role-based routing (subscriber, employee, admin)
- ✅ Middleware protection on all routes
- ✅ Login with retry logic and API fallback

#### **Subscriber Features**
- ✅ Letter generation with Gemini AI
- ✅ Status flow: `generating` → `pending_review` → `under_review` → `completed/rejected`
- ✅ Free trial (first letter free)
- ✅ Subscription and allowance checks
- ✅ Letter list dashboard
- ✅ Letter detail view

#### **Admin Features**
- ✅ Admin dashboard for pending letters
- ✅ Review modal with AI improvement
- ✅ AI editor using Gemini (`/api/letters/[id]/improve`)
- ✅ Approve/reject workflow
- ✅ Audit trail logging for all actions
- ✅ Super user management endpoint

#### **Employee Features**
- ✅ Commission tracking dashboard
- ✅ Coupon usage tracking
- ✅ Automatic commission creation (5% rate)
- ✅ Commission trigger on subscription insert

#### **Database Functions**
- ✅ `deduct_letter_allowance()` - Deducts credits with super user check
- ✅ `log_letter_audit()` - Records all status changes
- ✅ `check_letter_allowance()` - Non-destructive allowance check
- ✅ `reset_monthly_allowances()` - Resets credits monthly
- ✅ `add_letter_allowances()` - Adds credits on subscription
- ✅ `create_commission_for_subscription()` - Auto-creates commissions

#### **API Endpoints**
- ✅ `/api/generate-letter` - AI letter generation
- ✅ `/api/letters/[id]/improve` - AI improvement
- ✅ `/api/letters/[id]/approve` - Approve letter
- ✅ `/api/letters/[id]/reject` - Reject letter
- ✅ `/api/letters/[id]/start-review` - Start review
- ✅ `/api/letters/[id]/audit` - Audit trail viewer
- ✅ `/api/subscriptions/check-allowance` - Check remaining letters
- ✅ `/api/subscriptions/activate` - Activate subscription
- ✅ `/api/subscriptions/reset-monthly` - Monthly reset endpoint
- ✅ `/api/admin/super-user` - Grant/revoke unlimited access

#### **Documentation**
- ✅ `PLATFORM_ARCHITECTURE.md` - Complete system breakdown
- ✅ `DATABASE_FUNCTIONS.md` - All functions documented
- ✅ `GEMINI_INTEGRATION.md` - AI integration guide
- ✅ `FREE_TRIAL_IMPLEMENTATION.md` - Free trial flow
- ✅ `DASHBOARD_REVAMP_PLAN.md` - Dashboard specifications
- ✅ `SETUP.md` - Setup instructions
- ✅ `DEPLOYMENT.md` - Deployment guide

#### **Migrations**
- ✅ `001_setup_schema.sql` - Base tables
- ✅ `002_setup_rls.sql` - RLS policies
- ✅ `003_seed_data.sql` - Initial data
- ✅ `004_create_functions.sql` - Core functions
- ✅ `005_letter_allowance_system.sql` - Allowance logic
- ✅ `006_audit_trail.sql` - Audit system
- ✅ `007_add_missing_letter_statuses.sql` - Status enums
- ✅ `20251122000001_fix_profile_trigger.sql` - Profile fixes
- ✅ `20251122000002_fix_rls_policies.sql` - RLS fixes
- ✅ `20251122000003_add_missing_functions.sql` - Complete functions

---

### 🚧 Known TODOs / Next Phase

#### **High Priority**
- 🔲 `/api/create-checkout/route.ts` - Stripe integration
- 🔲 `/api/letters/[id]/pdf/route.ts` - PDF generation
- 🔲 `/api/letters/[id]/send-email/route.ts` - Email delivery
- 🔲 Subscription plan selection UI
- 🔲 Payment success/failure handling
- 🔲 Employee coupon dashboard page
- 🔲 Admin commission payment flow

#### **Medium Priority**
- 🔲 Real-time notifications (Supabase Realtime)
- 🔲 Email templates (welcome, letter approved, etc.)
- 🔲 Advanced analytics dashboard
- 🔲 Bulk operations (approve multiple letters)
- 🔲 Letter templates library
- 🔲 Export/import functionality

#### **Low Priority / Future**
- 🔲 Multi-language support
- 🔲 Mobile app
- 🔲 Webhook integrations
- 🔲 Advanced reporting
- 🔲 White-label customization

---

## 🎯 Quick Start for Developers

```bash
# 1. Clone and setup
git clone <repo-url>
cd main-main
cp .env.example .env.local

# 2. Install dependencies
pnpm install

# 3. Setup Supabase
# - Create project at supabase.com
# - Run all SQL scripts in order (001-007, then 20251122*)
# - Add env vars to .env.local

# 4. Run development server
pnpm dev

# 5. Test flows
# - Signup as subscriber
# - Generate free trial letter
# - Login as admin (create via Supabase)
# - Review and approve letter
```

---

## 📞 Support & Questions

For issues or questions:
1. Check `PLATFORM_ARCHITECTURE.md` for system overview
2. Check `DATABASE_FUNCTIONS.md` for function documentation
3. Check `GEMINI_INTEGRATION.md` for AI integration
4. Review SQL migrations in `scripts/` and `supabase/migrations/`

---

**Last Updated**: November 22, 2024  
**Status**: Production-ready core features, payment integration pending  
**Next Milestone**: Complete Stripe checkout + PDF generation
