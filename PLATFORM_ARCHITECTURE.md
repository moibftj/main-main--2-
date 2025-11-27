# Complete Platform Architecture & Workflow Breakdown

## 🏗️ System Architecture Overview

**Key Feature**: All subscriber-generated letters go through a **mandatory admin review process** in a dedicated admin portal before being finalized.

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Access Layer                        │
│  Authentication → Role Detection → Dashboard Routing             │
└─────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────┬──────────────────────┬──────────────────────┐
│   SUBSCRIBER    │      EMPLOYEE        │       ADMIN          │
│   Dashboard     │      Dashboard       │     Admin Portal     │
│ /dashboard/     │ /dashboard/          │ /secure-admin-       │
│ letters         │ commissions          │ gateway/review       │
│ subscription    │ coupons              │                      │
└─────────────────┴──────────────────────┴──────────────────────┘
```

---

## 🔐 1. USER AUTHENTICATION & AUTHORIZATION

### **File**: `/app/auth/login/page.tsx`

**Purpose**: Handles user login and role-based routing

**Process Flow**:
```
1. User enters email/password
2. Supabase Auth validates credentials
3. System fetches user profile with role (with retry logic)
4. If profile missing, creates via API fallback
5. User redirected based on role
```

**Code Breakdown**:

```typescript
// 1. CREATE SUPABASE CLIENT
const supabase = createClient()

// 2. SIGN IN WITH SUPABASE AUTH
const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
  email,
  password,
})

// 3. FETCH USER ROLE FROM PROFILES TABLE (with retry logic)
let profile = null
for (let i = 0; i < 3; i++) {
  const result = await supabase
    .from('profiles')
    .select('role')
    .eq('id', authData.user.id)
    .maybeSingle()
  
  profile = result.data
  if (profile) break
  
  // Wait before retrying
  if (i < 2) {
    await new Promise(resolve => setTimeout(resolve, 500))
  }
}

// 4. API FALLBACK (create profile if missing)
if (!profile) {
  await fetch('/api/create-profile', {
    method: 'POST',
    body: JSON.stringify({
      userId: authData.user.id,
      email: authData.user.email,
      role: 'subscriber'
    })
  })
}

