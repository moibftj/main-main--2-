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
