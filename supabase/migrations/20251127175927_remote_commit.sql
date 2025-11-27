


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."commission_status" AS ENUM (
    'pending',
    'paid'
);


ALTER TYPE "public"."commission_status" OWNER TO "postgres";


CREATE TYPE "public"."letter_status" AS ENUM (
    'draft',
    'pending_review',
    'approved',
    'rejected',
    'generating',
    'under_review',
    'completed',
    'failed'
);


ALTER TYPE "public"."letter_status" OWNER TO "postgres";


CREATE TYPE "public"."subscription_status" AS ENUM (
    'active',
    'canceled',
    'past_due'
);


ALTER TYPE "public"."subscription_status" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'subscriber',
    'employee',
    'admin'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_letter_allowances"("sub_id" "uuid", "plan_name" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    letters_to_add INT;
BEGIN
    -- Determine letters based on plan name
    letters_to_add := CASE 
        WHEN plan_name IN ('one_time', 'single_letter') THEN 1
        WHEN plan_name IN ('standard_4_month', 'monthly_standard') THEN 4
        WHEN plan_name IN ('premium_8_month', 'monthly_premium') THEN 8
        ELSE 0
    END;

    IF letters_to_add = 0 THEN
        RAISE EXCEPTION 'Invalid plan type: %', plan_name;
    END IF;

    UPDATE subscriptions
    SET remaining_letters = letters_to_add,
        plan_type = plan_name,
        last_reset_at = NOW(),
        updated_at = NOW()
    WHERE id = sub_id;
END;
$$;


