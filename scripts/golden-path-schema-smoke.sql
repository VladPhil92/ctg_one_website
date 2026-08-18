\set ON_ERROR_STOP on

DO $$
DECLARE
  missing text[] := ARRAY[]::text[];
BEGIN
  IF to_regprocedure('public.create_investment_order(uuid,integer,text)') IS NULL THEN missing := array_append(missing, 'create_investment_order(uuid,integer,text)'); END IF;
  IF to_regprocedure('public.submit_investment_order_payment(uuid,text,text,text)') IS NULL THEN missing := array_append(missing, 'submit_investment_order_payment'); END IF;
  IF to_regprocedure('public.approve_investment_order(uuid,text)') IS NULL THEN missing := array_append(missing, 'approve_investment_order'); END IF;
  IF to_regprocedure('public.transition_lot_status(uuid,text,text,uuid)') IS NULL THEN missing := array_append(missing, 'transition_lot_status'); END IF;
  IF to_regprocedure('public.generate_bottle_units(uuid,integer)') IS NULL THEN missing := array_append(missing, 'generate_bottle_units'); END IF;
  IF to_regprocedure('public.record_bottle_sale_document(uuid,text[],bigint,text,text,text,text,bigint)') IS NULL THEN missing := array_append(missing, 'record_bottle_sale_document'); END IF;
  IF to_regprocedure('public.finalize_settlement(uuid)') IS NULL THEN missing := array_append(missing, 'finalize_settlement'); END IF;
  IF to_regprocedure('public.request_withdrawal(bigint)') IS NULL THEN missing := array_append(missing, 'request_withdrawal'); END IF;
  IF to_regprocedure('public.request_reinvestment(uuid,uuid,bigint)') IS NULL THEN missing := array_append(missing, 'request_reinvestment'); END IF;

  IF cardinality(missing) > 0 THEN
    RAISE EXCEPTION 'Golden Path functions missing after clean migration apply: %', array_to_string(missing, ', ');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='investment_orders' AND column_name='client_idempotency_key'
  ) THEN
    RAISE EXCEPTION 'investment_orders.client_idempotency_key missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND tablename='investment_orders'
      AND indexname='investment_orders_participant_idempotency_uidx'
  ) THEN
    RAISE EXCEPTION 'investment order idempotency unique index missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='investment_settlements_one_per_lot'
  ) THEN
    RAISE EXCEPTION 'one-settlement-per-lot constraint missing';
  END IF;
END $$;

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.create_investment_order(uuid,integer,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon must not execute create_investment_order';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.create_investment_order(uuid,integer,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated must execute idempotent create_investment_order';
  END IF;
  IF has_function_privilege('authenticated', 'public.create_investment_order(uuid,integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated must not execute legacy non-idempotent create_investment_order';
  END IF;
  IF has_function_privilege('anon', 'public.get_runtime_schema_compatibility()', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon must not execute runtime schema compatibility probe';
  END IF;
END $$;

SELECT 'Golden Path local schema smoke passed' AS result;