// 5. ROLE-BASED REDIRECT
const roleRedirects: Record<string, string> = {
  'subscriber': '/dashboard/letters',
  'employee': '/dashboard/commissions',
  'admin': '/dashboard/admin/letters'
}
router.push(roleRedirects[profile?.role || 'subscriber'])
```

**Database Interactions**:
- Queries: `profiles` table for user role
- Trigger: `handle_new_user()` creates profile on signup
- RLS Policy: User can only read their own profile

---

## 🛡️ 2. MIDDLEWARE PROTECTION

### **File**: `/middleware.ts` + `/lib/supabase/middleware.ts`

**Purpose**: Protects routes and enforces role-based access with separate admin portal authentication

**Process Flow**:
```
1. Every request passes through middleware
2. Check for admin portal routes (separate auth system)
3. For regular routes: verify Supabase session
4. Check user role from profile
5. Allow/deny access or redirect
```

**Code Breakdown**:

```typescript
export async function updateSession(request: NextRequest) {
  const supabase = createServerClient(...)
  const { data: { user } } = await supabase.auth.getUser()
  
  // Get user role for route protection
  let userRole = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    userRole = profile?.role
  }

  const pathname = request.nextUrl.pathname

  // =========================================
  // ADMIN PORTAL PROTECTION (Separate Auth)
  // =========================================
  const adminPortalRoute = process.env.ADMIN_PORTAL_ROUTE || 'secure-admin-gateway'
  
  if (pathname.startsWith(`/${adminPortalRoute}`)) {
    // Allow login page without auth
    if (pathname === `/${adminPortalRoute}/login`) {
      return supabaseResponse
    }

    // Verify admin session for all other admin portal routes
    const adminSession = verifyAdminSessionFromRequest(request)
    if (!adminSession) {
      return NextResponse.redirect(`/${adminPortalRoute}/login`)
    }

    // Super admin route protection
    const superAdminRoutes = [
      `/${adminPortalRoute}/dashboard/users`,
      `/${adminPortalRoute}/dashboard/analytics`,
      `/${adminPortalRoute}/dashboard/commissions`,
      `/${adminPortalRoute}/dashboard/all-letters`,
    ]

    if (superAdminRoutes.some(route => pathname.startsWith(route))) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_super_user')
        .eq('id', adminSession.userId)
        .single()

      if (!profile || profile.role !== 'admin' || !profile.is_super_user) {
        return NextResponse.redirect(`/${adminPortalRoute}/review`)
      }
    }

    return supabaseResponse
  }

  // Block access to old admin routes
  if (pathname.startsWith('/dashboard/admin')) {
    return NextResponse.redirect('/dashboard')
  }

  // =========================================
  // REGULAR ROUTE PROTECTION
  // =========================================
  
  // Public routes
  if (pathname === '/' || pathname.startsWith('/auth')) {
    return supabaseResponse
  }

  // Require auth for dashboard
  if (!user && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect('/auth/login')
  }

  // Role-based routing
  if (user && userRole) {
    // Employees can't access subscriber routes
    if (userRole === 'employee' && 
        (pathname.startsWith('/dashboard/letters') || 
         pathname.startsWith('/dashboard/subscription'))) {
      return NextResponse.redirect('/dashboard/commissions')
    }

    // Subscribers can't access employee routes
    if (userRole === 'subscriber' && 
        (pathname.startsWith('/dashboard/commissions') || 
         pathname.startsWith('/dashboard/coupons'))) {
      return NextResponse.redirect('/dashboard/letters')
    }
  }

  return supabaseResponse
}
```

**Protected Routes Summary**:

| Route | Access |
|-------|--------|
| `/` | Public |
| `/auth/*` | Public |
| `/dashboard/letters` | Subscriber |
| `/dashboard/subscription` | Subscriber |
| `/dashboard/commissions` | Employee, Admin |
| `/dashboard/coupons` | Employee, Admin |
| `/secure-admin-gateway/login` | Public |
| `/secure-admin-gateway/review` | Admin (any) |
| `/secure-admin-gateway/dashboard/*` | Super Admin only |

---

## 🔒 3. ADMIN PORTAL AUTHENTICATION SYSTEM

### **File**: `/lib/auth/admin-session.ts`

**Purpose**: Separate authentication system for admin portal using environment-based credentials

**Key Features**:
- Custom session tokens stored in httpOnly cookies
- 30-minute session timeout with activity refresh
- Environment-based credentials (not database)
- Super admin vs regular admin distinction

**Code Breakdown**:

```typescript
const ADMIN_SESSION_COOKIE = 'admin_session'
const ADMIN_SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes

export interface AdminSession {
  userId: string
  email: string
  loginTime: number
  lastActivity: number
  portalKeyVerified: boolean
}

// Create admin session after successful login
export async function createAdminSession(userId: string, email: string): Promise<void> {
  const session: AdminSession = {
    userId,
    email,
    loginTime: Date.now(),
    lastActivity: Date.now(),
    portalKeyVerified: true
  }

  const cookieStore = await cookies()
  cookieStore.set(ADMIN_SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 1800, // 30 minutes
    path: '/'
  })
}

// Verify admin credentials against environment variables
export async function verifyAdminCredentials(
  email: string,
  password: string,
  portalKey: string
): Promise<{ success: boolean; userId?: string; error?: string }> {
  // Verify portal key
  if (portalKey !== process.env.ADMIN_PORTAL_KEY) {
    return { success: false, error: 'Invalid admin portal key' }
  }

  // Verify credentials
  if (email !== process.env.ADMIN_EMAIL || 
      password !== process.env.ADMIN_PASSWORD) {
    return { success: false, error: 'Invalid admin credentials' }
  }

  // Get admin user ID from database
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('email', email)
    .eq('role', 'admin')
    .single()

  if (!profile) {
    return { success: false, error: 'Admin account not found' }
  }

  return { success: true, userId: profile.id }
}

// Check if admin is super admin
export async function isSuperAdmin(): Promise<boolean> {
  const session = await verifyAdminSession()
  if (!session) return false

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_super_user')
    .eq('id', session.userId)
    .single()

  return profile?.role === 'admin' && profile?.is_super_user === true
}
```

**Admin Portal Routes**:

| Route | Purpose | Access |
|-------|---------|--------|
| `/secure-admin-gateway/login` | Admin login page | Public |
| `/secure-admin-gateway/review` | Review center | All Admins |
| `/secure-admin-gateway/review/[id]` | Review specific letter | All Admins |
| `/secure-admin-gateway/dashboard/users` | User management | Super Admin |
| `/secure-admin-gateway/dashboard/analytics` | Analytics | Super Admin |

---

## 📝 4. SUBSCRIBER WORKFLOW: LETTER GENERATION

### **Dashboard**: `/app/dashboard/letters/page.tsx`

**Features**:
- View all generated letters
- Create new letters
- Check allowance/credits
- View letter status

### **API Endpoint**: `/app/api/generate-letter/route.ts`

**Complete Process Flow**:

```
┌──────────────────────────────────────────────────────────────────┐
│ STEP 1: Authentication & Authorization                           │
└──────────────────────────────────────────────────────────────────┘
↓
const { data: { user } } = await supabase.auth.getUser()
if (!user) return 401 Unauthorized

const { data: profile } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .single()

if (profile?.role !== 'subscriber') return 403 Forbidden

┌──────────────────────────────────────────────────────────────────┐
│ STEP 2: Free Trial Check                                        │
└──────────────────────────────────────────────────────────────────┘
↓
const { count } = await supabase
  .from('letters')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', user.id)

const isFreeTrial = (count || 0) === 0

┌──────────────────────────────────────────────────────────────────┐
│ STEP 3: Subscription & Credit Check (if not free trial)         │
└──────────────────────────────────────────────────────────────────┘
↓
if (!isFreeTrial) {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('credits_remaining, status')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (!subscription || subscription.credits_remaining <= 0) {
    return 403 "No letter credits remaining"
  }
}

┌──────────────────────────────────────────────────────────────────┐
│ STEP 4: Create Letter Record (status: 'generating')             │
└──────────────────────────────────────────────────────────────────┘
↓
const { data: newLetter } = await supabase
  .from('letters')
  .insert({
    user_id: user.id,
    letter_type: letterType,
    title: `${letterType} - ${new Date().toLocaleDateString()}`,
    intake_data: intakeData,
    status: 'generating',
    created_at: NOW(),
    updated_at: NOW()
  })
  .select()
  .single()

┌──────────────────────────────────────────────────────────────────┐
│ STEP 5: Call OpenAI API (via Vercel AI SDK)                     │
└──────────────────────────────────────────────────────────────────┘
↓
import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'

const prompt = buildPrompt(letterType, intakeData)

const { text: generatedContent } = await generateText({
  model: openai("gpt-4-turbo"),
  system: "You are a professional legal attorney drafting formal legal letters...",
  prompt,
  temperature: 0.7,
  maxTokens: 2048,
})

┌──────────────────────────────────────────────────────────────────┐
│ STEP 6: Update Letter (status: 'pending_review')                │
└──────────────────────────────────────────────────────────────────┘
↓
await supabase
  .from('letters')
  .update({
    ai_draft_content: generatedContent,
    status: 'pending_review',
    updated_at: NOW()
  })
  .eq('id', newLetter.id)

┌──────────────────────────────────────────────────────────────────┐
│ STEP 7: Deduct Letter Allowance (if not free trial)             │
└──────────────────────────────────────────────────────────────────┘
↓
if (!isFreeTrial) {
  const { data: canDeduct } = await supabase.rpc('deduct_letter_allowance', {
    u_id: user.id
  })
  // RPC function checks super_user status and deducts from subscription
}

┌──────────────────────────────────────────────────────────────────┐
│ STEP 8: Log Audit Trail                                         │
└──────────────────────────────────────────────────────────────────┘
↓
await supabase.rpc('log_letter_audit', {
  p_letter_id: newLetter.id,
  p_action: 'created',
  p_old_status: 'generating',
  p_new_status: 'pending_review',
  p_notes: 'Letter generated successfully by AI'
})

┌──────────────────────────────────────────────────────────────────┐
│ STEP 9: Return Response to User                                 │
└──────────────────────────────────────────────────────────────────┘
↓
return {
  success: true,
  letterId: newLetter.id,
  status: 'pending_review',
  isFreeTrial,
  aiDraft: generatedContent
}
```

**Error Handling**:
```typescript
catch (generationError) {
  // Mark letter as failed
  await supabase
    .from('letters')
    .update({ status: 'failed', updated_at: NOW() })
    .eq('id', newLetter.id)
  
  // Log failure in audit trail
  await supabase.rpc('log_letter_audit', {
    p_letter_id: newLetter.id,
    p_action: 'generation_failed',
    p_old_status: 'generating',
    p_new_status: 'failed',
    p_notes: `Generation failed: ${error.message}`
  })
  
  return 500 "AI generation failed"
}
```

---

## 💳 5. SUBSCRIPTION & PAYMENT WORKFLOW

### **Component**: `/components/subscription-card.tsx`

**Available Plans**:

| Plan ID | Name | Price | Credits |
|---------|------|-------|---------|
| `one_time` | Single Letter | $299 | 1 |
| `standard_4_month` | Monthly Plan | $299 | 4/month |
| `premium_8_month` | Yearly Plan | $599 | 8/year |

### **API Endpoint**: `/app/api/create-checkout/route.ts`

**Complete Process Flow**:

```
┌──────────────────────────────────────────────────────────────────┐
│ STEP 1: Validate Coupon Code (if provided)                      │
└──────────────────────────────────────────────────────────────────┘
↓
if (couponCode) {
  const { data: coupon } = await supabase
    .from('employee_coupons')
    .select('*')
    .eq('code', couponCode)
    .eq('is_active', true)
    .single()

  if (coupon) {
    discount = coupon.discount_percent
    employeeId = coupon.employee_id
    
    // TALK3 and other 100% discount codes make user super_user
    if (discount === 100) {
      isSuperUserCoupon = true
    }
  }
}

┌──────────────────────────────────────────────────────────────────┐
│ STEP 2: Calculate Final Price                                   │
└──────────────────────────────────────────────────────────────────┘
↓
const basePrice = selectedPlan.price
const discountAmount = (basePrice * discount) / 100
const finalPrice = basePrice - discountAmount

┌──────────────────────────────────────────────────────────────────┐
│ STEP 3A: Free Subscription (100% discount)                      │
└──────────────────────────────────────────────────────────────────┘
↓
if (finalPrice === 0) {
  // Create subscription directly (no Stripe needed)
  const { data: subscription } = await supabase
    .from('subscriptions')
    .insert({
      user_id: user.id,
      plan: planType,
      status: 'active',
      price: 0,
      discount: discountAmount,
      coupon_code: couponCode,
      remaining_letters: selectedPlan.letters,
      credits_remaining: selectedPlan.letters
    })
    .select()
    .single()

  // Mark user as super_user if 100% discount
  if (isSuperUserCoupon) {
    await supabase
      .from('profiles')
      .update({ is_super_user: true })
      .eq('id', user.id)
  }

  // Track coupon usage
  await supabase.from('coupon_usage').insert({
    user_id: user.id,
    coupon_code: couponCode,
    employee_id: employeeId,
    discount_percent: discount,
    amount_before: basePrice,
    amount_after: finalPrice
  })

  return { success: true, subscriptionId: subscription.id }
}

┌──────────────────────────────────────────────────────────────────┐
│ STEP 3B: Paid Subscription (Stripe Checkout)                    │
└──────────────────────────────────────────────────────────────────┘
↓
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  payment_method_types: ['card'],
  line_items: [{
    price_data: {
      currency: 'usd',
      product_data: {
        name: selectedPlan.name,
        description: `${selectedPlan.letters} Legal Letters`
      },
      unit_amount: Math.round(finalPrice * 100) // cents
    },
    quantity: 1
  }],
  success_url: `${origin}/dashboard/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${origin}/dashboard/subscription?canceled=true`,
  metadata: {
    user_id: user.id,
    plan_type: planType,
    letters: selectedPlan.letters,
    coupon_code: couponCode || '',
    employee_id: employeeId || ''
  }
})

return { sessionId: session.id, url: session.url }
```

### **API Endpoint**: `/app/api/verify-payment/route.ts`

Called after Stripe redirects back to create the subscription record.

---

## 💼 6. EMPLOYEE WORKFLOW: COMMISSION TRACKING

### **Dashboard**: `/app/dashboard/coupons/page.tsx`

**Features**:
- View personal coupon code
- Track total redemptions
- See total revenue generated
- View commission earnings

### **Dashboard**: `/app/dashboard/commissions/page.tsx`

**Features**:
- View commission history
- See total earned, pending, and paid amounts
- Track monthly earnings

**Data Flow**:

```typescript
// EMPLOYEE SEES THEIR COUPON
const { data: coupon } = await supabase
  .from('employee_coupons')
  .select('*')
  .eq('employee_id', profile.id)
  .single()

// COUPON USAGE STATISTICS
const { data: usageStats } = await supabase
  .from('coupon_usage')
  .select('*')
  .eq('employee_id', profile.id)

// COMMISSION RECORDS
const { data: commissions } = await supabase
  .from('commissions')
  .select(`
    *,
    subscriptions!inner (
      user_id,
      plan,
      price
    )
  `)
  .eq('employee_id', profile.id)
  .order('created_at', { ascending: false })

// STATISTICS
const totalEarned = commissions?.reduce((sum, c) => sum + Number(c.commission_amount), 0)
const pendingAmount = commissions?.filter(c => c.status === 'pending')
  .reduce((sum, c) => sum + Number(c.commission_amount), 0)
const paidAmount = commissions?.filter(c => c.status === 'paid')
  .reduce((sum, c) => sum + Number(c.commission_amount), 0)
```

**Commission Creation (Database Trigger)**:

```sql
CREATE OR REPLACE FUNCTION create_commission_for_subscription()
RETURNS TRIGGER AS $$
DECLARE
    emp_id UUID;
BEGIN
    -- Only create commission if coupon_code is present
    IF NEW.coupon_code IS NOT NULL THEN
        -- Get employee_id from coupon
        SELECT employee_id INTO emp_id
        FROM employee_coupons
        WHERE code = NEW.coupon_code;
        
        -- Only create if employee exists (not a promo code like TALK3)
        IF emp_id IS NOT NULL THEN
            INSERT INTO commissions (
                employee_id,
                subscription_id,
                commission_rate,
                subscription_amount,
                commission_amount,
                status
            ) VALUES (
                emp_id,
                NEW.id,
                0.05, -- 5% commission rate
                NEW.price,
                NEW.price * 0.05,
                'pending'
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger fires AFTER subscription insert
CREATE TRIGGER create_commission_on_subscription
    AFTER INSERT ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION create_commission_for_subscription();
```

---

## 👨‍💼 7. ADMIN WORKFLOW: LETTER REVIEW & APPROVAL

### **Review Center**: `/app/secure-admin-gateway/review/page.tsx`

**Features**:
- View all pending letters (FIFO order)
- See pending vs under_review counts
- Start review on any letter
- Track waiting time for each letter

### **Review Page**: `/app/secure-admin-gateway/review/[id]/page.tsx`

### **Component**: `/components/review-letter-modal.tsx`

**Complete Admin Review Process**:

```
┌──────────────────────────────────────────────────────────────────┐
│ STEP 1: Admin Views Pending Letters                             │
└──────────────────────────────────────────────────────────────────┘
↓
// Review center shows letters with status = 'pending_review' or 'under_review'
const { data: letters } = await supabase
  .from('letters')
  .select(`
    *,
    profiles!letters_user_id_fkey (
      id, full_name, email
    )
  `)
  .in('status', ['pending_review', 'under_review'])
  .order('created_at', { ascending: true }) // FIFO: Oldest first

┌──────────────────────────────────────────────────────────────────┐
│ STEP 2: Admin Clicks "Start Review" Button                      │
└──────────────────────────────────────────────────────────────────┘
↓
// API: /app/api/letters/[id]/start-review/route.ts

await supabase
  .from('letters')
  .update({
    status: 'under_review',
    reviewed_by: adminSession.userId,
    updated_at: NOW()
  })
  .eq('id', letterId)

await supabase.rpc('log_letter_audit', {
  p_letter_id: letterId,
  p_action: 'review_started',
  p_old_status: 'pending_review',
  p_new_status: 'under_review',
  p_notes: 'Admin started reviewing the letter'
})

┌──────────────────────────────────────────────────────────────────┐
│ STEP 3: Review Modal Opens                                      │
└──────────────────────────────────────────────────────────────────┘
↓
// Component: /components/review-letter-modal.tsx

<ReviewLetterModal>
  {/* Letter Information */}
  <div>Type: {letter.letter_type}</div>
  <div>From: {letter.profiles?.full_name}</div>
  <div>Email: {letter.profiles?.email}</div>
  
  {/* Editable Content with Rich Text Editor */}
  <RichTextEditor
    content={finalContent}
    onChange={setFinalContent}
  />
  
  {/* AI IMPROVEMENT SECTION */}
  <Input 
    placeholder="How should the AI improve this letter?"
    value={aiInstruction}
  />
  <Button onClick={handleAiImprove}>
    <Wand2 /> AI Improve
  </Button>
  
  {/* Internal Review Notes */}
  <Textarea 
    placeholder="Internal notes (not shown to client)"
    value={reviewNotes}
  />
  
  {/* Action Buttons */}
  <Button onClick={() => setAction('approve')}>Approve Letter</Button>
  <Button onClick={() => setAction('reject')}>Reject Letter</Button>