ALTER FUNCTION "public"."add_letter_allowances"("sub_id" "uuid", "plan_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_letter_allowance"("u_id" "uuid") RETURNS TABLE("has_allowance" boolean, "remaining" integer, "plan_name" "text", "is_super" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_profile RECORD;
  active_subscription RECORD;
  remaining_count INTEGER;
BEGIN
  -- Check if user is super user
  SELECT * INTO user_profile FROM profiles WHERE id = u_id;

  IF user_profile.is_super_user = TRUE THEN
    RETURN QUERY SELECT true, 999, 'unlimited', true;
    RETURN;
  END IF;

  -- Find active subscription
  SELECT * INTO active_subscription
  FROM subscriptions
  WHERE user_id = u_id
  AND status = 'active'
  AND (current_period_end IS NULL OR current_period_end > NOW())
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, NULL, false;
    RETURN;
  END IF;

  remaining_count := COALESCE(active_subscription.credits_remaining, 0);

  RETURN QUERY SELECT
    remaining_count > 0,
    remaining_count,
    active_subscription.plan_type,
    false;
END;
$$;


ALTER FUNCTION "public"."check_letter_allowance"("u_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_employee_coupon"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."create_employee_coupon"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."deduct_letter_allowance"("u_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    sub_record RECORD;
    is_super BOOLEAN;
BEGIN
    -- Check if user is super user (unlimited)
    SELECT COALESCE(is_super_user, FALSE) INTO is_super
    FROM profiles
    WHERE id = u_id;
    
    IF is_super THEN
        RETURN TRUE; -- Super users have unlimited
    END IF;

    -- Get active subscription
    SELECT * INTO sub_record
    FROM subscriptions
    WHERE user_id = u_id
      AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN FALSE; -- No active subscription
    END IF;

    IF COALESCE(sub_record.remaining_letters, 0) <= 0 THEN
        RETURN FALSE; -- No letters remaining
    END IF;

    -- Deduct 1 letter
    UPDATE subscriptions
    SET remaining_letters = remaining_letters - 1,
        updated_at = NOW()
    WHERE id = sub_record.id;

    RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."deduct_letter_allowance"("u_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."detect_suspicious_activity"("user_id" "uuid", "action_type" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."detect_suspicious_activity"("user_id" "uuid", "action_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_commission_summary"("emp_id" "uuid") RETURNS TABLE("total_earned" numeric, "pending_amount" numeric, "paid_amount" numeric, "commission_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."get_commission_summary"("emp_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN COALESCE(
        (SELECT role::TEXT FROM public.profiles WHERE id = auth.uid()),
        'subscriber'
    );
END;
$$;


ALTER FUNCTION "public"."get_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_usage"("row_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  current_count INTEGER;
BEGIN
  SELECT usage_count INTO current_count
  FROM employee_coupons
  WHERE id = row_id;
  
  RETURN current_count + 1;
END;
$$;


ALTER FUNCTION "public"."increment_usage"("row_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_letter_audit"("p_letter_id" "uuid", "p_action" "text", "p_old_status" "text" DEFAULT NULL::"text", "p_new_status" "text" DEFAULT NULL::"text", "p_notes" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT NULL::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO letter_audit_trail (
        letter_id,
        action,
        performed_by,
        old_status,
        new_status,
        notes,
        metadata
    ) VALUES (
        p_letter_id,
        p_action,
        auth.uid(),
        p_old_status,
        p_new_status,
        p_notes,
        p_metadata
    );
END;
$$;


ALTER FUNCTION "public"."log_letter_audit"("p_letter_id" "uuid", "p_action" "text", "p_old_status" "text", "p_new_status" "text", "p_notes" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_security_event"("p_user_id" "uuid", "p_event_type" "text", "p_ip_address" "inet" DEFAULT NULL::"inet", "p_user_agent" "text" DEFAULT NULL::"text", "p_details" "jsonb" DEFAULT NULL::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."log_security_event"("p_user_id" "uuid", "p_event_type" "text", "p_ip_address" "inet", "p_user_agent" "text", "p_details" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_monthly_allowances"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    UPDATE subscriptions
    SET remaining_letters = CASE
            WHEN plan_type IN ('standard_4_month', 'monthly_standard') THEN 4
            WHEN plan_type IN ('premium_8_month', 'monthly_premium') THEN 8
            ELSE remaining_letters -- one_time doesn't reset
        END,
        last_reset_at = NOW(),
        updated_at = NOW()
    WHERE status = 'active'
      AND plan_type IN ('standard_4_month', 'premium_8_month', 'monthly_standard', 'monthly_premium')
      AND DATE_TRUNC('month', last_reset_at) < DATE_TRUNC('month', NOW());
END;
$$;


ALTER FUNCTION "public"."reset_monthly_allowances"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sanitize_input"("input_text" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
    -- Basic sanitization - remove potential SQL injection patterns
    RETURN regexp_replace(input_text, '[;''"\\]', '', 'g');
END;
$$;


ALTER FUNCTION "public"."sanitize_input"("input_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_coupon"("coupon_code" "text") RETURNS TABLE("is_valid" boolean, "discount_percent" integer, "employee_id" "uuid", "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."validate_coupon"("coupon_code" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."commissions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "subscription_id" "uuid" NOT NULL,
    "commission_rate" numeric(5,4) DEFAULT 0.05,
    "subscription_amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "commission_amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "status" "public"."commission_status" DEFAULT 'pending'::"public"."commission_status",
    "paid_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_commission_amount" CHECK (("commission_amount" >= (0)::numeric)),
    CONSTRAINT "check_commission_rate" CHECK ((("commission_rate" >= (0)::numeric) AND ("commission_rate" <= (1)::numeric)))
);


ALTER TABLE "public"."commissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."coupon_usage" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "employee_id" "uuid",
    "coupon_code" "text" NOT NULL,
    "discount_percent" integer NOT NULL,
    "amount_before" numeric(10,2) NOT NULL,
    "amount_after" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."coupon_usage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_coupons" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "employee_id" "uuid",
    "code" "text" NOT NULL,
    "discount_percent" integer DEFAULT 20,
    "is_active" boolean DEFAULT true,
    "usage_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_coupon_discount" CHECK ((("discount_percent" >= 0) AND ("discount_percent" <= 100))),
    CONSTRAINT "check_coupon_usage" CHECK (("usage_count" >= 0)),
    CONSTRAINT "employee_coupons_discount_percent_check" CHECK ((("discount_percent" >= 0) AND ("discount_percent" <= 100)))
);


ALTER TABLE "public"."employee_coupons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."letter_audit_trail" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "letter_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "performed_by" "uuid",
    "old_status" "text",
    "new_status" "text",
    "notes" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."letter_audit_trail" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."letters" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "status" "public"."letter_status" DEFAULT 'draft'::"public"."letter_status",
    "letter_type" "text",
    "intake_data" "jsonb" DEFAULT '{}'::"jsonb",
    "ai_draft_content" "text",
    "final_content" "text",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "review_notes" "text",
    "rejection_reason" "text",
    "approved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."letters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "role" "public"."user_role" DEFAULT 'subscriber'::"public"."user_role",
    "phone" "text",
    "company_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_super_user" boolean DEFAULT false
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."security_audit_log" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "event_type" "text" NOT NULL,
    "ip_address" "inet",
    "user_agent" "text",
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."security_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."security_config" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "key" "text" NOT NULL,
    "value" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."security_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "public"."subscription_status" DEFAULT 'active'::"public"."subscription_status",
    "coupon_code" "text",
    "plan" "text" DEFAULT 'single_letter'::"text",
    "price" numeric(10,2) DEFAULT 299.00,
    "discount" numeric(10,2) DEFAULT 0.00,
    "stripe_subscription_id" "text",
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "remaining_letters" integer DEFAULT 0,
    "last_reset_at" timestamp with time zone DEFAULT "now"(),
    "plan_type" "text",
    "credits_remaining" integer DEFAULT 0,
    CONSTRAINT "check_subscription_discount" CHECK ((("discount" >= (0)::numeric) AND ("discount" <= "price"))),
    CONSTRAINT "check_subscription_price" CHECK ((("price" >= (0)::numeric) AND ("price" <= 99999.99)))
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."commissions"
    ADD CONSTRAINT "commissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coupon_usage"
    ADD CONSTRAINT "coupon_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_coupons"
    ADD CONSTRAINT "employee_coupons_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."employee_coupons"
    ADD CONSTRAINT "employee_coupons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."letter_audit_trail"
    ADD CONSTRAINT "letter_audit_trail_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."letters"
    ADD CONSTRAINT "letters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."security_audit_log"
    ADD CONSTRAINT "security_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."security_config"
    ADD CONSTRAINT "security_config_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."security_config"
    ADD CONSTRAINT "security_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_audit_action" ON "public"."letter_audit_trail" USING "btree" ("action");



CREATE INDEX "idx_audit_created_at" ON "public"."letter_audit_trail" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_letter" ON "public"."letter_audit_trail" USING "btree" ("letter_id");



CREATE INDEX "idx_audit_performed_by" ON "public"."letter_audit_trail" USING "btree" ("performed_by");



CREATE INDEX "idx_commissions_employee" ON "public"."commissions" USING "btree" ("employee_id");



CREATE INDEX "idx_coupon_usage_code" ON "public"."coupon_usage" USING "btree" ("coupon_code");



CREATE INDEX "idx_coupon_usage_employee" ON "public"."coupon_usage" USING "btree" ("employee_id");



CREATE INDEX "idx_coupon_usage_user" ON "public"."coupon_usage" USING "btree" ("user_id");



CREATE INDEX "idx_employee_coupons_code" ON "public"."employee_coupons" USING "btree" ("code");



CREATE INDEX "idx_employee_coupons_employee" ON "public"."employee_coupons" USING "btree" ("employee_id");



CREATE INDEX "idx_letters_status" ON "public"."letters" USING "btree" ("status");



CREATE INDEX "idx_letters_user_id" ON "public"."letters" USING "btree" ("user_id");



CREATE INDEX "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "idx_profiles_role" ON "public"."profiles" USING "btree" ("role");



CREATE INDEX "idx_subscriptions_plan_type" ON "public"."subscriptions" USING "btree" ("plan_type");



CREATE INDEX "idx_subscriptions_user" ON "public"."subscriptions" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "trigger_create_employee_coupon" AFTER INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."create_employee_coupon"();



ALTER TABLE ONLY "public"."commissions"
    ADD CONSTRAINT "commissions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."commissions"
    ADD CONSTRAINT "commissions_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coupon_usage"
    ADD CONSTRAINT "coupon_usage_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."coupon_usage"
    ADD CONSTRAINT "coupon_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employee_coupons"
    ADD CONSTRAINT "employee_coupons_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."letter_audit_trail"
    ADD CONSTRAINT "letter_audit_trail_letter_id_fkey" FOREIGN KEY ("letter_id") REFERENCES "public"."letters"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."letter_audit_trail"
    ADD CONSTRAINT "letter_audit_trail_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."letters"
    ADD CONSTRAINT "letters_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."letters"
    ADD CONSTRAINT "letters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."security_audit_log"
    ADD CONSTRAINT "security_audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can manage profiles" ON "public"."profiles" USING (("public"."get_user_role"() = 'admin'::"text"));



CREATE POLICY "Admins can view all profiles" ON "public"."profiles" FOR SELECT USING (("public"."get_user_role"() = 'admin'::"text"));



CREATE POLICY "Admins create commissions" ON "public"."commissions" FOR INSERT WITH CHECK (("public"."get_user_role"() = 'admin'::"text"));



CREATE POLICY "Admins full letter access" ON "public"."letters" USING (("public"."get_user_role"() = 'admin'::"text"));



CREATE POLICY "Admins manage all coupon usage" ON "public"."coupon_usage" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"public"."user_role")))));



CREATE POLICY "Admins manage all coupons" ON "public"."employee_coupons" USING (("public"."get_user_role"() = 'admin'::"text"));



CREATE POLICY "Admins only access security config" ON "public"."security_config" USING (("public"."get_user_role"() = 'admin'::"text"));



CREATE POLICY "Admins update commissions" ON "public"."commissions" FOR UPDATE USING (("public"."get_user_role"() = 'admin'::"text"));



CREATE POLICY "Admins view all audit logs" ON "public"."letter_audit_trail" FOR SELECT USING (("public"."get_user_role"() = 'admin'::"text"));



CREATE POLICY "Admins view all commissions" ON "public"."commissions" FOR SELECT USING (("public"."get_user_role"() = 'admin'::"text"));



CREATE POLICY "Admins view all subscriptions" ON "public"."subscriptions" FOR SELECT USING (("public"."get_user_role"() = 'admin'::"text"));



CREATE POLICY "Admins view security audit log" ON "public"."security_audit_log" FOR SELECT USING (("public"."get_user_role"() = 'admin'::"text"));



CREATE POLICY "Block employees from letters" ON "public"."letters" USING (("public"."get_user_role"() <> 'employee'::"text"));



CREATE POLICY "Employees create own coupon" ON "public"."employee_coupons" FOR INSERT WITH CHECK (("employee_id" = "auth"."uid"()));



CREATE POLICY "Employees view coupon usage from their codes" ON "public"."coupon_usage" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."employee_coupons" "ec"
  WHERE (("ec"."employee_id" = "auth"."uid"()) AND ("ec"."code" = "coupon_usage"."coupon_code")))));



CREATE POLICY "Employees view own commissions" ON "public"."commissions" FOR SELECT USING (("employee_id" = "auth"."uid"()));



CREATE POLICY "Employees view own coupons" ON "public"."employee_coupons" FOR SELECT USING (("employee_id" = "auth"."uid"()));



CREATE POLICY "Public can validate coupons" ON "public"."employee_coupons" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Subscribers create own letters" ON "public"."letters" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) AND ("public"."get_user_role"() = 'subscriber'::"text")));



CREATE POLICY "Subscribers update own letters" ON "public"."letters" FOR UPDATE USING ((("user_id" = "auth"."uid"()) AND ("public"."get_user_role"() = 'subscriber'::"text")));



CREATE POLICY "Subscribers view own letters" ON "public"."letters" FOR SELECT USING ((("user_id" = "auth"."uid"()) AND ("public"."get_user_role"() = 'subscriber'::"text")));



CREATE POLICY "System can insert security events" ON "public"."security_audit_log" FOR INSERT WITH CHECK (true);



CREATE POLICY "Users can create subscriptions" ON "public"."subscriptions" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("id" = "auth"."uid"()));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("id" = "auth"."uid"()));



