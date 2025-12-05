I've completed a comprehensive review of the Talk-To-My-Lawyer application. Here's what needs to be done:

🚨 CRITICAL ISSUES (Fix Immediately)

### Issue #1: Legal Liability in PDF Footer
**File:** `app/api/letters/[id]/pdf/route.ts:66`
**Problem:** The PDF claims "reviewed by a licensed attorney" but admins may not be attorneys. This is a serious legal risk.

**Steps to Fix:**
1. Open `app/api/letters/[id]/pdf/route.ts`
2. Locate line 66 where the footer text is generated
3. Change the text from "reviewed by a licensed attorney" to a neutral statement like "reviewed by an administrator"
4. Consider adding a disclaimer: "This document does not constitute legal advice"
5. Add a field to the admin/reviewer profile to track if they are a licensed attorney
6. Only display "reviewed by a licensed attorney" if the reviewer has `is_licensed_attorney: true`
7. Update the database schema to add `is_licensed_attorney BOOLEAN DEFAULT FALSE` to the profiles table
8. Test PDF generation with both attorney and non-attorney reviewers

---

### Issue #2: Race Condition in Free Trial
**File:** `app/api/generate-letter/route.ts:36-59`
**Problem:** Users can spam requests simultaneously to bypass credit limits.

**Steps to Fix:**
1. Open `app/api/generate-letter/route.ts`
2. Add a database-level lock or use a transaction with `SELECT FOR UPDATE`
3. Implement the fix:
   ```typescript
   // Start a transaction
   const { data, error } = await supabase.rpc('decrement_credits_atomic', {
     user_id: userId,
     amount: 1
   });
   ```
4. Create the atomic function in SQL:
   ```sql
   CREATE OR REPLACE FUNCTION decrement_credits_atomic(p_user_id UUID, p_amount INT)
   RETURNS INT AS $$
   DECLARE
     current_credits INT;
   BEGIN
     SELECT credits_remaining INTO current_credits
     FROM profiles WHERE id = p_user_id FOR UPDATE;
     
     IF current_credits >= p_amount THEN
       UPDATE profiles SET credits_remaining = credits_remaining - p_amount
       WHERE id = p_user_id;
       RETURN current_credits - p_amount;
     ELSE
       RETURN -1; -- Insufficient credits
     END IF;
   END;
   $$ LANGUAGE plpgsql;
   ```
5. Add a Redis-based rate limiter as an additional layer (e.g., 1 request per 5 seconds per user)
6. Test by sending 10 simultaneous requests and verify only 1 succeeds

---

### Issue #3: Free Trial Abuse
**File:** `app/api/generate-letter/route.ts:125-146`
**Problem:** Users can delete letters and regenerate infinitely.

**Steps to Fix:**
1. Track total letters ever generated, not just current count
2. Add `total_letters_generated INT DEFAULT 0` column to profiles table
3. Modify the credit check logic:
   ```typescript
   // Check total_letters_generated instead of current letter count
   if (profile.total_letters_generated >= FREE_TRIAL_LIMIT && !profile.has_subscription) {
     return NextResponse.json({ error: 'Free trial exhausted' }, { status: 403 });
   }
   ```
4. Increment `total_letters_generated` on every successful generation
5. Add a migration script to backfill existing users based on letter history
6. Consider adding `deleted_at` soft delete instead of hard delete for letters
7. Test: Create letter → Delete → Try to create again → Should fail if limit reached
⚠️ HIGH PRIORITY
Missing Audit Logging - Submit endpoint violates requirement to log ALL status changes

app/api/letters/[id]/submit/route.ts
Email Not Implemented - Send email button does nothing (just console.log)

app/api/letters/[id]/send-email/route.ts:35-46
No Subscription Cancellation - Users cannot cancel subscriptions (legal/UX issue)

Database Schema Mismatch - subscription_id missing from coupon_usage table but webhook tries to insert it

scripts/010_add_missing_functions.sql
Zero Test Coverage - Critical paths (payments, auth, letter generation) completely untested

📋 MEDIUM PRIORITY
Inconsistent Rate Limiting - Reject endpoint missing rate limits that approve has
Service Role Bypass - Profile creation uses service role, violating RLS pattern
Silent Webhook Failures - Coupon/commission errors logged but don't fail webhook
No Status Transition Validation - Can move between invalid states
Missing Database Indexes - Performance issues on stripe_customer_id, reviewed_by, etc.
N+1 Queries - Dashboard makes separate queries that should be combined
Duplicate Fields - credits_remaining vs remaining_letters causing confusion
🔧 LOW PRIORITY (Polish)
No Loading States - Pages flash empty content during fetch
Inconsistent Error Messages - Some expose internals, should use generic messages in production
97 Console.log Statements - Need proper logging library
Missing Letter Deletion - Privacy concern, no way to remove letters
No Admin Notifications - Admins must manually check for pending reviews
📊 TOTAL BREAKDOWN
33 issues identified
1 Critical (legal liability)
7 High severity
16 Medium severity
9 Low severity
Would you like me to:

Start fixing the critical issues immediately?
Create a detailed action plan for addressing all issues?
Focus on a specific category (security, database, testing, etc.)?
I recommend starting with Issue #1 (PDF legal claims) and Issue #2 (race condition) as they pose the highest risk.