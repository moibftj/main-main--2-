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
