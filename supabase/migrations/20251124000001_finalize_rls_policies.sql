-- Migration: Finalize RLS Policies for Admin Functionality
-- Description: Add missing RLS policies and ensure all tables have proper security
-- Created: 2025-11-24

-- ============================================================================
-- 1. ENSURE COUPON_USAGE TABLE HAS RLS ENABLED
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'coupon_usage'
  ) THEN
    -- Create coupon_usage table if it doesn't exist
    CREATE TABLE coupon_usage (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      coupon_id UUID NOT NULL REFERENCES employee_coupons(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
      discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Indexes for performance
    CREATE INDEX idx_coupon_usage_coupon_id ON coupon_usage(coupon_id);
    CREATE INDEX idx_coupon_usage_user_id ON coupon_usage(user_id);
    CREATE INDEX idx_coupon_usage_subscription_id ON coupon_usage(subscription_id);
    CREATE INDEX idx_coupon_usage_created_at ON coupon_usage(created_at);
  END IF;
END $$;

-- Enable RLS on coupon_usage table
ALTER TABLE coupon_usage ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. RLS POLICIES FOR COUPON_USAGE TABLE
-- ============================================================================

-- Users can view their own coupon usage
DROP POLICY IF EXISTS "Users view own coupon usage" ON coupon_usage;
CREATE POLICY "Users view own coupon usage"
ON coupon_usage FOR SELECT
USING (user_id = auth.uid());

-- Admins can view all coupon usage
DROP POLICY IF EXISTS "Admins view all coupon usage" ON coupon_usage;
CREATE POLICY "Admins view all coupon usage"
ON coupon_usage FOR SELECT
USING (public.is_admin());

-- System can create coupon usage records (for subscription creation)
DROP POLICY IF EXISTS "System can create coupon usage" ON coupon_usage;
CREATE POLICY "System can create coupon usage"
ON coupon_usage FOR INSERT
WITH CHECK (true);

-- Admins can update coupon usage (for corrections)
DROP POLICY IF EXISTS "Admins can update coupon usage" ON coupon_usage;
CREATE POLICY "Admins can update coupon usage"
ON coupon_usage FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================================================
-- 3. UPDATE LETTER TABLE POLICIES TO INCLUDE NEW FIELDS
-- ============================================================================

-- Ensure reviewed_content field exists (for rich text editor)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'letters'
      AND column_name = 'reviewed_content'
  ) THEN
    ALTER TABLE letters ADD COLUMN reviewed_content TEXT;
    COMMENT ON COLUMN letters.reviewed_content IS 'Content edited by admin during review process';
  END IF;
END $$;

-- ============================================================================
-- 4. UPDATE SUBSCRIPTION TABLE TO INCLUDE CREDITS SYSTEM
-- ============================================================================

-- Ensure credits_remaining field exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscriptions'
      AND column_name = 'credits_remaining'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN credits_remaining INTEGER DEFAULT 0;
    COMMENT ON COLUMN subscriptions.credits_remaining IS 'Number of letter credits remaining for this subscription';
  END IF;
END $$;

-- ============================================================================
-- 5. VERIFY ALL TABLES HAVE RLS ENABLED
-- ============================================================================

DO $$
DECLARE
    table_name TEXT;
    rls_enabled BOOLEAN;
BEGIN
    FOR table_name IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename IN (
            'profiles', 'letters', 'letter_audit_trail', 'subscriptions',
            'commissions', 'employee_coupons', 'coupon_usage',
            'security_audit_log', 'security_config'
        )
    LOOP
        -- Check if RLS is enabled
        SELECT rowsecurity INTO rls_enabled
        FROM pg_tables
        WHERE schemaname = 'public' AND tablename = table_name;

        IF NOT rls_enabled THEN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
            RAISE NOTICE 'Enabled RLS on table: %', table_name;
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- 6. ENSURE LETTER AUDIT TRAIL LOGS ALL ADMIN ACTIONS
-- ============================================================================

-- Function to log letter audit (ensure it exists and is properly configured)
CREATE OR REPLACE FUNCTION public.log_letter_audit(
    p_letter_id UUID,
    p_action TEXT,
    p_old_status TEXT DEFAULT NULL,
    p_new_status TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.letter_audit_trail (
        letter_id,
        performed_by,
        action,
        old_status,
        new_status,
        notes,
        created_at
    ) VALUES (
        p_letter_id,
        auth.uid(),
        p_action,
        p_old_status,
        p_new_status,
        p_notes,
        NOW()
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.log_letter_audit TO authenticated;

-- ============================================================================
-- 7. VALIDATE ALL POLICIES ARE PROPERLY CONFIGURED
-- ============================================================================

-- This section validates that critical security policies are in place
DO $$
DECLARE
    missing_policies TEXT[];
BEGIN
    -- Check for critical letter policies
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'letters'
        AND policyname = 'Block employees from letters'
    ) THEN
        missing_policies := array_append(missing_policies, 'Employee block policy on letters table');
    END IF;

    -- Check for admin policies
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'profiles'
        AND policyname = 'Super admins update profiles'
    ) THEN
        missing_policies := array_append(missing_policies, 'Super admin profile update policy');
    END IF;

    -- Check for security policies
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'security_audit_log'
        AND policyname = 'Super admins view security audit'
    ) THEN
        missing_policies := array_append(missing_policies, 'Security audit log policy');
    END IF;

    -- Log any missing policies
    IF array_length(missing_policies, 1) > 0 THEN
        RAISE WARNING 'Missing critical RLS policies: %', array_to_string(missing_policies, ', ');
    ELSE
        RAISE NOTICE 'All critical RLS policies are properly configured';
    END IF;
END $$;