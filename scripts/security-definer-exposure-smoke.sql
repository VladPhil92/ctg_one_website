\set ON_ERROR_STOP on

-- SECURITY DEFINER functions cross the normal privilege boundary. Data API
-- exposure is therefore deny-by-default and reviewed by exact signature, not
-- inferred from comments or unstructured source-code substrings.

CREATE TEMP TABLE approved_authenticated_security_definers(
  signature text PRIMARY KEY
);

\copy approved_authenticated_security_definers(signature) FROM 'scripts/security-definer-authenticated-allowlist.txt' WITH (FORMAT text)

-- All schemas configured in supabase/config.toml [api].schemas are in scope.
DO $$
DECLARE
  v_anon_exposures text[];
BEGIN
  SELECT coalesce(
    array_agg(
      n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
      ORDER BY n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)
    ),
    ARRAY[]::text[]
  )
  INTO v_anon_exposures
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname IN ('public', 'graphql_public')
    AND p.prosecdef
    AND has_function_privilege('anon', p.oid, 'EXECUTE');

  IF v_anon_exposures IS DISTINCT FROM ARRAY[
    'public.get_public_bottle_trace(p_serial_code text)',
    'public.get_public_investment_lot_funding(p_lot_id uuid)'
  ]::text[] THEN
    RAISE EXCEPTION 'unexpected anonymous SECURITY DEFINER exposure(s): %', v_anon_exposures;
  END IF;
END $$;

-- Authenticated SECURITY DEFINER exposure is an explicit reviewed allowlist.
-- Any new overload, new function, removed grant or new function in graphql_public
-- changes the actual signature set and therefore requires a deliberate review.
DO $$
DECLARE
  v_unapproved text[];
  v_stale_approvals text[];
BEGIN
  WITH actual AS (
    SELECT
      n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname IN ('public', 'graphql_public')
      AND p.prosecdef
      AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
  )
  SELECT coalesce(array_agg(signature ORDER BY signature), ARRAY[]::text[])
  INTO v_unapproved
  FROM (
    SELECT signature FROM actual
    EXCEPT
    SELECT signature FROM approved_authenticated_security_definers
  ) unexpected;

  WITH actual AS (
    SELECT
      n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname IN ('public', 'graphql_public')
      AND p.prosecdef
      AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
  )
  SELECT coalesce(array_agg(signature ORDER BY signature), ARRAY[]::text[])
  INTO v_stale_approvals
  FROM (
    SELECT signature FROM approved_authenticated_security_definers
    EXCEPT
    SELECT signature FROM actual
  ) stale;

  IF cardinality(v_unapproved) > 0 THEN
    RAISE EXCEPTION 'unreviewed authenticated SECURITY DEFINER exposure(s): %', v_unapproved;
  END IF;

  IF cardinality(v_stale_approvals) > 0 THEN
    RAISE EXCEPTION 'SECURITY DEFINER allowlist contains stale signature(s): %', v_stale_approvals;
  END IF;
END $$;

-- Every exposed SECURITY DEFINER function must pin a search_path. This prevents
-- privilege escalation through caller-controlled object resolution.
DO $$
DECLARE
  v_unpinned text[];
BEGIN
  SELECT coalesce(
    array_agg(
      n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
      ORDER BY n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)
    ),
    ARRAY[]::text[]
  )
  INTO v_unpinned
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname IN ('public', 'graphql_public')
    AND p.prosecdef
    AND (
      has_function_privilege('anon', p.oid, 'EXECUTE')
      OR has_function_privilege('authenticated', p.oid, 'EXECUTE')
    )
    AND NOT EXISTS (
      SELECT 1
      FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg
      WHERE cfg LIKE 'search_path=%'
    );

  IF cardinality(v_unpinned) > 0 THEN
    RAISE EXCEPTION 'browser-exposed SECURITY DEFINER function(s) lack pinned search_path: %', v_unpinned;
  END IF;
END $$;

-- Anonymous exceptions have exact reviewed data contracts. Their result shapes
-- and every public-schema object reference are allowlisted.
DO $$
DECLARE
  v_definition text;
  v_result text;
  v_public_references text[];
  v_expected_result constant text :=
    'TABLE(serial_code text, unit_number integer, bottle_status text, current_location text, packaged_at timestamp with time zone, sold_at timestamp with time zone, lot_code text, beer_style text, destination text, lot_status text, case_size_units integer)';
