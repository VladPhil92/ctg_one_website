\set ON_ERROR_STOP on

-- Browser roles must not read internal work queues or execute service workers.
DO $$
BEGIN
  IF has_table_privilege('anon', 'public.system_notification_deliveries', 'SELECT') THEN
    RAISE EXCEPTION 'anon can read notification deliveries';
  END IF;
  IF has_table_privilege('authenticated', 'public.system_document_jobs', 'SELECT') THEN
    RAISE EXCEPTION 'authenticated can read document jobs';
  END IF;
  IF has_function_privilege('anon', 'public.materialize_domain_event_work(uuid,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon can materialize domain events';
  END IF;
  IF has_function_privilege('authenticated', 'public.claim_notification_deliveries(integer,integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated can claim notification deliveries';
  END IF;
END $$;

-- Payment event -> exactly one durable IN_APP notification intent -> outbox published.
DO $$
DECLARE
  v_event uuid;
  v_claim record;
  v_recipient uuid := gen_random_uuid();
BEGIN
  v_event := public._append_domain_event(
    'investment.payment.reconciled',
    'investment_order',
    gen_random_uuid(),
    'smoke-payment:' || gen_random_uuid()::text,
    jsonb_build_object(
      'participant_user_id', v_recipient,
      'amount_cents', 100000,
      'currency', 'COP'
    ),
    now()
  );

  SELECT * INTO v_claim
  FROM public.claim_domain_events(100, 120)
  WHERE id = v_event;

  IF v_claim.id IS NULL THEN
    RAISE EXCEPTION 'payment event was not claimable';
  END IF;

  PERFORM public.materialize_domain_event_work(v_claim.id, v_claim.lease_token);

  IF (SELECT count(*) FROM public.system_notification_deliveries WHERE domain_event_id = v_event) <> 1 THEN
    RAISE EXCEPTION 'payment event did not create exactly one notification intent';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.system_notification_deliveries
    WHERE domain_event_id = v_event
      AND recipient_user_id = v_recipient
      AND channel = 'IN_APP'
      AND status = 'QUEUED'
  ) THEN
    RAISE EXCEPTION 'payment notification intent has unexpected contract';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.system_domain_event_outbox
    WHERE id = v_event AND published_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'payment outbox event was not published after durable materialization';
  END IF;
END $$;

-- Settlement event -> exactly one document generation job -> outbox published.
DO $$
DECLARE
  v_event uuid;
  v_claim record;
  v_lot uuid := gen_random_uuid();
BEGIN
  v_event := public._append_domain_event(
    'investment.settlement.completed',
    'investment_lot',
    v_lot,
    'smoke-settlement:' || gen_random_uuid()::text,
    jsonb_build_object(
      'settlement_id', gen_random_uuid(),
      'lot_id', v_lot,
      'net_distributable_profit_cents', 500000
    ),
    now()
  );

  SELECT * INTO v_claim
  FROM public.claim_domain_events(100, 120)
  WHERE id = v_event;

  IF v_claim.id IS NULL THEN
    RAISE EXCEPTION 'settlement event was not claimable';
  END IF;

  PERFORM public.materialize_domain_event_work(v_claim.id, v_claim.lease_token);

  IF (SELECT count(*) FROM public.system_document_jobs WHERE domain_event_id = v_event) <> 1 THEN
    RAISE EXCEPTION 'settlement event did not create exactly one document job';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.system_document_jobs
    WHERE domain_event_id = v_event
      AND document_type = 'investment.settlement_summary'
      AND owner_type = 'investment_lot'
      AND owner_id = v_lot
      AND status = 'QUEUED'
  ) THEN
    RAISE EXCEPTION 'settlement document job has unexpected contract';
  END IF;
END $$;

-- Notification lease -> failure attempt -> retry -> success attempt.
DO $$
DECLARE
  v_delivery record;
  v_retry record;