</ReviewLetterModal>

┌──────────────────────────────────────────────────────────────────┐
│ STEP 4: Admin Uses AI to Improve Letter (Optional)              │
└──────────────────────────────────────────────────────────────────┘
↓
// API: /app/api/letters/[id]/improve/route.ts

const { text: improvedContent } = await generateText({
  model: openai("gpt-4-turbo"),
  system: "You are a professional legal attorney improving formal legal letters...",
  prompt: `Current letter:\n${content}\n\nImprovement instruction: ${instruction}`,
  temperature: 0.7,
  maxTokens: 2048,
})

return { improvedContent }

┌──────────────────────────────────────────────────────────────────┐
│ STEP 5A: Admin Approves Letter                                  │
└──────────────────────────────────────────────────────────────────┘
↓
// API: /app/api/letters/[id]/approve/route.ts

await supabase
  .from('letters')
  .update({
    status: 'approved',
    final_content: finalContent,
    review_notes: reviewNotes,
    reviewed_by: adminSession.userId,
    reviewed_at: NOW(),
    approved_at: NOW(),
    updated_at: NOW()
  })
  .eq('id', letterId)

await supabase.rpc('log_letter_audit', {
  p_letter_id: letterId,
  p_action: 'approved',
  p_old_status: 'under_review',
  p_new_status: 'approved',
  p_notes: reviewNotes || 'Letter approved by admin'
})