CREATE POLICY "Users view own coupon usage" ON "public"."coupon_usage" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users view own letter audit" ON "public"."letter_audit_trail" FOR SELECT USING (("letter_id" IN ( SELECT "letters"."id"
   FROM "public"."letters"
  WHERE ("letters"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users view own subscriptions" ON "public"."subscriptions" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."commissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coupon_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employee_coupons" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."letter_audit_trail" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."letters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."security_audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."security_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."add_letter_allowances"("sub_id" "uuid", "plan_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."add_letter_allowances"("sub_id" "uuid", "plan_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_letter_allowances"("sub_id" "uuid", "plan_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_letter_allowance"("u_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_letter_allowance"("u_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_letter_allowance"("u_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_employee_coupon"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_employee_coupon"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_employee_coupon"() TO "service_role";



GRANT ALL ON FUNCTION "public"."deduct_letter_allowance"("u_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."deduct_letter_allowance"("u_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."deduct_letter_allowance"("u_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."detect_suspicious_activity"("user_id" "uuid", "action_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."detect_suspicious_activity"("user_id" "uuid", "action_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."detect_suspicious_activity"("user_id" "uuid", "action_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_commission_summary"("emp_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_commission_summary"("emp_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_commission_summary"("emp_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_usage"("row_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_usage"("row_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_usage"("row_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_letter_audit"("p_letter_id" "uuid", "p_action" "text", "p_old_status" "text", "p_new_status" "text", "p_notes" "text", "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."log_letter_audit"("p_letter_id" "uuid", "p_action" "text", "p_old_status" "text", "p_new_status" "text", "p_notes" "text", "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_letter_audit"("p_letter_id" "uuid", "p_action" "text", "p_old_status" "text", "p_new_status" "text", "p_notes" "text", "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_security_event"("p_user_id" "uuid", "p_event_type" "text", "p_ip_address" "inet", "p_user_agent" "text", "p_details" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."log_security_event"("p_user_id" "uuid", "p_event_type" "text", "p_ip_address" "inet", "p_user_agent" "text", "p_details" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_security_event"("p_user_id" "uuid", "p_event_type" "text", "p_ip_address" "inet", "p_user_agent" "text", "p_details" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_monthly_allowances"() TO "anon";
GRANT ALL ON FUNCTION "public"."reset_monthly_allowances"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_monthly_allowances"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sanitize_input"("input_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."sanitize_input"("input_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sanitize_input"("input_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_coupon"("coupon_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_coupon"("coupon_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_coupon"("coupon_code" "text") TO "service_role";


















GRANT ALL ON TABLE "public"."commissions" TO "anon";
GRANT ALL ON TABLE "public"."commissions" TO "authenticated";
GRANT ALL ON TABLE "public"."commissions" TO "service_role";



GRANT ALL ON TABLE "public"."coupon_usage" TO "anon";
GRANT ALL ON TABLE "public"."coupon_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."coupon_usage" TO "service_role";



GRANT ALL ON TABLE "public"."employee_coupons" TO "anon";
GRANT ALL ON TABLE "public"."employee_coupons" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_coupons" TO "service_role";



GRANT ALL ON TABLE "public"."letter_audit_trail" TO "anon";
GRANT ALL ON TABLE "public"."letter_audit_trail" TO "authenticated";
GRANT ALL ON TABLE "public"."letter_audit_trail" TO "service_role";



GRANT ALL ON TABLE "public"."letters" TO "anon";
GRANT ALL ON TABLE "public"."letters" TO "authenticated";
GRANT ALL ON TABLE "public"."letters" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."security_audit_log" TO "anon";
GRANT ALL ON TABLE "public"."security_audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."security_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."security_config" TO "anon";
GRANT ALL ON TABLE "public"."security_config" TO "authenticated";
GRANT ALL ON TABLE "public"."security_config" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































