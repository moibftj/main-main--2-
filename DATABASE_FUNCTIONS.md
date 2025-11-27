# Database Functions Implementation Guide

## Overview
This document describes all PostgreSQL functions implemented in the database and their corresponding API endpoints.

## Letter Status Flow

The complete letter lifecycle uses these statuses:

```
draft → generating → pending_review → under_review → approved/rejected → completed/failed
```

### Status Definitions:
- **`draft`** - Initial state, user hasn't submitted
- **`generating`** - AI is creating the letter content (Gemini API call in progress)
- **`pending_review`** - Letter generated successfully, waiting for admin review
- **`under_review`** - Admin has started reviewing the letter
- **`approved`** - Admin approved the letter (legacy, now uses `completed`)
- **`rejected`** - Admin rejected the letter, requires revision
- **`completed`** - Letter fully approved and ready for user
- **`failed`** - Generation or processing failed (AI error, allowance issue, etc.)

## Database Functions

### 1. `deduct_letter_allowance(u_id UUID)`
**Purpose**: Deducts one letter from a user's active subscription allowance.

**Parameters**:
- `u_id` - User ID (UUID)

**Returns**: `BOOLEAN` - `true` if deduction successful, `false` if no allowance available

**Logic**:
1. Checks if user is super user (unlimited access)
2. Finds active subscription for the user
3. Verifies credits_remaining > 0
4. Deducts 1 from both credits_remaining and remaining_letters
5. Returns true if successful

**Called by**:
- `/api/generate-letter` - When generating new letters
- `/api/letters/[id]/submit` - When submitting letters for review

**Example**:
```typescript
const { data, error } = await supabase.rpc('deduct_letter_allowance', {
  u_id: user.id
});
// Returns: true if successful, false if no allowance
```

---

### 2. `log_letter_audit(p_letter_id, p_action, p_old_status, p_new_status, p_notes, p_metadata)`
**Purpose**: Creates an audit trail entry for letter status changes.

**Parameters**:
- `p_letter_id` - Letter ID (UUID)
- `p_action` - Action performed (TEXT): 'created', 'submitted', 'review_started', 'approved', 'rejected'
- `p_old_status` - Previous status (TEXT, optional)
- `p_new_status` - New status (TEXT, optional)
- `p_notes` - Admin notes (TEXT, optional)
- `p_metadata` - Additional JSON data (JSONB, optional)

**Returns**: `VOID`

**Logic**:
1. Inserts entry into letter_audit_trail table
2. Automatically captures performed_by from auth.uid()
3. Timestamps with NOW()

**Called by**:
- `/api/letters/[id]/start-review` - When admin starts reviewing
- `/api/letters/[id]/approve` - When letter is approved
- `/api/letters/[id]/reject` - When letter is rejected

**Example**:
```typescript
await supabase.rpc('log_letter_audit', {
  p_letter_id: letterId,
  p_action: 'approved',
  p_old_status: 'pending_review',
  p_new_status: 'approved',
  p_notes: 'Letter looks good!'
});
```

---

### 3. `reset_monthly_allowances()`
**Purpose**: Resets letter allowances for all active monthly/yearly subscriptions.

**Parameters**: None

**Returns**: `VOID`

**Logic**:
1. Updates all active subscriptions that haven't been reset this month
2. Sets credits_remaining based on plan type:
   - `monthly_standard`: 4 letters
   - `monthly_premium`: 12 letters
   - `monthly`: 4 letters (legacy)
   - `yearly`: 8 letters (legacy)
3. Updates last_reset_at to NOW()

**Called by**:
- `/api/subscriptions/reset-monthly` - Via cron job or admin action

**Cron Setup**:
```bash
# Add to cron (runs 1st of each month at 00:00)
0 0 1 * * curl -X POST https://yourapp.com/api/subscriptions/reset-monthly \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Example**:
```typescript
const { error } = await supabase.rpc('reset_monthly_allowances');
```

---

### 4. `add_letter_allowances(sub_id UUID, plan_name TEXT)`
**Purpose**: Adds letter allowances to a subscription when activated.

**Parameters**:
- `sub_id` - Subscription ID (UUID)
- `plan_name` - Plan type (TEXT): 'one_time', 'monthly_standard', 'monthly_premium'

**Returns**: `VOID`

**Logic**:
1. Determines letter count based on plan:
   - `one_time`: 1 letter
   - `monthly_standard`: 4 letters
   - `monthly_premium`: 12 letters
2. Sets credits_remaining and remaining_letters
3. Updates last_reset_at to NOW()

**Called by**:
- `/api/subscriptions/activate` - When subscription payment completes

**Example**:
```typescript
await supabase.rpc('add_letter_allowances', {
  sub_id: subscriptionId,
  plan_name: 'monthly_premium'
});
```

---

### 5. `check_letter_allowance(u_id UUID)`
**Purpose**: Checks user's letter allowance without deducting.

**Parameters**:
- `u_id` - User ID (UUID)

**Returns**: Table with:
- `has_allowance` - BOOLEAN
- `remaining` - INT
- `plan_name` - TEXT
- `is_super` - BOOLEAN

**Logic**:
1. Checks if user is super user (returns 999 remaining)
2. Finds active subscription
3. Returns allowance details

**Called by**:
- `/api/subscriptions/check-allowance` - Dashboard UI, generation flow

**Example**:
```typescript
const { data } = await supabase
  .rpc('check_letter_allowance', { u_id: user.id })
  .single();
// Returns: { has_allowance: true, remaining: 3, plan_name: 'monthly_premium', is_super: false }
```

---

## API Endpoints

### Letter Generation & Review

#### `POST /api/generate-letter`
Generates AI letter and deducts allowance.
```typescript
// Request
{ recipientName, address, issueDescription, desiredOutcome }

