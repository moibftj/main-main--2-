-- Security Hardening Script
-- Additional security measures and RLS improvements

-- Ensure sensitive columns are properly protected
-- Add additional constraints for data integrity

-- 1. Add constraints to prevent invalid data
ALTER TABLE subscriptions
ADD CONSTRAINT check_subscription_price CHECK (price >= 0 AND price <= 99999.99),
ADD CONSTRAINT check_subscription_discount CHECK (discount >= 0 AND discount <= price);

ALTER TABLE commissions
ADD CONSTRAINT check_commission_amount CHECK (commission_amount >= 0),
ADD CONSTRAINT check_commission_rate CHECK (commission_rate >= 0 AND commission_rate <= 1);

ALTER TABLE employee_coupons
ADD CONSTRAINT check_coupon_discount CHECK (discount_percent >= 0 AND discount_percent <= 100),
ADD CONSTRAINT check_coupon_usage CHECK (usage_count >= 0);

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