-- Talk-To-My-Lawyer Database Schema
-- 3-Role SaaS Platform: Subscriber, Employee, Admin

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types for type safety
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('subscriber', 'employee', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE letter_status AS ENUM ('draft', 'pending_review', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE commission_status AS ENUM ('pending', 'paid');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create profiles table from scratch
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    role user_role DEFAULT 'subscriber',
    phone TEXT,
    company_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create employee_coupons table
CREATE TABLE IF NOT EXISTS employee_coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    discount_percent INT CHECK (discount_percent BETWEEN 0 AND 100) DEFAULT 20,
    is_active BOOLEAN DEFAULT true,
    usage_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status subscription_status DEFAULT 'active',
    coupon_code TEXT,
    plan TEXT DEFAULT 'single_letter',
    price NUMERIC(10,2) DEFAULT 299.00,
    discount NUMERIC(10,2) DEFAULT 0.00,
    stripe_subscription_id TEXT,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create commissions table
CREATE TABLE IF NOT EXISTS commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    commission_rate NUMERIC(5,4) DEFAULT 0.05,
    subscription_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    commission_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    status commission_status DEFAULT 'pending',
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create letters table
CREATE TABLE IF NOT EXISTS letters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status letter_status DEFAULT 'draft',
    letter_type TEXT,
    intake_data JSONB DEFAULT '{}',
    ai_draft_content TEXT,
    final_content TEXT,
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    rejection_reason TEXT,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_employee_coupons_code ON employee_coupons(code);
CREATE INDEX IF NOT EXISTS idx_employee_coupons_employee ON employee_coupons(employee_id);
CREATE INDEX IF NOT EXISTS idx_letters_user_id ON letters(user_id);
CREATE INDEX IF NOT EXISTS idx_letters_status ON letters(status);
CREATE INDEX IF NOT EXISTS idx_commissions_employee ON commissions(employee_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);

-- Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- Row Level Security Policies
-- CRITICAL: Employees must NEVER access letters

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE letters ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN COALESCE(
        (SELECT role::TEXT FROM public.profiles WHERE id = auth.uid()),
        'subscriber'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PROFILES POLICIES
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (id = auth.uid());

-- Added INSERT policy to allow users to create their profile during signup
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
    ON profiles FOR SELECT
    USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins can manage profiles" ON profiles;
CREATE POLICY "Admins can manage profiles"
    ON profiles FOR ALL
    USING (public.get_user_role() = 'admin');

-- EMPLOYEE COUPONS POLICIES
DROP POLICY IF EXISTS "Employees view own coupons" ON employee_coupons;
CREATE POLICY "Employees view own coupons"
    ON employee_coupons FOR SELECT
    USING (employee_id = auth.uid());

-- Add INSERT policy to allow employees to create their own coupon during signup
DROP POLICY IF EXISTS "Employees create own coupon" ON employee_coupons;
CREATE POLICY "Employees create own coupon"
    ON employee_coupons FOR INSERT
    WITH CHECK (employee_id = auth.uid());

DROP POLICY IF EXISTS "Public can validate coupons" ON employee_coupons;
CREATE POLICY "Public can validate coupons"
    ON employee_coupons FOR SELECT
    USING (is_active = true);

DROP POLICY IF EXISTS "Admins manage all coupons" ON employee_coupons;
CREATE POLICY "Admins manage all coupons"
    ON employee_coupons FOR ALL
    USING (public.get_user_role() = 'admin');

-- SUBSCRIPTIONS POLICIES
DROP POLICY IF EXISTS "Users view own subscriptions" ON subscriptions;
CREATE POLICY "Users view own subscriptions"
    ON subscriptions FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins view all subscriptions" ON subscriptions;
CREATE POLICY "Admins view all subscriptions"
    ON subscriptions FOR SELECT
    USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "Users can create subscriptions" ON subscriptions;
CREATE POLICY "Users can create subscriptions"
    ON subscriptions FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- COMMISSIONS POLICIES
DROP POLICY IF EXISTS "Employees view own commissions" ON commissions;
CREATE POLICY "Employees view own commissions"
    ON commissions FOR SELECT
    USING (employee_id = auth.uid());

DROP POLICY IF EXISTS "Admins view all commissions" ON commissions;
CREATE POLICY "Admins view all commissions"
    ON commissions FOR SELECT
    USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins create commissions" ON commissions;
CREATE POLICY "Admins create commissions"
    ON commissions FOR INSERT
    WITH CHECK (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "Admins update commissions" ON commissions;
CREATE POLICY "Admins update commissions"
    ON commissions FOR UPDATE
    USING (public.get_user_role() = 'admin');

-- LETTERS POLICIES (CRITICAL SECURITY)
-- Block employees completely from letters
DROP POLICY IF EXISTS "Block employees from letters" ON letters;
CREATE POLICY "Block employees from letters"
    ON letters FOR ALL
    USING (public.get_user_role() != 'employee');

DROP POLICY IF EXISTS "Subscribers view own letters" ON letters;
CREATE POLICY "Subscribers view own letters"
    ON letters FOR SELECT
    USING (
        user_id = auth.uid() AND 
        public.get_user_role() = 'subscriber'
    );

DROP POLICY IF EXISTS "Subscribers create own letters" ON letters;
CREATE POLICY "Subscribers create own letters"
    ON letters FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND 
        public.get_user_role() = 'subscriber'
    );

DROP POLICY IF EXISTS "Subscribers update own letters" ON letters;
CREATE POLICY "Subscribers update own letters"
    ON letters FOR UPDATE
    USING (
        user_id = auth.uid() AND 
        public.get_user_role() = 'subscriber'
    );

DROP POLICY IF EXISTS "Admins full letter access" ON letters;
CREATE POLICY "Admins full letter access"
    ON letters FOR ALL
    USING (public.get_user_role() = 'admin');
-- Seed default data for development

-- Only seed if profiles exist
DO $$
BEGIN
    -- Seed employee coupon codes (example)
    IF EXISTS (SELECT 1 FROM profiles WHERE role = 'employee') THEN
        INSERT INTO employee_coupons (employee_id, code, discount_percent, is_active)
        SELECT 
            id, 
            CONCAT('EMPLOYEE', SUBSTR(id::TEXT, 1, 8)), 
            20,
            true
        FROM profiles 
        WHERE role = 'employee'
        ON CONFLICT (code) DO NOTHING;
    END IF;
END $$;

-- NOTE: To create an admin user, run this after signing up:
-- UPDATE profiles SET role = 'admin' WHERE email = 'your-admin-email@example.com';
-- Helper function to increment coupon usage count
CREATE OR REPLACE FUNCTION increment_usage(row_id UUID)
RETURNS INTEGER AS $$
DECLARE
  current_count INTEGER;
BEGIN
  SELECT usage_count INTO current_count
  FROM employee_coupons
  WHERE id = row_id;
  
  RETURN current_count + 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get commission summary for employee
CREATE OR REPLACE FUNCTION get_commission_summary(emp_id UUID)
RETURNS TABLE(
  total_earned NUMERIC,
  pending_amount NUMERIC,
  paid_amount NUMERIC,
  commission_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(commission_amount), 0) as total_earned,
    COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END), 0) as pending_amount,
    COALESCE(SUM(CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END), 0) as paid_amount,
    COUNT(*)::INTEGER as commission_count
  FROM commissions
  WHERE employee_id = emp_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate coupon before application
CREATE OR REPLACE FUNCTION validate_coupon(coupon_code TEXT)
RETURNS TABLE(
  is_valid BOOLEAN,
  discount_percent INTEGER,
  employee_id UUID,
  message TEXT
) AS $$
DECLARE
  coupon_record RECORD;
BEGIN
  SELECT * INTO coupon_record
  FROM employee_coupons
  WHERE code = UPPER(coupon_code)
  AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, NULL::UUID, 'Invalid coupon code'::TEXT;
    RETURN;
  END IF;
  
  RETURN QUERY SELECT 
    true, 
    coupon_record.discount_percent, 
    coupon_record.employee_id, 
    'Coupon valid'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
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
-- Drop old version with plan_type enum if it exists
DROP FUNCTION IF EXISTS add_letter_allowances(UUID, plan_type);

CREATE OR REPLACE FUNCTION add_letter_allowances(sub_id UUID, plan TEXT)
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
-- Create audit trail table for letter reviews
CREATE TABLE IF NOT EXISTS letter_audit_trail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    letter_id UUID NOT NULL REFERENCES letters(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- 'created', 'submitted', 'review_started', 'approved', 'rejected'
    performed_by UUID REFERENCES profiles(id),
    old_status TEXT,
    new_status TEXT,
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_letter ON letter_audit_trail(letter_id);
CREATE INDEX IF NOT EXISTS idx_audit_performed_by ON letter_audit_trail(performed_by);

-- Enable RLS
ALTER TABLE letter_audit_trail ENABLE ROW LEVEL SECURITY;

-- Admins can view all audit logs
DROP POLICY IF EXISTS "Admins view all audit logs" ON letter_audit_trail;
CREATE POLICY "Admins view all audit logs"
ON letter_audit_trail FOR SELECT
USING (public.get_user_role() = 'admin');

-- Users can view audit logs for their own letters
DROP POLICY IF EXISTS "Users view own letter audit" ON letter_audit_trail;
CREATE POLICY "Users view own letter audit"
ON letter_audit_trail FOR SELECT
USING (
    letter_id IN (
        SELECT id FROM letters WHERE user_id = auth.uid()
    )
);

-- Function to log audit events
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
-- Add missing letter_status enum values
-- This ensures the database supports all status values used in the workflow

-- Add 'generating' status (when AI is creating the draft)
ALTER TYPE letter_status ADD VALUE IF NOT EXISTS 'generating';

-- Add 'under_review' status (when admin has started reviewing)
ALTER TYPE letter_status ADD VALUE IF NOT EXISTS 'under_review';

-- Add 'completed' status (when letter workflow is fully complete)
ALTER TYPE letter_status ADD VALUE IF NOT EXISTS 'completed';

-- Add 'failed' status (when generation or processing fails)
ALTER TYPE letter_status ADD VALUE IF NOT EXISTS 'failed';

-- Note: The complete status flow is now:
-- draft → generating → pending_review → under_review → approved/rejected → completed
-- Auto-generate employee coupon when a new employee profile is created
CREATE OR REPLACE FUNCTION create_employee_coupon()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create coupon for employee role
  IF NEW.role = 'employee' THEN
    INSERT INTO employee_coupons (employee_id, code, discount_percent, is_active)
    VALUES (
      NEW.id,
      'EMP-' || UPPER(SUBSTR(MD5(NEW.id::TEXT), 1, 6)),
      20,
      true
    )
    ON CONFLICT (employee_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate coupon on new employee
DROP TRIGGER IF EXISTS trigger_create_employee_coupon ON profiles;
CREATE TRIGGER trigger_create_employee_coupon
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_employee_coupon();-- Add missing fields to subscriptions table
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS plan TEXT,
ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) DEFAULT 299.00,
ADD COLUMN IF NOT EXISTS discount NUMERIC(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS credits_remaining INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS remaining_letters INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS plan_type TEXT,
ADD COLUMN IF NOT EXISTS last_reset_at TIMESTAMPTZ DEFAULT NOW();

-- Add missing fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_super_user BOOLEAN DEFAULT FALSE;

-- Add missing fields to commissions table
ALTER TABLE commissions
ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,4) DEFAULT 0.05;

-- Add missing fields to employee_coupons table
ALTER TABLE employee_coupons
ADD COLUMN IF NOT EXISTS usage_count INT DEFAULT 0;

-- Add unique constraint to employee_coupons.employee_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'employee_coupons_employee_id_key'
        AND conrelid = 'employee_coupons'::regclass
    ) THEN
        ALTER TABLE employee_coupons ADD CONSTRAINT employee_coupons_employee_id_key UNIQUE (employee_id);
    END IF;
END $$;

-- Update existing subscriptions to set plan_type based on plan
UPDATE subscriptions
SET plan_type = CASE
  WHEN plan = 'single_letter' OR plan = 'one_time' THEN 'one_time'
  WHEN plan LIKE '%4%' OR plan LIKE '%standard%' THEN 'monthly_standard'
  WHEN plan LIKE '%8%' OR plan LIKE '%premium%' THEN 'monthly_premium'
  ELSE plan
END
WHERE plan_type IS NULL AND plan IS NOT NULL;

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
WHERE credits_remaining = 0 AND plan IS NOT NULL;

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_type ON subscriptions(plan_type);-- Add missing check_letter_allowance function
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
  );-- Security Hardening Script
