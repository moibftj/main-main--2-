-- Add all missing database functions and tables
-- This ensures all RPC functions called from the app exist

-- Add missing columns to profiles table
ALTER TABLE profiles 
    ADD COLUMN IF NOT EXISTS is_super_user BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS credits_remaining INT DEFAULT 0;

-- Add missing columns to subscriptions table  
ALTER TABLE subscriptions 
    ADD COLUMN IF NOT EXISTS credits_remaining INT DEFAULT 0;

-- Create coupon_usage tracking table
CREATE TABLE IF NOT EXISTS coupon_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coupon_code TEXT NOT NULL,
    employee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
    amount_before NUMERIC(10,2),
    amount_after NUMERIC(10,2),
    discount_applied NUMERIC(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupon_usage_employee ON coupon_usage(employee_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user ON coupon_usage(user_id);

-- Enable RLS on coupon_usage
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees view own coupon usage"
    ON coupon_usage FOR SELECT
    USING (
        employee_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Recreate deduct_letter_allowance function with proper logic
CREATE OR REPLACE FUNCTION deduct_letter_allowance(u_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    sub_record RECORD;
    profile_record RECORD;
BEGIN
    -- Check if user is super user (unlimited)
    SELECT is_super_user INTO profile_record
    FROM profiles
    WHERE id = u_id;
    
    IF profile_record.is_super_user THEN
        RETURN true; -- Super users have unlimited
    END IF;

    -- Get active subscription
    SELECT * INTO sub_record
    FROM subscriptions
    WHERE user_id = u_id
      AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN false; -- No active subscription
    END IF;

    -- Check credits_remaining (primary) or remaining_letters (legacy)
    IF COALESCE(sub_record.credits_remaining, 0) <= 0 AND COALESCE(sub_record.remaining_letters, 0) <= 0 THEN
        RETURN false; -- No letters remaining
    END IF;

    -- Deduct 1 letter from credits_remaining
    UPDATE subscriptions
    SET credits_remaining = GREATEST(COALESCE(credits_remaining, 0) - 1, 0),
        remaining_letters = GREATEST(COALESCE(remaining_letters, 0) - 1, 0),
        updated_at = NOW()
    WHERE id = sub_record.id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate reset_monthly_allowances function
CREATE OR REPLACE FUNCTION reset_monthly_allowances()
RETURNS VOID AS $$
BEGIN
    UPDATE subscriptions
    SET credits_remaining = CASE
            WHEN plan = 'monthly' THEN 4
            WHEN plan = 'yearly' THEN 8
            WHEN plan_type = 'monthly_standard' THEN 4
            WHEN plan_type = 'monthly_premium' THEN 12
            ELSE credits_remaining
        END,
        remaining_letters = CASE
            WHEN plan = 'monthly' THEN 4
            WHEN plan = 'yearly' THEN 8
            WHEN plan_type = 'monthly_standard' THEN 4
            WHEN plan_type = 'monthly_premium' THEN 12
            ELSE remaining_letters
        END,
        last_reset_at = NOW(),
        updated_at = NOW()
    WHERE status = 'active'
      AND (plan IN ('monthly', 'yearly') OR plan_type IN ('monthly_standard', 'monthly_premium'))
      AND DATE_TRUNC('month', COALESCE(last_reset_at, created_at)) < DATE_TRUNC('month', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate add_letter_allowances function
CREATE OR REPLACE FUNCTION add_letter_allowances(sub_id UUID, plan_name TEXT)
RETURNS VOID AS $$
DECLARE
    letters_to_add INT;
BEGIN
    -- Determine letters based on plan
    IF plan_name IN ('one_time', 'single_letter') THEN
        letters_to_add := 1;
    ELSIF plan_name IN ('monthly', 'monthly_standard') THEN
        letters_to_add := 4;
    ELSIF plan_name IN ('yearly', 'monthly_premium') THEN
        letters_to_add := 12;
    ELSE
        letters_to_add := 1; -- Default fallback
    END IF;

    UPDATE subscriptions
    SET credits_remaining = letters_to_add,
        remaining_letters = letters_to_add,
        last_reset_at = NOW(),
        updated_at = NOW()
    WHERE id = sub_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure log_letter_audit function exists (recreate for safety)
CREATE OR REPLACE FUNCTION log_letter_audit(
    p_letter_id UUID,
    p_action TEXT,
    p_old_status TEXT DEFAULT NULL,
    p_new_status TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO letter_audit_trail (
        letter_id,
        action,
        performed_by,
        old_status,
        new_status,
        notes,
        metadata
    ) VALUES (
        p_letter_id,
        p_action,
        auth.uid(),
        p_old_status,
        p_new_status,
        p_notes,
        p_metadata
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check letter allowance without deducting
CREATE OR REPLACE FUNCTION check_letter_allowance(u_id UUID)
RETURNS TABLE(
    has_allowance BOOLEAN,
    remaining INT,
    plan_name TEXT,
    is_super BOOLEAN
) AS $$
DECLARE
    sub_record RECORD;
    profile_record RECORD;
BEGIN
    -- Check if user is super user
    SELECT is_super_user INTO profile_record
    FROM profiles
    WHERE id = u_id;
    
    IF profile_record.is_super_user THEN
        RETURN QUERY SELECT true, 999, 'super_user'::TEXT, true;
        RETURN;
    END IF;

    -- Get active subscription
    SELECT * INTO sub_record
    FROM subscriptions
    WHERE user_id = u_id
      AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 0, 'none'::TEXT, false;
        RETURN;
    END IF;

    RETURN QUERY SELECT 
        COALESCE(sub_record.credits_remaining, 0) > 0,
        COALESCE(sub_record.credits_remaining, 0),
        COALESCE(sub_record.plan, 'unknown')::TEXT,
        false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle commission creation when subscription is created
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
                0.05, -- 5% commission
                NEW.price,
                NEW.price * 0.05,
                'pending'
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for commission creation
DROP TRIGGER IF EXISTS create_commission_on_subscription ON subscriptions;
CREATE TRIGGER create_commission_on_subscription
    AFTER INSERT ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION create_commission_for_subscription();

-- Add updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to all tables
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_letters_updated_at ON letters;
CREATE TRIGGER update_letters_updated_at
    BEFORE UPDATE ON letters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_employee_coupons_updated_at ON employee_coupons;
CREATE TRIGGER update_employee_coupons_updated_at
    BEFORE UPDATE ON employee_coupons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
