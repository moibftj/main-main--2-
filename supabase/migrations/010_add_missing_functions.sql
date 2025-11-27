-- Add missing check_letter_allowance function
CREATE OR REPLACE FUNCTION check_letter_allowance(u_id UUID)
RETURNS TABLE(
  has_allowance BOOLEAN,
  remaining INTEGER,
  plan_name TEXT,
  is_super BOOLEAN
) AS $$
DECLARE
  user_profile RECORD;
  active_subscription RECORD;
  remaining_count INTEGER;
BEGIN
  -- Check if user is super user
  SELECT * INTO user_profile FROM profiles WHERE id = u_id;

  IF user_profile.is_super_user = TRUE THEN
    RETURN QUERY SELECT true, 999, 'unlimited', true;
    RETURN;
  END IF;

  -- Find active subscription
  SELECT * INTO active_subscription
  FROM subscriptions
  WHERE user_id = u_id
  AND status = 'active'
  AND (current_period_end IS NULL OR current_period_end > NOW())
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, NULL, false;
    RETURN;
  END IF;

  remaining_count := COALESCE(active_subscription.credits_remaining, 0);

  RETURN QUERY SELECT
    remaining_count > 0,
    remaining_count,
    active_subscription.plan_type,
    false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add missing coupon_usage table that the application is trying to use
CREATE TABLE IF NOT EXISTS coupon_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  coupon_code TEXT NOT NULL,
  discount_percent INTEGER NOT NULL,
  amount_before NUMERIC(10,2) NOT NULL,
  amount_after NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for coupon_usage
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user ON coupon_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_employee ON coupon_usage(employee_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_code ON coupon_usage(coupon_code);

-- Enable RLS for coupon_usage
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies for coupon_usage
DROP POLICY IF EXISTS "Users view own coupon usage" ON coupon_usage;
CREATE POLICY "Users view own coupon usage" ON coupon_usage
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Employees view coupon usage from their codes" ON coupon_usage;
CREATE POLICY "Employees view coupon usage from their codes" ON coupon_usage
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employee_coupons ec
      WHERE ec.employee_id = auth.uid()
      AND ec.code = coupon_usage.coupon_code
    )
  );

DROP POLICY IF EXISTS "Admins manage all coupon usage" ON coupon_usage;
CREATE POLICY "Admins manage all coupon usage" ON coupon_usage
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );