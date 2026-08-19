\set ON_ERROR_STOP on

DO $$
BEGIN
  IF to_regclass('public.system_domain_event_outbox') IS NULL THEN
    RAISE EXCEPTION 'system_domain_event_outbox missing';
  END IF;

  IF to_regprocedure('public.claim_domain_events(integer,integer)') IS NULL THEN
    RAISE EXCEPTION 'claim_domain_events missing';
  END IF;
  IF to_regprocedure('public.complete_domain_event_delivery(uuid,uuid)') IS NULL THEN
    RAISE EXCEPTION 'complete_domain_event_delivery missing';
  END IF;
  IF to_regprocedure('public.fail_domain_event_delivery(uuid,uuid,text,integer)') IS NULL THEN
    RAISE EXCEPTION 'fail_domain_event_delivery missing';
  END IF;

  IF has_table_privilege('anon', 'public.system_domain_event_outbox', 'SELECT')
     OR has_table_privilege('authenticated', 'public.system_domain_event_outbox', 'SELECT')
     OR has_table_privilege('authenticated', 'public.system_domain_event_outbox', 'INSERT')
     OR has_table_privilege('authenticated', 'public.system_domain_event_outbox', 'UPDATE') THEN
    RAISE EXCEPTION 'browser roles must not access system_domain_event_outbox directly';
  END IF;

  IF has_function_privilege('anon', 'public.claim_domain_events(integer,integer)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.claim_domain_events(integer,integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'browser roles must not claim domain events';
  END IF;

  IF NOT has_function_privilege('service_role', 'public.claim_domain_events(integer,integer)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.complete_domain_event_delivery(uuid,uuid)', 'EXECUTE')
     OR NOT has_function_privilege('service_role', 'public.fail_domain_event_delivery(uuid,uuid,text,integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role must retain delivery RPC access';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'investment_payment_receipts_domain_event' AND NOT tgisinternal
  ) THEN RAISE EXCEPTION 'payment receipt domain-event trigger missing'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'investment_settlements_domain_event' AND NOT tgisinternal
  ) THEN RAISE EXCEPTION 'settlement domain-event trigger missing'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'investment_payout_confirmation_domain_event' AND NOT tgisinternal
  ) THEN RAISE EXCEPTION 'payout confirmation domain-event trigger missing'; END IF;
END $$;

DO $$
DECLARE
  v_aggregate_id uuid := gen_random_uuid();
  v_event_id uuid;
  v_claim record;
  v_after record;
BEGIN
  v_event_id := public._append_domain_event(
    'test.contract.created',
    'test_contract',
    v_aggregate_id,
    'smoke-contract:' || v_aggregate_id::text,
    jsonb_build_object('contract', true),
    now()
  );

  SELECT * INTO v_claim FROM public.claim_domain_events(1, 30);

  IF v_claim.id IS DISTINCT FROM v_event_id THEN
    RAISE EXCEPTION 'claim did not return the appended event';
  END IF;
  IF v_claim.lease_token IS NULL OR v_claim.lease_expires_at IS NULL THEN
    RAISE EXCEPTION 'claim did not establish an expiring lease';
  END IF;
  IF v_claim.attempt_count <> 1 THEN
    RAISE EXCEPTION 'first claim must increment attempt_count to 1';
  END IF;

  PERFORM public.complete_domain_event_delivery(v_claim.id, v_claim.lease_token);

  SELECT published_at, lease_token, lease_expires_at, attempt_count
  INTO v_after
  FROM public.system_domain_event_outbox
  WHERE id = v_event_id;

  IF v_after.published_at IS NULL THEN
    RAISE EXCEPTION 'completed event must have published_at';
  END IF;
  IF v_after.lease_token IS NOT NULL OR v_after.lease_expires_at IS NOT NULL THEN
    RAISE EXCEPTION 'completed event must release its lease';
  END IF;
  IF v_after.attempt_count <> 1 THEN
    RAISE EXCEPTION 'completion must preserve attempt_count';
  END IF;

  IF EXISTS (SELECT 1 FROM public.claim_domain_events(1, 30) WHERE id = v_event_id) THEN
    RAISE EXCEPTION 'published event must never be claimed again';
  END IF;
END $$;

SELECT 'Domain event outbox local schema smoke passed' AS result;
