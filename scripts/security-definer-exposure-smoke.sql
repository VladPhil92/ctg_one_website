\set ON_ERROR_STOP on

CREATE TEMP TABLE approved_authenticated_security_definers(signature text PRIMARY KEY);
\copy approved_authenticated_security_definers(signature) FROM 'scripts/security-definer-authenticated-allowlist.txt' WITH (FORMAT text)

DO $$
DECLARE v_actual text[];
BEGIN
  SELECT coalesce(array_agg(n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' ORDER BY n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)),ARRAY[]::text[])
  INTO v_actual
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname IN ('public','graphql_public') AND p.prosecdef
    AND has_function_privilege('anon',p.oid,'EXECUTE');
  IF v_actual IS DISTINCT FROM ARRAY[
    'public.get_public_bottle_trace(p_serial_code text)',
    'public.get_public_investment_lot_funding(p_lot_id uuid)',
    'public.get_public_investment_lot_operations(p_lot_id uuid)'
  ]::text[] THEN
    RAISE EXCEPTION 'unexpected anonymous database function exposure: %',v_actual;
  END IF;
END $$;

DO $$
DECLARE v_unapproved text[]; v_stale text[];
BEGIN
  WITH actual AS (
    SELECT n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' signature
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname IN ('public','graphql_public') AND p.prosecdef
      AND has_function_privilege('authenticated',p.oid,'EXECUTE')
  )
  SELECT coalesce(array_agg(signature ORDER BY signature),ARRAY[]::text[]) INTO v_unapproved
  FROM (SELECT signature FROM actual EXCEPT SELECT signature FROM approved_authenticated_security_definers) x;

  WITH actual AS (
    SELECT n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' signature
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname IN ('public','graphql_public') AND p.prosecdef
      AND has_function_privilege('authenticated',p.oid,'EXECUTE')
  )
  SELECT coalesce(array_agg(signature ORDER BY signature),ARRAY[]::text[]) INTO v_stale
  FROM (SELECT signature FROM approved_authenticated_security_definers EXCEPT SELECT signature FROM actual) x;

  IF cardinality(v_unapproved)>0 THEN RAISE EXCEPTION 'unreviewed authenticated database function(s): %',v_unapproved; END IF;
  IF cardinality(v_stale)>0 THEN RAISE EXCEPTION 'stale reviewed database function signature(s): %',v_stale; END IF;
END $$;

DO $$
DECLARE v_missing text[];
BEGIN
  SELECT coalesce(array_agg(n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' ORDER BY n.nspname,p.proname),ARRAY[]::text[])
  INTO v_missing
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname IN ('public','graphql_public') AND p.prosecdef
    AND (has_function_privilege('anon',p.oid,'EXECUTE') OR has_function_privilege('authenticated',p.oid,'EXECUTE'))
    AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig,ARRAY[]::text[])) cfg WHERE cfg LIKE 'search_path=%');
  IF cardinality(v_missing)>0 THEN RAISE EXCEPTION 'reviewed database function(s) missing fixed search_path: %',v_missing; END IF;
END $$;

DO $$
DECLARE v_result text; v_definition text; v_refs text[];
BEGIN
  SELECT pg_get_function_result('public.get_public_bottle_trace(text)'::regprocedure),pg_get_functiondef('public.get_public_bottle_trace(text)'::regprocedure)
  INTO v_result,v_definition;
  IF v_result IS DISTINCT FROM 'TABLE(serial_code text, unit_number integer, bottle_status text, current_location text, packaged_at timestamp with time zone, sold_at timestamp with time zone, lot_code text, beer_style text, destination text, lot_status text, case_size_units integer)' THEN
    RAISE EXCEPTION 'public bottle trace result changed: %',v_result;
  END IF;
  SELECT coalesce(array_agg(DISTINCT m[1] ORDER BY m[1]),ARRAY[]::text[]) INTO v_refs FROM regexp_matches(v_definition,E'public\\.([A-Za-z0-9_]+)','g') m;
  IF v_refs IS DISTINCT FROM ARRAY['get_public_bottle_trace','investment_bottle_units','investment_production_lots']::text[] THEN
    RAISE EXCEPTION 'public bottle trace object set changed: %',v_refs;
  END IF;
END $$;

DO $$
DECLARE v_result text; v_definition text; v_refs text[];
BEGIN
  SELECT pg_get_function_result('public.get_public_investment_lot_funding(uuid)'::regprocedure),pg_get_functiondef('public.get_public_investment_lot_funding(uuid)'::regprocedure)
  INTO v_result,v_definition;
  IF v_result IS DISTINCT FROM 'TABLE(lot_id uuid, total_cases integer, allocated_cases integer, reserved_cases integer, funded_percent integer, available_cases_equivalent integer)' THEN
    RAISE EXCEPTION 'public funding result changed: %',v_result;
  END IF;
  SELECT coalesce(array_agg(DISTINCT m[1] ORDER BY m[1]),ARRAY[]::text[]) INTO v_refs FROM regexp_matches(v_definition,E'public\\.([A-Za-z0-9_]+)','g') m;
  IF v_refs IS DISTINCT FROM ARRAY['get_public_investment_lot_funding','investment_funding_allocations','investment_orders','investment_production_lots','investment_reinvestment_requests']::text[] THEN
    RAISE EXCEPTION 'public funding object set changed: %',v_refs;
  END IF;
  IF v_definition ~* '(participant_user_id|capital_committed_cents|external_reference|payment_proof_storage_path|payment_proof_sha256|bank_verified_reference|bank_verified_amount_cents|bank_received_at|bank_verified_by)' THEN
    RAISE EXCEPTION 'public funding definition references reviewed-private fields';
  END IF;
END $$;

DO $$
DECLARE v_result text; v_definition text; v_refs text[];
BEGIN
  SELECT pg_get_function_result('public.get_public_investment_lot_operations(uuid)'::regprocedure),pg_get_functiondef('public.get_public_investment_lot_operations(uuid)'::regprocedure)
  INTO v_result,v_definition;
  IF v_result IS DISTINCT FROM 'TABLE(lot_id uuid, serialized_units integer, warehouse_units integer, dispatched_units integer, in_market_units integer, sold_units integer, returned_units integer, incident_units integer, timeline jsonb)' THEN
    RAISE EXCEPTION 'public lot operations result changed: %',v_result;
  END IF;
  SELECT coalesce(array_agg(DISTINCT m[1] ORDER BY m[1]),ARRAY[]::text[]) INTO v_refs FROM regexp_matches(v_definition,E'public\\.([A-Za-z0-9_]+)','g') m;
  IF v_refs IS DISTINCT FROM ARRAY['get_public_investment_lot_operations','investment_bottle_units','investment_production_events','investment_production_lots']::text[] THEN
    RAISE EXCEPTION 'public lot operations object set changed: %',v_refs;
  END IF;
  IF v_definition ~* '(actor_id|evidence_document_id|notes|serial_code|current_location|sale_reference|sale_price_cents|last_actor_id)' THEN
    RAISE EXCEPTION 'public lot operations definition references reviewed-private fields';
  END IF;
END $$;

DO $$
DECLARE v_lot_anon text; v_lot_authenticated text; v_event_ops text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='investment_production_lots' AND policyname='investment_production_lots_select') THEN
    RAISE EXCEPTION 'historical unconditional lot SELECT policy still exists';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='investment_production_lots' AND policyname IN ('investment_production_lots_public_select','investment_production_lots_ops_select')) THEN
    RAISE EXCEPTION 'pre-0106 split lot SELECT policies still exist';
  END IF;

  SELECT qual INTO v_lot_anon
  FROM pg_policies
  WHERE schemaname='public' AND tablename='investment_production_lots'
    AND policyname='investment_production_lots_anon_select' AND cmd='SELECT'
    AND 'anon'=ANY(roles) AND NOT ('authenticated'=ANY(roles));

  SELECT qual INTO v_lot_authenticated
  FROM pg_policies
  WHERE schemaname='public' AND tablename='investment_production_lots'
    AND policyname='investment_production_lots_authenticated_select' AND cmd='SELECT'
    AND 'authenticated'=ANY(roles) AND NOT ('anon'=ANY(roles));

  IF v_lot_anon IS NULL OR v_lot_anon NOT LIKE '%status <> ''DRAFT''%' OR v_lot_anon LIKE '%has_investment_permission%' THEN
    RAISE EXCEPTION 'anonymous lot policy changed: %',v_lot_anon;
  END IF;
  IF v_lot_authenticated IS NULL
     OR v_lot_authenticated NOT LIKE '%status <> ''DRAFT''%'
     OR v_lot_authenticated NOT LIKE '%has_investment_permission%ops.read%'
     OR v_lot_authenticated NOT LIKE '%SELECT has_investment_permission%' THEN
    RAISE EXCEPTION 'authenticated lot policy changed: %',v_lot_authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='investment_production_events' AND policyname='investment_production_events_select') THEN
    RAISE EXCEPTION 'historical public production-event policy still exists';
  END IF;
  SELECT qual INTO v_event_ops FROM pg_policies WHERE schemaname='public' AND tablename='investment_production_events' AND policyname='investment_production_events_ops_select' AND cmd='SELECT' AND 'authenticated'=ANY(roles);
  IF v_event_ops IS NULL OR v_event_ops NOT LIKE '%has_investment_permission%ops.read%' THEN RAISE EXCEPTION 'production-event ops policy changed: %',v_event_ops; END IF;