BEGIN
  IF to_regprocedure('public.get_public_bottle_trace(text)') IS NULL THEN
    RAISE EXCEPTION 'reviewed public bottle trace function is missing';
  END IF;

  SELECT
    pg_get_functiondef('public.get_public_bottle_trace(text)'::regprocedure),
    pg_get_function_result('public.get_public_bottle_trace(text)'::regprocedure)
  INTO v_definition, v_result;

  IF v_result IS DISTINCT FROM v_expected_result THEN
    RAISE EXCEPTION 'public bottle trace result contract changed: %', v_result;
  END IF;

  SELECT coalesce(array_agg(DISTINCT m[1] ORDER BY m[1]), ARRAY[]::text[])
  INTO v_public_references
  FROM regexp_matches(v_definition, E'public\\.([A-Za-z0-9_]+)', 'g') AS m;

  IF v_public_references IS DISTINCT FROM ARRAY[
    'get_public_bottle_trace',
    'investment_bottle_units',
    'investment_production_lots'
  ]::text[] THEN
    RAISE EXCEPTION 'public bottle trace references unreviewed public object(s): %', v_public_references;
  END IF;
END $$;

DO $$
DECLARE
  v_definition text;
  v_result text;
  v_public_references text[];
  v_expected_result constant text :=
    'TABLE(lot_id uuid, total_cases integer, allocated_cases integer, reserved_cases integer, funded_percent integer, available_cases_equivalent integer)';
BEGIN
  IF to_regprocedure('public.get_public_investment_lot_funding(uuid)') IS NULL THEN
    RAISE EXCEPTION 'reviewed public investment funding function is missing';
  END IF;

  SELECT
    pg_get_functiondef('public.get_public_investment_lot_funding(uuid)'::regprocedure),
    pg_get_function_result('public.get_public_investment_lot_funding(uuid)'::regprocedure)
  INTO v_definition, v_result;

  IF v_result IS DISTINCT FROM v_expected_result THEN
    RAISE EXCEPTION 'public investment funding result contract changed: %', v_result;
  END IF;

  SELECT coalesce(array_agg(DISTINCT m[1] ORDER BY m[1]), ARRAY[]::text[])
  INTO v_public_references
  FROM regexp_matches(v_definition, E'public\\.([A-Za-z0-9_]+)', 'g') AS m;

  IF v_public_references IS DISTINCT FROM ARRAY[
    'get_public_investment_lot_funding',
    'investment_funding_allocations',
    'investment_orders',
    'investment_production_lots'
  ]::text[] THEN
    RAISE EXCEPTION 'public investment funding references unreviewed public object(s): %', v_public_references;
  END IF;

  IF v_definition ~* '(participant_user_id|capital_committed_cents|external_reference|payment_proof_storage_path|payment_proof_sha256|payment_proof_original_name|payment_proof_mime|bank_verified_reference|bank_verified_amount_cents|bank_received_at|bank_verified_by)' THEN
    RAISE EXCEPTION 'public investment funding function definition references prohibited participant/payment fields';
  END IF;
END $$;

-- Public lot publication itself is fail-closed for internal DRAFT rows. The
-- operational policy is separate so internal visibility cannot accidentally
-- widen the anonymous policy.
DO $$
DECLARE
  v_public_qual text;
  v_ops_qual text;
  v_old_policy_count integer;
BEGIN
  SELECT count(*)
  INTO v_old_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'investment_production_lots'
    AND policyname = 'investment_production_lots_select';

  IF v_old_policy_count <> 0 THEN
    RAISE EXCEPTION 'historical unconditional production-lot SELECT policy still exists';
  END IF;

  SELECT qual
  INTO v_public_qual
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'investment_production_lots'
    AND policyname = 'investment_production_lots_public_select'
    AND cmd = 'SELECT'
    AND 'anon' = ANY(roles)
    AND 'authenticated' = ANY(roles);

  IF v_public_qual IS NULL OR v_public_qual NOT LIKE '%status <> ''DRAFT''%' THEN
    RAISE EXCEPTION 'public production-lot RLS does not exclude DRAFT: %', v_public_qual;
  END IF;

  SELECT qual
  INTO v_ops_qual
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'investment_production_lots'
    AND policyname = 'investment_production_lots_ops_select'
    AND cmd = 'SELECT'
    AND 'authenticated' = ANY(roles);

  IF v_ops_qual IS NULL OR v_ops_qual NOT LIKE '%has_investment_permission%ops.read%' THEN
    RAISE EXCEPTION 'ops production-lot RLS no longer preserves ops.read draft access: %', v_ops_qual;
  END IF;
END $$;

SELECT 'SECURITY DEFINER exposure contract: PASS' AS result;
