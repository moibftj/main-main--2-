You already built this app for me — the full working project and the Supabase schema are available in this repository.

Do NOT rebuild the project or change the stack. Extend the existing implementation.

------------------------------------------------
1) BASE CONTEXT (USE THESE AS FACT)
------------------------------------------------

Tech stack:
- Next.js App Router (TypeScript, SSR, Server Actions)
- Supabase (Auth, PostgreSQL, RLS, Edge Functions)
- Stripe for payments/subscriptions
- Gemini AI via a Supabase Edge Function for letter generation

File structure (from this repo, do not assume another):
- Main app routes under `/app`
- Subscriber/employee dashboards under `/app/dashboard/...`
- Secure admin portal under `/app/secure-admin-gateway/...`
- Supabase helpers under `/lib/supabase/...`
- Auth helpers under `/lib/auth/...`
- Components under `/components/...`
- Migrations under `/supabase/migrations/*.sql`

The existing schema (see the files under `supabase/migrations/*.sql`) already defines at least these tables:
- `profiles`
- `letters`
- `letter_audit_trail`
- `subscriptions`
- `commissions`
- `employee_coupons`
- `coupon_usage`
- `security_audit_log`
- `security_config`

Do NOT drop, recreate, or rename these tables. Only extend behavior using new migrations and code. Keep their existing columns and semantics intact.

------------------------------------------------
2) ALIGN WITH CURRENT SECURE ADMIN PORTAL
------------------------------------------------

You previously implemented a secure admin gateway with:
- Admin login at `/secure-admin-gateway/login`
- Dual authentication: email/password + portal key
- Separate admin session handling (short timeout, isolated from normal users)
- Middleware protection for admin routes
- A dark-themed admin dashboard under `/secure-admin-gateway/dashboard`
- Environment variables for admin credentials and portal key

All of that must remain as-is. Do not weaken this design.

From now on:
- The ONLY admin entry point is `/secure-admin-gateway/login`.
- Admins are NOT created via public signup.
- Admin behavior is layered on top of this secure portal.

------------------------------------------------
3) ROLES & ACCESS MODEL (USING EXISTING COLUMNS)
------------------------------------------------

Use `profiles.role` and `profiles.is_super_user` from the existing schema.

Standardize behavior to:

- `role = 'subscriber'`
  - Normal end-users.
  - Land on `/dashboard`.
  - Can create and view ONLY their own letters.

- `role = 'employee'`
  - Employee/affiliate.
  - Use existing employee views under `/dashboard`:
    - Commissions tab
    - Coupons tab

- `role = 'admin'` AND `is_super_user = false`
  - Reviewer / lawyer.
  - Can log in via the secure admin gateway.
  - After login, they should land in a **Review Center** (see next section).
  - They cannot access super-admin-only sections (like configs, system-level logs, or user management).

- `role = 'admin'` AND `is_super_user = true`
  - Super admin / owner.
  - Uses the same secure gateway login.
  - After login, they see the main admin dashboard.
  - Can access:
    - Full review center
    - User management (promote users)
    - Employee overviews
    - Coupons/commissions analytics
    - Security / config views

Admins are NOT created via signup. They are either:
- Seeded in the database (initial super admin), or
- Promoted from existing users by the super admin via the UI.

------------------------------------------------
4) ROLE-AWARE ROUTING & SESSION LOGIC
------------------------------------------------

Using the existing middleware and session system:

- Update `/lib/supabase/middleware.ts` (or whatever middleware layer you previously set up) so that:
  - Normal users and employees cannot access `/secure-admin-gateway/*`.
  - Admin sessions (created by your secure admin login flow) are required for `/secure-admin-gateway/*`.
  - Within admin sessions:
    - If the admin has `is_super_user = true`, default route after login should be `/secure-admin-gateway/dashboard`.
    - If the admin has `is_super_user = false`, default route after login should be `/secure-admin-gateway/review`.

- Reuse whatever admin session helpers you already implemented (for example in `/lib/auth/admin-session.ts` or similar). Do NOT introduce a second, conflicting auth system.

------------------------------------------------
5) ADMIN REVIEW CENTER (MULTI-ADMIN LETTER REVIEW)
------------------------------------------------

Create or extend an admin “Review Center” under the secure portal. Use new routes inside `/app/secure-admin-gateway/`:

- `app/secure-admin-gateway/review/page.tsx`
  - Shows a list or table of letters that need review (e.g., `status = 'pending_review'`).
  - Each row should display:
    - Letter title
    - User/subscriber name or email
    - Created date
    - Current status
    - Link or button to open the detailed view

