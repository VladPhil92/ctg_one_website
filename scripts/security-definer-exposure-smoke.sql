\set ON_ERROR_STOP on

-- SECURITY DEFINER functions cross the normal privilege boundary. Keep the
-- browser-exposed surface deliberate: anonymous execution is deny-by-default,
-- and authenticated execution requires an explicit authorization guard in the
-- function body. The public bottle trace is the single reviewed anonymous
-- exception because it exposes only non-sensitive physical provenance.

DO $$
DECLARE
  v_anon_exposures text[];
BEGIN
  SELECT coalesce(array_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' ORDER BY p.proname, pg_get_function_identity_arguments(p.oid)), ARRAY[]::text[])
  INTO v_anon_exposures
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef
    AND has_function_privilege('anon', p.oid, 'EXECUTE');

  IF v_anon_exposures IS DISTINCT FROM ARRAY['get_public_bottle_trace(p_serial_code text)']::text[] THEN
    RAISE EXCEPTION 'unexpected anonymous SECURITY DEFINER exposure(s): %', v_anon_exposures;
  END IF;
END $$;

DO $$
DECLARE
  v_unguarded text[];
BEGIN
  WITH exposed AS (
    SELECT
      p.oid,
      p.proname,
      pg_get_function_identity_arguments(p.oid) AS args,
      pg_get_functiondef(p.oid) AS definition
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
      AND NOT (
        p.proname = 'get_public_bottle_trace'
        AND pg_get_function_identity_arguments(p.oid) = 'p_serial_code text'
      )
  )
  SELECT coalesce(array_agg(proname || '(' || args || ')' ORDER BY proname, args), ARRAY[]::text[])
  INTO v_unguarded
  FROM exposed
  WHERE definition !~* '(auth\.uid\(\)|has_investment_permission\(|is_admin\(\)|get_investment_role\(\)|is_investment_admin\(\)|is_investment_operator\(\)|is_investment_sales_operator\()';

  IF cardinality(v_unguarded) > 0 THEN
    RAISE EXCEPTION 'authenticated SECURITY DEFINER function(s) lack a reviewed authorization guard: %', v_unguarded;
  END IF;
END $$;

DO $$
DECLARE
  v_definition text;
  v_result text;
BEGIN
  IF to_regprocedure('public.get_public_bottle_trace(text)') IS NULL THEN
    RAISE EXCEPTION 'reviewed public bottle trace function is missing';
  END IF;

  SELECT pg_get_functiondef('public.get_public_bottle_trace(text)'::regprocedure),
         pg_get_function_result('public.get_public_bottle_trace(text)'::regprocedure)
  INTO v_definition, v_result;

  IF v_definition !~ 'investment_bottle_units' OR v_definition !~ 'investment_production_lots' THEN
    RAISE EXCEPTION 'public bottle trace no longer derives only from reviewed physical provenance sources';
  END IF;

  IF (v_definition || ' ' || v_result) ~* '(participant_user_id|investment_ledger_entries|investment_payment_receipts|investment_payouts|bank_account|payment_reference|payment_proof|destination_fingerprint|provider_event_key|merchant_reference|external_reference)' THEN
    RAISE EXCEPTION 'public bottle trace exposes or references a prohibited financial/identity field';
  END IF;
END $$;

SELECT 'SECURITY DEFINER exposure contract: PASS' AS result;