END $$;

DO $$
DECLARE
  v_signature text;
  v_oid oid;
BEGIN
  FOREACH v_signature IN ARRAY ARRAY[
    'public.create_production_lot_from_style(text,text,integer,integer,bigint,bigint,bigint,bigint,bigint,numeric,numeric,integer)',
    'public.update_investment_beer_style_economics(text,bigint,bigint,bigint,bigint,bigint,numeric,numeric)',
    'public.get_inventory_reconciliation(uuid)',
    'public.get_investment_money_rail_health()',
    'public.get_investment_provider_reconciliation_health()',
    'public.get_sales_return_reconciliation(uuid)'
  ]::text[]
  LOOP
    v_oid := to_regprocedure(v_signature);
    IF v_oid IS NULL THEN
      RAISE EXCEPTION '0107 reviewed internal SECURITY DEFINER RPC missing: %',v_signature;
    END IF;
    IF has_function_privilege('anon',v_oid,'EXECUTE')
       OR has_function_privilege('authenticated',v_oid,'EXECUTE') THEN
      RAISE EXCEPTION '0107 internal SECURITY DEFINER RPC still exposed: %',v_signature;
    END IF;
    IF NOT has_function_privilege('service_role',v_oid,'EXECUTE') THEN
      RAISE EXCEPTION '0107 internal SECURITY DEFINER RPC missing service_role execution: %',v_signature;
    END IF;
  END LOOP;
END $$;

SELECT 'SECURITY DEFINER exposure contract: PASS' AS result;