// SUBSCRIBER CAN NOW VIEW AND DOWNLOAD THE LETTER

┌──────────────────────────────────────────────────────────────────┐
│ STEP 5B: Admin Rejects Letter (Alternative)                     │
└──────────────────────────────────────────────────────────────────┘
↓
// API: /app/api/letters/[id]/reject/route.ts

await supabase
  .from('letters')
  .update({
    status: 'rejected',
    rejection_reason: rejectionReason,
    review_notes: reviewNotes,
    reviewed_by: adminSession.userId,
    reviewed_at: NOW(),
    updated_at: NOW()
  })
  .eq('id', letterId)

await supabase.rpc('log_letter_audit', {
  p_letter_id: letterId,
  p_action: 'rejected',
  p_old_status: 'under_review',
  p_new_status: 'rejected',
  p_notes: `Rejection reason: ${rejectionReason}`
})

// SUBSCRIBER SEES REJECTION REASON AND CAN REVISE

┌──────────────────────────────────────────────────────────────────┐
│ STEP 6: Mark as Completed (Optional Final Step)                 │
└──────────────────────────────────────────────────────────────────┘
↓
// API: /app/api/letters/[id]/complete/route.ts

// Can only complete approved letters
if (letter.status !== 'approved') {
  return 400 "Letter must be approved before completion"
}

