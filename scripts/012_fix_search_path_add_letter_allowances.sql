-- Fix search_path for add_letter_allowances function
-- This addresses the lint warning about mutable search_path

DROP FUNCTION IF EXISTS add_letter_allowances(UUID, TEXT);

CREATE FUNCTION add_letter_allowances(sub_id UUID, plan TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    letters_to_add INT;
BEGIN
    IF plan = 'one_time' THEN
        letters_to_add := 1;
    ELSIF plan = 'standard_4_month' THEN
        letters_to_add := 4;
    ELSIF plan = 'premium_8_month' THEN
        letters_to_add := 8;
    ELSE
        RAISE EXCEPTION 'Invalid plan type: %', plan;
    END IF;

    UPDATE public.subscriptions
    SET remaining_letters = letters_to_add,
        last_reset_at = NOW(),
        updated_at = NOW()
    WHERE id = sub_id;
END;
$$;