# Free Trial & Pricing Overlay Implementation

## Overview
The first letter generation is now **completely free** as a trial. After the draft is generated, users see a pricing overlay with subscription options.

## Changes Made

### 1. Free Trial Logic (`app/api/generate-letter/route.ts`)
- ✅ Checks if user has generated any letters before
- ✅ First letter generation bypasses subscription check
- ✅ Subsequent letters require active subscription
- ✅ Returns `isFreeTrial` flag to frontend

### 2. Pricing Overlay (`app/dashboard/letters/new/page.tsx`)
- ✅ Shows blurred content with pricing overlay after free trial generation
- ✅ Displays all 3 pricing plans ($299 single, $299/mo, $599/yr)
- ✅ "Preview letter draft" link to close overlay and see content
- ✅ Users can only submit for review if they have a subscription (not on free trial)

### 3. Removed All AI Mentions
Replaced with professional attorney-focused language:

#### Frontend Pages:
- ✅ `app/page.tsx` - Changed "AI-Powered" to "Professional Drafting"
- ✅ `app/layout.tsx` - Updated metadata title
- ✅ `app/dashboard/letters/new/page.tsx` - "Attorney-Generated Draft"
- ✅ `app/dashboard/admin/letters/page.tsx` - "Draft Preview" (not "AI Draft")

#### Backend:
- ✅ API routes continue to use Gemini internally (backend only)
- ✅ Database columns remain unchanged (ai_draft_content for internal use)
- ✅ User-facing text shows no AI mentions

## User Flow


### First Time User (Free Trial)
1. Sign up → Create account
2. Go to "New Letter" → Fill form
3. Click "Generate Legal Letter" → Draft is generated and sent for admin review
4. **Pricing overlay appears** (content remains blurred, draft is NOT shown)
5. Cannot preview draft; must subscribe to proceed
6. Admin reviews, edits, and approves the letter
7. After admin approval, letter appears in subscriber's "My Letters" area

### Subscribed User
1. Fill letter form
2. Generate letter → Draft created
3. No pricing overlay (already subscribed)
4. Can submit for attorney review
5. After approval, can download/email

## Pricing Plans Displayed
1. **Single Letter** - $299 one-time
2. **Monthly** - $299/month (4 letters)
3. **Yearly** - $599/year (8 letters)

## Technical Details

### Subscription Check Logic
\`\`\`typescript
// Check if first letter (free trial)
const { count } = await supabase
  .from('letters')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', user.id)

const isFreeTrial = (count || 0) === 0

// Only check subscription if not free trial
if (!isFreeTrial) {
  // Require active subscription
}
\`\`\`

### Frontend Overlay State
\`\`\`typescript
const [showPricingOverlay, setShowPricingOverlay] = useState(false)
const [isFreeTrial, setIsFreeTrial] = useState(false)

// Show overlay only for free trial
setShowPricingOverlay(isFree)
\`\`\`

## What Users See


### Before Subscription:
- ✅ Can generate ONE draft for free
- ✅ See pricing overlay with blurred content
- ❌ Cannot view draft (must go through admin review)
- ❌ Cannot submit for attorney review
- ❌ Cannot generate additional letters


### After Subscription:
- ✅ Generate letters based on plan limits
- ✅ View draft after admin review
- ✅ Download approved letters as PDF
- ✅ Email letters directly

## No AI Branding
All user-facing content now says:
- "Attorney-Generated Draft"
- "Professional Drafting"
- "Legal Team Review"
- "Attorney Review"

The backend still uses Gemini/AI but this is completely hidden from users.