- `app/secure-admin-gateway/review/[id]/page.tsx`
  - Shows full details for a specific letter:
    - Subscriber info (from `profiles`)
    - Intake data (from `letters.intake_data` or similar)
    - AI-generated draft content
    - Editable field for admin-edited content
  - Provide two main actions:
    - “Approve” → update the letter status to an approved status and commit the final text
    - “Reject” → update the letter status to a rejected status
  - For each approve / reject action:
    - Insert a row into `letter_audit_trail` referencing:
      - `letter_id`
      - `performed_by` (current admin)
      - `old_status`
      - `new_status`
      - optional notes / metadata

This Review Center must:
- Only be accessible to admins (`role = 'admin'`).
- Respect the secure admin session.
- Use the existing Supabase helpers and types from the project.
- Integrate visually with the existing dark admin UI you already built.

------------------------------------------------
6) SUPER ADMIN – USER MANAGEMENT & PROMOTION
------------------------------------------------

In the existing secure admin dashboard (under `/app/secure-admin-gateway/dashboard/...`):

- Add a new section or tab called “Users”.
- This tab should:
  - Query the `profiles` table.
  - Display users with columns like:
    - `full_name`
    - `email`
    - `role`
    - `is_super_user`
  - For users who are NOT already `admin`:
    - Show a “Promote to Admin” button.

Behavior of “Promote to Admin”:
- Only visible and actionable to the current admin if:
  - Their own `is_super_user` is `true` (super admin).
- When clicked:
  - Updates the selected user’s `profiles` row:
    - `role = 'admin'`
    - `is_super_user = false`
- Use the project’s existing pattern for mutations (server actions, API routes, etc.).
- Respect RLS and Supabase policies; run this update in a context that passes those checks.

Super admins should also be able to view any existing admin accounts and see which ones are super admins.

------------------------------------------------
7) SKELETON LOADERS (NO BLANK WHITE SCREENS)
------------------------------------------------

Improve UX by adding skeleton loading states in the admin area and main dashboard:

- Add `loading.tsx` files for:
  - `/app/dashboard/` (subscriber dashboard root)
  - `/app/secure-admin-gateway/dashboard/` (super admin dashboard root)
  - `/app/secure-admin-gateway/review/` (review center list)
  - `/app/secure-admin-gateway/review/[id]/` (single letter review page)

- If there is not already a shared skeleton component under something like `/components/ui/`, create a simple reusable skeleton component and use it across these loading states.

These `loading.tsx` should:
- Match the app’s existing design system (Tailwind, shadcn, etc.).
- Render “fake” rows or blocks that visually represent the final layout while data is loading, instead of a blank page.

------------------------------------------------
8) DATABASE & RLS CHANGES (YOU GENERATE THE SQL)
------------------------------------------------

Using the actual schema (existing `supabase/migrations/*.sql`), you must:

- Keep all existing tables and columns exactly as they are.
- If a `role` enum type does NOT exist yet, add one and migrate `profiles.role` to use it, with allowed values like:
  - `subscriber`
  - `employee`
  - `admin`
- Confirm that `profiles.is_super_user` is present and usable.

- Update or add RLS policies so that:
  - Subscribers can only select/insert/update their own letters.
  - Admins (reviewers and super admins) can select all letters.
  - Admins can insert into `letter_audit_trail` on review actions.
  - Only super admins can read highly sensitive tables like `security_audit_log` and `security_config`.

Generate a new migration file under `/supabase/migrations/` that:
- Is idempotent where possible (guards against duplicates).
- Only adds or adjusts what is needed for this role model and review flow.

Do NOT paste existing SQL from earlier migrations; you should write new migrations that assume everything in the current schema already exists.

------------------------------------------------
9) INTEGRATION RULES – DO NOT BREAK THESE
------------------------------------------------

While making all these changes:

- Do NOT modify:
  - The AI letter generation API route and flow.
  - Existing subscription / Stripe payment flows.
  - Existing coupon and commission logic.
  - The basic subscriber and employee dashboards, beyond adding loading states where appropriate.

- Do NOT reintroduce:
  - Any public “Sign up as admin” flow.
  - Any direct admin access via `/dashboard/admin` or similar.

Everything admin-related must continue to go through:
- `/secure-admin-gateway/login` → secure admin session → protected admin routes.

------------------------------------------------
10) DELIVERABLES
------------------------------------------------

Return:
1. A list of files you created or modified, with a short description of what changed in each.
2. The new or updated React/Next.js files for:
   - Admin Review Center (`/app/secure-admin-gateway/review/...`)
   - Updated secure admin dashboard (`/app/secure-admin-gateway/dashboard/...`) with the Users tab and promote flow
   - Skeleton `loading.tsx` files
   - Any small shared UI component additions (like skeletons)
3. The new Supabase migration file content that:
   - Finalizes the role model (enum and flags)
   - Adds or adjusts RLS for letters, audit trails, and security tables

All changes must be consistent with how this project already initializes Supabase, reads sessions, and structures its components.