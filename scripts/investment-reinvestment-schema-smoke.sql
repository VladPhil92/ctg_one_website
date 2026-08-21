\set ON_ERROR_STOP on

DO $$
DECLARE
  v_nullable text;
  v_definition text;
BEGIN
  SELECT is_nullable INTO v_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'investment_reinvestment_requests'
    AND column_name = 'case_equivalent_units';
  IF v_nullable IS NULL THEN
    RAISE EXCEPTION 'case_equivalent_units column missing from investment_reinvestment_requests';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='investment_reinvestment_requests'
      AND column_name='client_idempotency_key'
  ) THEN
    RAISE EXCEPTION 'reinvestment idempotency column missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='public.investment_reinvestment_requests'::regclass
      AND conname='investment_reinvestment_requests_case_quantity_check'
  ) THEN
    RAISE EXCEPTION 'reinvestment case quantity constraint missing';
  END IF;

  IF has_function_privilege('authenticated','public.request_reinvestment(uuid,uuid,bigint)'::regprocedure,'EXECUTE') THEN
    RAISE EXCEPTION 'legacy amount-only reinvestment command remains exposed to authenticated';
  END IF;

  IF NOT has_function_privilege('authenticated','public.request_reinvestment_cases(uuid,uuid,integer,text)'::regprocedure,'EXECUTE')
     OR has_function_privilege('anon','public.request_reinvestment_cases(uuid,uuid,integer,text)'::regprocedure,'EXECUTE') THEN
    RAISE EXCEPTION 'participant reinvestment request grant boundary is invalid';
  END IF;

  IF NOT has_function_privilege('authenticated','public.approve_reinvestment_request(uuid)'::regprocedure,'EXECUTE')
     OR has_function_privilege('anon','public.approve_reinvestment_request(uuid)'::regprocedure,'EXECUTE') THEN
    RAISE EXCEPTION 'reinvestment approval grant boundary is invalid';
  END IF;

  IF NOT has_function_privilege('authenticated','public.cancel_reinvestment_request(uuid)'::regprocedure,'EXECUTE')
     OR has_function_privilege('anon','public.cancel_reinvestment_request(uuid)'::regprocedure,'EXECUTE') THEN
    RAISE EXCEPTION 'reinvestment cancellation grant boundary is invalid';
  END IF;

  IF NOT has_function_privilege('authenticated','public.reject_reinvestment_request(uuid,text)'::regprocedure,'EXECUTE')
     OR has_function_privilege('anon','public.reject_reinvestment_request(uuid,text)'::regprocedure,'EXECUTE') THEN
    RAISE EXCEPTION 'reinvestment rejection grant boundary is invalid';
  END IF;

  IF NOT has_function_privilege('authenticated','public.get_participant_reinvestment_context()'::regprocedure,'EXECUTE')
     OR has_function_privilege('anon','public.get_participant_reinvestment_context()'::regprocedure,'EXECUTE') THEN
    RAISE EXCEPTION 'participant reinvestment read model grant boundary is invalid';
  END IF;

  IF has_function_privilege('authenticated','public._investment_reserved_reinvestment_cases(uuid)'::regprocedure,'EXECUTE') THEN
    RAISE EXCEPTION 'internal reinvestment capacity helper is exposed to authenticated';
  END IF;

  SELECT pg_get_functiondef('public.create_investment_order(uuid,integer,text)'::regprocedure)
  INTO v_definition;
  IF v_definition NOT LIKE '%_investment_reserved_reinvestment_cases%' THEN
    RAISE EXCEPTION 'canonical investment order does not reserve against pending reinvestments';
  END IF;

  SELECT pg_get_functiondef('public._investment_create_allocation_checked(uuid,uuid,boolean,integer,bigint,uuid)'::regprocedure)
  INTO v_definition;
  IF v_definition NOT LIKE '%_investment_reserved_reinvestment_cases%' THEN
    RAISE EXCEPTION 'allocation guard does not reserve against pending reinvestments';
  END IF;

  SELECT pg_get_functiondef('public.request_reinvestment_cases(uuid,uuid,integer,text)'::regprocedure)
  INTO v_definition;
  IF v_definition NOT LIKE '%production_cost_unit_cents%'
     OR v_definition NOT LIKE '%label_cost_unit_cents%'
     OR v_definition NOT LIKE '%transport_cost_unit_cents%'
     OR v_definition NOT LIKE '%get_investment_spendable_balance%'
     OR v_definition NOT LIKE '%SETTLEMENT_CREDIT%' THEN
    RAISE EXCEPTION 'participant reinvestment command lost authoritative pricing/spend/source guards';
  END IF;

  SELECT pg_get_functiondef('public.approve_reinvestment_request(uuid)'::regprocedure)
  INTO v_definition;
  IF v_definition LIKE '%p_case_equivalent_units%' THEN
    RAISE EXCEPTION 'canonical reinvestment approval accepts mutable case quantity';
  END IF;

  SELECT pg_get_functiondef('public.get_public_investment_lot_funding(uuid)'::regprocedure)
  INTO v_definition;
  IF v_definition NOT LIKE '%investment_reinvestment_requests%' THEN
    RAISE EXCEPTION 'public funding availability ignores pending reinvestment capacity';
  END IF;
END $$;

SELECT 'Investment reinvestment schema contract: PASS' AS result;
