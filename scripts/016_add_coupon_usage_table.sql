-- Add coupon_usage table for tracking coupon redemptions
-- This table tracks when users apply coupons during checkout
-- Used for analytics and commission tracking

CREATE TABLE IF NOT EXISTS coupon_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    coupon_code TEXT NOT NULL,
    employee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    discount_percent INT CHECK (discount_percent >= 0 AND discount_percent <= 100),
    amount_before NUMERIC(10,2) CHECK (amount_before >= 0),
    amount_after NUMERIC(10,2) CHECK (amount_after >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user ON coupon_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_code ON coupon_usage(coupon_code);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_employee ON coupon_usage(employee_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_subscription ON coupon_usage(subscription_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_created_at ON coupon_usage(created_at DESC);

-- Enable RLS
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for coupon_usage table
-- Users can see their own coupon usage
CREATE POLICY "Users can view own coupon usage"
    ON coupon_usage FOR SELECT
    USING (auth.uid() = user_id);

-- Employees can see coupon usage for their coupons
CREATE POLICY "Employees can view their coupon usage"
    ON coupon_usage FOR SELECT
    USING (auth.uid() = employee_id);

-- Admins can view all coupon usage
CREATE POLICY "Admins can view all coupon usage"
    ON coupon_usage FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
        )
    );

-- Only the system (service role) can insert coupon usage records
-- This happens during checkout process
CREATE POLICY "System can insert coupon usage"
    ON coupon_usage FOR INSERT
    WITH CHECK (true);

COMMENT ON TABLE coupon_usage IS 'Tracks coupon code redemptions during checkout for analytics and commission calculation';
COMMENT ON COLUMN coupon_usage.user_id IS 'User who used the coupon';
COMMENT ON COLUMN coupon_usage.coupon_code IS 'Coupon code that was applied (e.g., TALK3, employee codes)';
COMMENT ON COLUMN coupon_usage.employee_id IS 'Employee who owns the coupon (NULL for special codes like TALK3)';
COMMENT ON COLUMN coupon_usage.subscription_id IS 'Subscription created with this coupon';
COMMENT ON COLUMN coupon_usage.discount_percent IS 'Discount percentage applied (0-100)';
COMMENT ON COLUMN coupon_usage.amount_before IS 'Original price before discount';
COMMENT ON COLUMN coupon_usage.amount_after IS 'Final price after discount';