// Response
{ letterId, content, status: 'pending_review' }
```

#### `POST /api/letters/[id]/submit`
Submits draft letter for review, deducts allowance.
```typescript
// Response
{ message: 'Letter submitted successfully' }
```

#### `POST /api/letters/[id]/start-review`
Admin starts review process, logs audit.
```typescript
// Response
{ message: 'Review started' }
```

#### `POST /api/letters/[id]/approve`
Admin approves letter, logs audit.
```typescript
// Request
{ approvedContent, adminNotes }

// Response
{ message: 'Letter approved' }
```

#### `POST /api/letters/[id]/reject`
Admin rejects letter, logs audit.
```typescript
// Request
{ reason }

// Response
{ message: 'Letter rejected' }
```

#### `GET /api/letters/[id]/audit`
Retrieves audit trail for a letter.
```typescript
// Response
{
  auditTrail: [
    {
      id, action, old_status, new_status, notes,
      performer: { id, email, full_name },
      created_at
    }
  ]
}
```

---

### Subscription Management

#### `GET /api/subscriptions/check-allowance`
Checks user's current letter allowance.
```typescript
// Response
{
  hasAllowance: true,
  remaining: 3,
  plan: 'monthly_premium',
  isSuper: false
}
```

#### `POST /api/subscriptions/activate`
Activates subscription and adds allowances.
```typescript
// Request
{ subscriptionId, planType }

// Response
{ message: 'Subscription activated successfully' }
```

#### `POST /api/subscriptions/reset-monthly`
Resets monthly allowances for all active subscriptions.
```typescript
// Headers
Authorization: Bearer $CRON_SECRET

// Response
{ message: 'Monthly allowances reset successfully' }
```

---

### Admin Features

#### `POST /api/admin/super-user`
Grants or revokes super user status (unlimited letters).
```typescript
// Request
{ userId, isSuperUser: true }

// Response
{ message: 'User granted super user status' }
```

#### `GET /api/admin/super-user`
Lists all super users.
```typescript
// Response
{
  superUsers: [
    { id, email, full_name, is_super_user: true }
  ]
}
```

---

## Database Triggers

### `handle_new_user()`
**Trigger**: `AFTER INSERT ON auth.users`

**Purpose**: Creates profile entry when user signs up.

**Logic**:
1. Extracts email, full_name, role from user metadata
2. Inserts into profiles table
3. Defaults role to 'subscriber' if not specified

---

### `create_commission_for_subscription()`
**Trigger**: `AFTER INSERT ON subscriptions`

**Purpose**: Creates commission entry when subscription uses employee coupon.

**Logic**:
1. Checks if subscription has coupon_code
2. Finds employee_id from employee_coupons table
3. Creates commission entry with 5% rate
4. Status defaults to 'pending'

---

### `update_updated_at_column()`
**Trigger**: `BEFORE UPDATE ON profiles, letters, subscriptions, employee_coupons`

**Purpose**: Automatically updates updated_at timestamp on row updates.

---

## Plan Types

| Plan Type | Letters | Price | Billing |
|-----------|---------|-------|---------|
| `one_time` | 1 | $10 | One-time |
| `monthly_standard` | 4 | $25/mo | Monthly |
| `monthly_premium` | 12 | $60/mo | Monthly |

---

## Testing Checklist

### ✅ Letter Generation Flow
- [ ] Non-super user generates letter → allowance deducted
- [ ] Super user generates letter → no deduction, unlimited
- [ ] User with 0 allowance → generation fails
- [ ] Audit trail logs 'created' action

### ✅ Review Workflow
- [ ] Admin starts review → audit logged
- [ ] Admin approves → status updated, audit logged
- [ ] Admin rejects → status updated, audit logged
- [ ] Audit trail retrieval works

### ✅ Subscription Management
- [ ] Activate subscription → allowances added correctly
- [ ] Monthly reset → credits replenished
- [ ] Check allowance → returns correct data
- [ ] Super user → always shows unlimited

### ✅ Commission System
- [ ] Subscription with coupon → commission created
- [ ] Commission rate is 5%
- [ ] Commission linked to employee

---

## Environment Variables

Add to `.env.local`:
```bash
# Required for monthly reset cron job
CRON_SECRET=your-secret-key-here

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI
GEMINI_API_KEY=your-gemini-api-key
```

---

## Migration Order

Apply in this order:
1. `001_setup_schema.sql` - Base tables
2. `002_setup_rls.sql` - Security policies
3. `003_seed_data.sql` - Initial data
4. `004_create_functions.sql` - Core functions
5. `005_letter_allowance_system.sql` - Allowance logic
6. `006_audit_trail.sql` - Audit system
7. `007_add_missing_letter_statuses.sql` - Status enums
8. `20251122000001_fix_profile_trigger.sql` - Profile fixes
9. `20251122000002_fix_rls_policies.sql` - RLS fixes
10. `20251122000003_add_missing_functions.sql` - **NEW: Complete functions**

---

## Next Steps

1. **Apply migration**: Run `20251122000003_add_missing_functions.sql` in Supabase SQL Editor
2. **Set up cron job**: Configure monthly reset at `0 0 1 * *`
3. **Test flows**: Run through checklist above
4. **Monitor**: Check audit trails and subscription statuses
5. **Add UI**: Create admin dashboard for super user management

---

## Support

For issues with database functions:
1. Check Supabase logs in Dashboard → Logs
2. Verify RLS policies aren't blocking function execution
3. Ensure service role key is set for admin operations
4. Check function execution with `SELECT * FROM pg_proc WHERE proname = 'function_name'`
