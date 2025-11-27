-- Fix employee_coupons table to allow promo codes without employee
-- Then add promotional coupon codes

-- Step 1: Allow NULL employee_id for promotional codes
ALTER TABLE employee_coupons 
ALTER COLUMN employee_id DROP NOT NULL;

-- Step 2: Add TALK3 promotional coupon (100% discount for testing/VIP)
INSERT INTO employee_coupons (
  employee_id, 
  code, 
  discount_percent, 
  is_active,
  usage_count
) VALUES (
  NULL,  -- No employee (promo code)
  'TALK3',
  100,
  true,
  0
) ON CONFLICT (code) DO UPDATE SET
  discount_percent = 100,
  is_active = true;

-- Verify the coupon was created
SELECT * FROM employee_coupons WHERE code = 'TALK3';
