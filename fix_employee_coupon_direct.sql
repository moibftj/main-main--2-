-- Fix create_employee_coupon function with search_path
-- Execute this in Supabase SQL Editor: https://app.supabase.com/project/nomiiqzxaxyxnxndvkbe/sql

DROP FUNCTION IF EXISTS public.create_employee_coupon(UUID);

CREATE FUNCTION public.create_employee_coupon(emp_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
DECLARE
    coupon_code TEXT;
BEGIN
    -- Generate unique coupon code
    coupon_code := 'EMP' || UPPER(substring(md5(emp_id || extract(epoch from now())), 1, 8));

    INSERT INTO public.employee_coupons (
        employee_id,
        code,
        discount_percent,
        is_active
    ) VALUES (
        emp_id,
        coupon_code,
        20, -- 20% discount
        true
    );

    RETURN coupon_code;
END;
$function$;

-- Verification
SELECT
    proname as function_name,
    prosecdef as security_definer,
    proconfig as search_path_config
FROM pg_proc
WHERE proname = 'create_employee_coupon';