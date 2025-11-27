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
  EXECUTE FUNCTION create_employee_coupon();