await supabase
  .from('letters')
  .update({
    status: 'completed',
    completed_at: NOW(),
    updated_at: NOW()
  })
  .eq('id', letterId)
```

---

## 🔄 8. COMPLETE LETTER LIFECYCLE

```
┌─────────────┐
│   DRAFT     │ ← User creates but hasn't submitted
└──────┬──────┘
       ↓ User clicks "Generate"
┌─────────────┐
│ GENERATING  │ ← AI is creating content (OpenAI GPT-4-turbo)
└──────┬──────┘
       ↓ API Success
┌─────────────┐
│PENDING      │ ← Waiting for admin review
│REVIEW       │
└──────┬──────┘
       ↓ Admin clicks "Start Review"
┌─────────────┐
│UNDER_REVIEW │ ← Admin is reviewing/editing with AI assistance
└──────┬──────┘
       ↓ Admin clicks "Approve" or "Reject"
       │
   ┌───┴───┐
   ↓       ↓
┌─────┐ ┌─────────┐
│APPRO│ │REJECTED │ ← Subscriber must revise
│VED  │ └─────────┘
└──┬──┘
   ↓ Optional: Admin marks complete
┌─────────┐
│COMPLETED│ ← Final state after delivery
└─────────┘

SPECIAL STATUS:
┌─────────┐
│ FAILED  │ ← Generation error, no allowance, API failure
└─────────┘
```

**Status Meanings**:
- **draft**: Initial state, user created but hasn't submitted
- **generating**: AI is creating the letter (OpenAI API call in progress)
- **pending_review**: Letter generated, waiting in admin queue
- **under_review**: Admin has opened and is reviewing the letter
- **approved**: Admin approved, subscriber can view and download
- **completed**: Letter delivered/completed (optional final state)
- **rejected**: Admin rejected, subscriber must revise
- **failed**: Error occurred (AI failed, no credits, etc.)

---

## 📄 9. POST-APPROVAL ACTIONS

### **PDF Generation**: `/app/api/letters/[id]/pdf/route.ts`

Generates a PDF document from the approved letter content.

### **Email Sending**: `/app/api/letters/[id]/send-email/route.ts`

Sends the letter via email to the specified recipient.

### **Letter Resubmission**: `/app/api/letters/[id]/resubmit/route.ts`

Allows subscribers to resubmit a rejected letter for re-review.

---

## 🗄️ 10. DATABASE SCHEMA

### **profiles**
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE,
  full_name TEXT,
  role user_role DEFAULT 'subscriber', -- 'subscriber', 'employee', 'admin'
  is_super_user BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **letters**
```sql
CREATE TABLE letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  letter_type TEXT NOT NULL,
  title TEXT,
  status letter_status DEFAULT 'draft',
  intake_data JSONB,
  ai_draft_content TEXT,
  final_content TEXT,
  admin_edited_content TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  rejection_reason TEXT,
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **subscriptions**
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  plan TEXT NOT NULL,
  plan_type TEXT,
  status subscription_status DEFAULT 'active',
  price NUMERIC(10,2),
  discount NUMERIC(10,2) DEFAULT 0,
  coupon_code TEXT,
  credits_remaining INTEGER DEFAULT 0,
  remaining_letters INTEGER DEFAULT 0,
  stripe_session_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  last_reset_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **employee_coupons**
