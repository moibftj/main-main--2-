-- Migration: Admin Role-Based Access Control and RLS Policies
-- Description: Add super admin detection and update RLS policies for role-based access
-- Created: 2025-01-23

-- ============================================================================
-- 1. ENSURE is_super_user COLUMN EXISTS (Idempotent)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'is_super_user'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_super_user BOOLEAN DEFAULT FALSE NOT NULL;
    COMMENT ON COLUMN profiles.is_super_user IS 'Super admin flag for elevated privileges';
  END IF;
END $$;

-- ============================================================================
-- 2. ADD PERFORMANCE INDEXES
-- ============================================================================

-- Index for super admin queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_super_user
ON profiles(is_super_user)
WHERE is_super_user = true;

-- Index for role-based queries
CREATE INDEX IF NOT EXISTS idx_profiles_role
ON profiles(role);

-- ============================================================================
-- 3. HELPER FUNCTIONS FOR RLS
-- ============================================================================

-- Function to check if current user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN COALESCE(
        (
            SELECT is_super_user
            FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        ),
        false
    );
END;
$$;

COMMENT ON FUNCTION public.is_super_admin() IS 'Check if current authenticated user is a super admin';

-- Function to check if current user is any type of admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN public.get_user_role() = 'admin';
END;
$$;

COMMENT ON FUNCTION public.is_admin() IS 'Check if current authenticated user has admin role';

-- ============================================================================
-- 4. UPDATE RLS POLICIES FOR SECURITY TABLES (Super Admin Only)
-- ============================================================================

-- Security Audit Log - Only super admins can view
DROP POLICY IF EXISTS "Super admins view security audit" ON security_audit_log;
CREATE POLICY "Super admins view security audit"
ON security_audit_log FOR SELECT
USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admins insert security audit" ON security_audit_log;
CREATE POLICY "Super admins insert security audit"
ON security_audit_log FOR INSERT
WITH CHECK (public.is_super_admin());

-- Security Config - Only super admins can manage
DROP POLICY IF EXISTS "Super admins view security config" ON security_config;
CREATE POLICY "Super admins view security config"
ON security_config FOR SELECT
USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admins manage security config" ON security_config;
CREATE POLICY "Super admins manage security config"
ON security_config FOR ALL
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- ============================================================================
-- 5. UPDATE RLS POLICIES FOR LETTER AUDIT TRAIL
-- ============================================================================

-- All admins can view audit trail
DROP POLICY IF EXISTS "Admins view audit trail" ON letter_audit_trail;
CREATE POLICY "Admins view audit trail"
ON letter_audit_trail FOR SELECT
USING (public.is_admin());

-- All admins can insert audit entries (during review actions)
DROP POLICY IF EXISTS "Admins insert audit entries" ON letter_audit_trail;
CREATE POLICY "Admins insert audit entries"
ON letter_audit_trail FOR INSERT
WITH CHECK (public.is_admin());

-- Users can view their own letter audit trails
DROP POLICY IF EXISTS "Users view own letter audits" ON letter_audit_trail;
CREATE POLICY "Users view own letter audits"
ON letter_audit_trail FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM letters
        WHERE letters.id = letter_audit_trail.letter_id
        AND letters.user_id = auth.uid()
    )
);

-- ============================================================================
-- 6. UPDATE RLS POLICIES FOR PROFILES (User Management)
-- ============================================================================

-- Super admins can view all profiles
-- (This policy likely already exists, but we ensure it)
DROP POLICY IF EXISTS "Super admins view all profiles" ON profiles;
CREATE POLICY "Super admins view all profiles"
ON profiles FOR SELECT
USING (public.is_super_admin());

-- Super admins can update profiles (for role promotion)
DROP POLICY IF EXISTS "Super admins update profiles" ON profiles;
CREATE POLICY "Super admins update profiles"
ON profiles FOR UPDATE
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- ============================================================================
-- 7. UPDATE RLS POLICIES FOR COMMISSIONS (Super Admin Only)
-- ============================================================================

-- Only super admins can manage commissions
DROP POLICY IF EXISTS "Super admins view all commissions" ON commissions;
CREATE POLICY "Super admins view all commissions"
ON commissions FOR SELECT
USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admins manage commissions" ON commissions;
CREATE POLICY "Super admins manage commissions"
ON commissions FOR ALL
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Employees can view their own commissions
DROP POLICY IF EXISTS "Employees view own commissions" ON commissions;
CREATE POLICY "Employees view own commissions"
ON commissions FOR SELECT
USING (employee_id = auth.uid() AND public.get_user_role() = 'employee');

-- ============================================================================
-- 8. ENSURE LETTER POLICIES ALLOW ALL ADMINS (Reviewers + Super Admins)
-- ============================================================================

-- All admins (both reviewers and super admins) have full access to letters
-- This policy should already exist, but we verify it
DROP POLICY IF EXISTS "Admins full letter access" ON letters;
CREATE POLICY "Admins full letter access"
ON letters FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================================================
-- 9. GRANT NECESSARY PERMISSIONS
-- ============================================================================

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ============================================================================
-- 10. UPDATE EXISTING SUPER ADMIN (IF EXISTS)
-- ============================================================================

-- Set the existing admin user as super admin
-- This updates the admin created during setup
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Find the admin user by email (from environment variable)
    SELECT id INTO admin_user_id
    FROM auth.users
    WHERE email = 'admin@talk-to-my-lawyer.com'
    LIMIT 1;

    -- If admin exists, ensure they're marked as super admin
    IF admin_user_id IS NOT NULL THEN
        UPDATE profiles
        SET is_super_user = true,
            updated_at = NOW()
        WHERE id = admin_user_id
          AND role = 'admin';

        RAISE NOTICE 'Updated admin user % as super admin', admin_user_id;
    END IF;
END $$;
