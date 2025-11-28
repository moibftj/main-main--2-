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
    CREATE TYPE letter_status AS ENUM ('draft', 'generating', 'pending_review', 'under_review', 'approved', 'rejected', 'completed', 'failed');
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
    employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
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