```sql
CREATE TABLE employee_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES profiles(id), -- NULL for promo codes like TALK3
  code TEXT UNIQUE NOT NULL,
  discount_percent INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **coupon_usage**
```sql
CREATE TABLE coupon_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  employee_id UUID REFERENCES profiles(id),
  coupon_code TEXT NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id),
  discount_percent INTEGER DEFAULT 0,
  amount_before NUMERIC(10,2),
  amount_after NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **commissions**
```sql
CREATE TABLE commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES profiles(id),
  subscription_id UUID REFERENCES subscriptions(id),
  commission_rate NUMERIC(5,4) DEFAULT 0.05, -- 5%
  subscription_amount NUMERIC(10,2),
  commission_amount NUMERIC(10,2),
  status commission_status DEFAULT 'pending', -- 'pending', 'paid'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **letter_audit_trail**
```sql
CREATE TABLE letter_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id UUID REFERENCES letters(id),
  action TEXT NOT NULL,
  performed_by UUID REFERENCES profiles(id),
  old_status TEXT,
  new_status TEXT,
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔐 11. ENVIRONMENT VARIABLES

### **Required Variables**:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# OpenAI (AI SDK)
OPENAI_API_KEY=sk-...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Admin Portal
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure-password
ADMIN_PORTAL_KEY=random-secret-key
ADMIN_PORTAL_ROUTE=secure-admin-gateway  # Optional, defaults to 'secure-admin-gateway'

