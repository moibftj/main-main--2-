-- Letter Allowance System (NOT credits)
-- Deducts on SUBMISSION, resets monthly, no rollover

-- Add remaining_letters column to subscriptions
ALTER TABLE subscriptions 
    ADD COLUMN IF NOT EXISTS remaining_letters INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_reset_at TIMESTAMPTZ DEFAULT NOW();

-- Function to check and deduct letter allowance on SUBMISSION
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

    IF sub_record.remaining_letters <= 0 THEN
        RETURN false; -- No letters remaining
    END IF;

    -- Deduct 1 letter
    UPDATE subscriptions
    SET remaining_letters = remaining_letters - 1,
        updated_at = NOW()
    WHERE id = sub_record.id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset monthly allowances (called by cron or webhook)
CREATE OR REPLACE FUNCTION reset_monthly_allowances()
RETURNS VOID AS $$
BEGIN
    UPDATE subscriptions
    SET remaining_letters = CASE
            WHEN plan_type = 'standard_4_month' THEN 4
            WHEN plan_type = 'premium_8_month' THEN 8
            ELSE remaining_letters -- one_time doesn't reset
        END,
        last_reset_at = NOW(),
        updated_at = NOW()
    WHERE status = 'active'
      AND plan_type IN ('standard_4_month', 'premium_8_month')
      AND DATE_TRUNC('month', last_reset_at) < DATE_TRUNC('month', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add allowances on purchase
CREATE OR REPLACE FUNCTION add_letter_allowances(sub_id UUID, plan plan_type)
RETURNS VOID AS $$
DECLARE
    letters_to_add INT;
BEGIN
    IF plan = 'one_time' THEN
        letters_to_add := 1;
    ELSIF plan = 'standard_4_month' THEN
        letters_to_add := 4;
    ELSIF plan = 'premium_8_month' THEN
        letters_to_add := 8;
    ELSE
        RAISE EXCEPTION 'Invalid plan type';
    END IF;

    UPDATE subscriptions
    SET remaining_letters = letters_to_add,
        last_reset_at = NOW(),
        updated_at = NOW()
    WHERE id = sub_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
