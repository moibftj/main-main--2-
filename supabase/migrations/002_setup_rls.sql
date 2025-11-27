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