# App
NEXT_PUBLIC_APP_URL=https://www.talk-to-my-lawyer.com
```

---

## 👑 12. SUPER USER SYSTEM

Users with `is_super_user = true` in profiles have special privileges:

- **Unlimited letter generation** (no credit deduction)
- **Access to super admin routes** in admin portal
- **Automatically granted** when using TALK3 coupon (100% discount)

**Check in code**:
```typescript
// RPC function
const { data: canDeduct } = await supabase.rpc('deduct_letter_allowance', {
  u_id: user.id
})
// Returns TRUE without deducting if user is super_user
```

---

## 🚀 COMPLETE FLOW SUMMARY

```
USER SIGNUP
    ↓
[handle_new_user() trigger creates profile with role='subscriber']
    ↓
LOGIN
    ↓
[Middleware checks role and redirects to correct dashboard]
    ↓
┌──────────────────┬───────────────────┬─────────────────────────┐
│   SUBSCRIBER     │    EMPLOYEE       │        ADMIN            │
│   /dashboard/    │    /dashboard/    │  /secure-admin-gateway/ │
└──────────────────┴───────────────────┴─────────────────────────┘
        ↓                  ↓                       ↓
  Generate Letter    View Coupons           View Pending
        ↓                  ↓                   Letters
  [generating]       Track Usage                  ↓
        ↓            View Commissions       Start Review
  [OpenAI API]                                    ↓
        ↓                                  [under_review]
  [pending_review]                                ↓
        ↓                                  Edit Content
        ↓←─────────────────────────────Use AI Improve
        ↓                                        ↓
        ↓                                Approve/Reject
        ↓                                        ↓
  [approved/rejected]                   [Log Audit Trail]
        ↓                                        ↓
  Download PDF                            Update Status
  Send Email                                     ↓
        ↓                                  Notify User
  [completed]
