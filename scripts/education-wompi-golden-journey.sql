\set ON_ERROR_STOP on

-- Education Wompi Golden Journey
-- Runs only against the disposable local CI database and rolls back synthetic data.
-- Proves canonical order -> Wompi preparation -> signed-provider settlement boundary
-- -> entitlement, with exact amount/currency validation and idempotent event replay.

BEGIN;

DO $$
DECLARE
  v_user uuid := 'f1220000-0000-4000-8000-000000000001';
BEGIN
  INSERT INTO auth.users (id, email, encrypted_password, aud, role, created_at, updated_at)
  VALUES (v_user, 'education-wompi-golden@ctgone.invalid', '', 'authenticated', 'authenticated', now(), now());

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user) THEN
    RAISE EXCEPTION 'education wompi golden journey: profile trigger did not materialize buyer';
  END IF;
END $$;

SET LOCAL ROLE service_role;

DO $$
DECLARE
  v_user uuid := 'f1220000-0000-4000-8000-000000000001';
  v_order jsonb;
  v_order_id uuid;
  v_prepared jsonb;
  v_result jsonb;
  v_offering_id uuid;
  v_failed_as_expected boolean := false;
  v_event_count integer;
  v_settlement_count integer;
  v_entitlement_count integer;
BEGIN
  v_order := public.create_education_order(
    v_user,
    'filosofia-o-dinero',
    'wompi-golden-path-00000001'
  );
  v_order_id := (v_order->'order'->>'id')::uuid;

  IF v_order_id IS NULL THEN
    RAISE EXCEPTION 'education wompi golden journey: canonical order missing';
  END IF;

  v_prepared := public.prepare_education_wompi_order(v_order_id, v_user);
  IF (v_prepared->>'reference')::uuid <> v_order_id
     OR (v_prepared->>'amountInCents')::bigint <> 1000000
     OR v_prepared->>'currency' <> 'COP' THEN
    RAISE EXCEPTION 'education wompi golden journey: checkout preparation mismatch: %', v_prepared;
  END IF;

  BEGIN
    PERFORM public.process_education_wompi_transaction_event(
      v_order_id,
      'wompi-golden-transaction-001',
      'APPROVED',
      999999,
      'COP',
      repeat('a', 64)
    );
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%EDUCATION_WOMPI_AMOUNT_MISMATCH%' THEN
      v_failed_as_expected := true;
    ELSE
      RAISE;
    END IF;
  END;
  IF NOT v_failed_as_expected THEN
    RAISE EXCEPTION 'education wompi golden journey: wrong amount was not rejected';
  END IF;

  v_result := public.process_education_wompi_transaction_event(
    v_order_id,
    'wompi-golden-transaction-001',
    'PENDING',
    1000000,
    'COP',
    repeat('b', 64)
  );
  IF v_result->>'providerStatus' <> 'PENDING' THEN
    RAISE EXCEPTION 'education wompi golden journey: pending evidence failed: %', v_result;
  END IF;

  v_result := public.process_education_wompi_transaction_event(
    v_order_id,
    'wompi-golden-transaction-001',
    'APPROVED',
    1000000,
    'COP',
    repeat('c', 64)
  );
  IF v_result->>'status' <> 'paid' OR v_result->>'providerStatus' <> 'APPROVED' THEN
    RAISE EXCEPTION 'education wompi golden journey: approved event did not settle order: %', v_result;
  END IF;

  SELECT oi.offering_id INTO v_offering_id
  FROM public.education_order_items oi
  WHERE oi.order_id = v_order_id
  LIMIT 1;

  SELECT count(*)::integer INTO v_entitlement_count
  FROM public.education_entitlements e
  WHERE e.user_id = v_user
    AND e.offering_id = v_offering_id
    AND e.status = 'active';
  IF v_entitlement_count <> 1 THEN
    RAISE EXCEPTION 'education wompi golden journey: entitlement was not granted';
  END IF;

  SELECT count(*)::integer INTO v_settlement_count
  FROM public.education_payment_settlements s
  WHERE s.order_id = v_order_id
    AND s.payment_provider = 'wompi'
    AND s.provider_reference = 'wompi-golden-transaction-001'
    AND s.settlement_source = 'provider_webhook'
    AND s.operator_user_id IS NULL;
  IF v_settlement_count <> 1 THEN
    RAISE EXCEPTION 'education wompi golden journey: provider settlement evidence missing';
  END IF;

  v_result := public.process_education_wompi_transaction_event(
    v_order_id,
    'wompi-golden-transaction-001',
    'APPROVED',
    1000000,
    'COP',
    repeat('c', 64)
  );
  IF coalesce((v_result->>'replayed')::boolean, false) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'education wompi golden journey: event replay was not idempotent: %', v_result;
  END IF;

  SELECT count(*)::integer INTO v_event_count
  FROM public.education_payment_provider_events e
  WHERE e.order_id = v_order_id;
  IF v_event_count <> 2 THEN
    RAISE EXCEPTION 'education wompi golden journey: provider event cardinality mismatch: %', v_event_count;
  END IF;
END $$;

RESET ROLE;

DO $$
BEGIN
  IF has_function_privilege('authenticated', 'public.prepare_education_wompi_order(uuid,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'education wompi golden journey: authenticated can prepare provider checkout directly';
  END IF;
  IF has_function_privilege('anon', 'public.prepare_education_wompi_order(uuid,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'education wompi golden journey: anon can prepare provider checkout directly';
  END IF;
  IF has_function_privilege('authenticated', 'public.process_education_wompi_transaction_event(uuid,text,text,bigint,text,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'education wompi golden journey: authenticated can settle provider events directly';
  END IF;
  IF has_table_privilege('authenticated', 'public.education_payment_provider_events', 'SELECT') THEN
    RAISE EXCEPTION 'education wompi golden journey: authenticated can read provider event evidence';
  END IF;
END $$;

ROLLBACK;

SELECT 'Education Wompi golden journey: PASS' AS result;