BEGIN
  SELECT * INTO v_delivery
  FROM public.claim_notification_deliveries(1, 120);

  IF v_delivery.id IS NULL THEN
    RAISE EXCEPTION 'notification delivery was not claimable';
  END IF;

  PERFORM public.fail_notification_delivery(
    v_delivery.id,
    v_delivery.lease_token,
    'smoke failure',
    5,
    'internal'
  );

  UPDATE public.system_notification_deliveries
  SET available_at = now() - interval '1 second'
  WHERE id = v_delivery.id;

  SELECT * INTO v_retry
  FROM public.claim_notification_deliveries(1, 120)
  WHERE id = v_delivery.id;

  IF v_retry.id IS NULL THEN
    RAISE EXCEPTION 'failed notification delivery was not retryable';
  END IF;

  PERFORM public.complete_notification_delivery(
    v_retry.id,
    v_retry.lease_token,
    'internal',
    'smoke-message'
  );

  IF (SELECT count(*) FROM public.system_notification_delivery_attempts WHERE delivery_id = v_delivery.id) <> 2 THEN
    RAISE EXCEPTION 'notification attempt ledger did not record failure and success';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.system_notification_deliveries
    WHERE id = v_delivery.id AND status = 'SENT' AND delivered_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'notification delivery did not complete';
  END IF;
END $$;

-- A crashed notification worker must not strand PROCESSING work forever.
DO $$
DECLARE
  v_delivery_id uuid;
  v_old_token uuid;
  v_reclaimed record;
BEGIN
  SELECT id INTO v_delivery_id
  FROM public.system_notification_deliveries
  WHERE status = 'SENT'
  LIMIT 1;

  INSERT INTO public.system_notification_deliveries(
    domain_event_id, recipient_user_id, channel, template_key, template_version, variables
  )
  SELECT domain_event_id, gen_random_uuid(), 'IN_APP', 'investment.payment.reconciled', 1, '{}'::jsonb
  FROM public.system_notification_deliveries
  WHERE id = v_delivery_id
  RETURNING id INTO v_delivery_id;

  SELECT lease_token INTO v_old_token
  FROM public.claim_notification_deliveries(100, 120)
  WHERE id = v_delivery_id;

  IF v_old_token IS NULL THEN
    RAISE EXCEPTION 'notification recovery fixture was not initially claimed';
  END IF;

  UPDATE public.system_notification_deliveries
  SET lease_expires_at = now() - interval '1 second'
  WHERE id = v_delivery_id;

  SELECT * INTO v_reclaimed
  FROM public.claim_notification_deliveries(100, 120)
  WHERE id = v_delivery_id;

  IF v_reclaimed.id IS NULL THEN
    RAISE EXCEPTION 'expired PROCESSING notification lease was not reclaimed';
  END IF;
  IF v_reclaimed.lease_token = v_old_token THEN
    RAISE EXCEPTION 'notification reclaim did not issue a fresh lease token';
  END IF;
END $$;

-- A crashed renderer must likewise yield its expired PROCESSING document job.
DO $$
DECLARE
  v_job_id uuid;
  v_old_token uuid;
  v_reclaimed record;
BEGIN
  SELECT id INTO v_job_id
  FROM public.system_document_jobs
  WHERE status = 'QUEUED'
  LIMIT 1;

  SELECT lease_token INTO v_old_token
  FROM public.claim_document_jobs(50, 120)
  WHERE id = v_job_id;

  IF v_old_token IS NULL THEN
    RAISE EXCEPTION 'document recovery fixture was not initially claimed';
  END IF;

  UPDATE public.system_document_jobs
  SET lease_expires_at = now() - interval '1 second'
  WHERE id = v_job_id;

  SELECT * INTO v_reclaimed
  FROM public.claim_document_jobs(50, 120)
  WHERE id = v_job_id;

  IF v_reclaimed.id IS NULL THEN
    RAISE EXCEPTION 'expired PROCESSING document lease was not reclaimed';
  END IF;
  IF v_reclaimed.lease_token = v_old_token THEN
    RAISE EXCEPTION 'document reclaim did not issue a fresh lease token';
  END IF;
END $$;

SELECT 'Document/Notification OS PostgreSQL contract: PASS' AS result;