```

---

## 📋 API ROUTES REFERENCE

| Route | Method | Purpose | Access |
|-------|--------|---------|--------|
| `/api/generate-letter` | POST | Generate new letter | Subscriber |
| `/api/create-checkout` | POST | Create Stripe checkout | Subscriber |
| `/api/verify-payment` | POST | Verify payment & create subscription | Subscriber |
| `/api/create-profile` | POST | Create user profile | Internal |
| `/api/letters/[id]/start-review` | POST | Start admin review | Admin |
| `/api/letters/[id]/approve` | POST | Approve letter | Admin |
| `/api/letters/[id]/reject` | POST | Reject letter | Admin |
| `/api/letters/[id]/complete` | POST | Mark as completed | Admin |
| `/api/letters/[id]/improve` | POST | AI improve content | Admin |
| `/api/letters/[id]/pdf` | GET | Generate PDF | Subscriber/Admin |
| `/api/letters/[id]/send-email` | POST | Send via email | Subscriber |
| `/api/letters/[id]/resubmit` | POST | Resubmit rejected letter | Subscriber |
| `/api/letters/[id]/audit` | GET | Get audit trail | Admin |
| `/api/admin-auth/login` | POST | Admin portal login | Public |
| `/api/admin-auth/logout` | POST | Admin portal logout | Admin |

---

**This is your complete platform architecture!** 🎉