-- Additional security measures and RLS improvements

-- Ensure sensitive columns are properly protected
-- Add additional constraints for data integrity

-- 1. Add constraints to prevent invalid data
DO $$ BEGIN
    ALTER TABLE subscriptions
    ADD CONSTRAINT check_subscription_price CHECK (price >= 0 AND price <= 99999.99);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE subscriptions
    ADD CONSTRAINT check_subscription_discount CHECK (discount >= 0 AND discount <= price);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE commissions
    ADD CONSTRAINT check_commission_amount CHECK (commission_amount >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE commissions
    ADD CONSTRAINT check_commission_rate CHECK (commission_rate >= 0 AND commission_rate <= 1);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE employee_coupons
    ADD CONSTRAINT check_coupon_discount CHECK (discount_percent >= 0 AND discount_percent <= 100);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE employee_coupons
    ADD CONSTRAINT check_coupon_usage CHECK (usage_count >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Add additional security indexes for audit performance
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON letter_audit_trail(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON letter_audit_trail(action);

-- 3. Create a function to sanitize user input (for application use)
CREATE OR REPLACE FUNCTION sanitize_input(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Basic sanitization - remove potential SQL injection patterns
    RETURN regexp_replace(input_text, '[;''"\\]', '', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4. Add rate limiting preparation (application level)
-- Note: Actual rate limiting should be implemented at the application/API gateway level

-- 5. Create a security configuration table
CREATE TABLE IF NOT EXISTS security_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default security settings
INSERT INTO security_config (key, value, description) VALUES
  ('max_letter_generation_per_hour', '10', 'Maximum letters a user can generate per hour'),
  ('max_ai_improvements_per_letter', '5', 'Maximum AI improvement requests per letter'),
  ('session_timeout_minutes', '60', 'Session timeout in minutes'),
  ('require_email_verification', 'true', 'Require email verification before account activation')
ON CONFLICT (key) DO NOTHING;

-- 6. Add RLS for security_config (admin only)
ALTER TABLE security_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins only access security config" ON security_config;
CREATE POLICY "Admins only access security config"
ON security_config FOR ALL
USING (public.get_user_role() = 'admin');

-- 7. Create function to check for suspicious activity
CREATE OR REPLACE FUNCTION detect_suspicious_activity(user_id UUID, action_type TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  action_count INTEGER;
  time_window INTERVAL := '1 hour';
BEGIN
  -- Count actions in the last hour
  SELECT COUNT(*) INTO action_count
  FROM letter_audit_trail
  WHERE performed_by = user_id
  AND created_at > NOW() - time_window
  AND action = action_type;

  -- Flag as suspicious if more than 20 actions per hour
  RETURN action_count > 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Add additional audit logging for security events
CREATE TABLE IF NOT EXISTS security_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  event_type TEXT NOT NULL, -- 'suspicious_activity', 'failed_login', 'permission_denied', etc.
  ip_address INET,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for security_audit_log
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view security audit log" ON security_audit_log;
CREATE POLICY "Admins view security audit log"
ON security_audit_log FOR SELECT
USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "System can insert security events" ON security_audit_log;
CREATE POLICY "System can insert security events"
ON security_audit_log FOR INSERT
WITH CHECK (true); -- Allow system to insert security events

-- 9. Create function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO security_audit_log (
    user_id,
    event_type,
    ip_address,
    user_agent,
    details
  ) VALUES (
    p_user_id,
    p_event_type,
    p_ip_address,
    p_user_agent,
    p_details
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;