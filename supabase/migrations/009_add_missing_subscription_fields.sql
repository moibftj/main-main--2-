-- Add missing fields to subscriptions table
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS credits_remaining INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS remaining_letters INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS plan_type TEXT,
ADD COLUMN IF NOT EXISTS last_reset_at TIMESTAMPTZ DEFAULT NOW();

-- Add missing fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_super_user BOOLEAN DEFAULT FALSE;

-- Update existing subscriptions to set plan_type based on plan
UPDATE subscriptions
SET plan_type = CASE
  WHEN plan = 'single_letter' OR plan = 'one_time' THEN 'one_time'
  WHEN plan LIKE '%4%' OR plan LIKE '%standard%' THEN 'monthly_standard'
  WHEN plan LIKE '%8%' OR plan LIKE '%premium%' THEN 'monthly_premium'
  ELSE plan
END
WHERE plan_type IS NULL;

-- Set initial credits for existing subscriptions
UPDATE subscriptions
SET
  credits_remaining = CASE
    WHEN plan = 'single_letter' OR plan = 'one_time' THEN 1
    WHEN plan LIKE '%4%' OR plan LIKE '%standard%' THEN 4
    WHEN plan LIKE '%8%' OR plan LIKE '%premium%' THEN 8
    ELSE 0
  END,
  remaining_letters = CASE
    WHEN plan = 'single_letter' OR plan = 'one_time' THEN 1
    WHEN plan LIKE '%4%' OR plan LIKE '%standard%' THEN 4
    WHEN plan LIKE '%8%' OR plan LIKE '%premium%' THEN 8
    ELSE 0
  END
WHERE credits_remaining = 0;

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_type ON subscriptions(plan_type);