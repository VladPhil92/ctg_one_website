-- CTG Rewards Source Integrity Transactional Boundaries v4.1
--
-- Completes v4.1 by moving the remaining integrity-sensitive admin operations
-- behind service-role-only PostgreSQL transactions.
-- No function below mutates reward_accounts or reward_ledger_entries.

create or replace function public.process_admin_reward_shadow_original_atomic(
  p_source_domain text,
  p_external_event_id text,
  p_event_code text,
  p_subject_user_id uuid,
  p_amount_cents bigint,
  p_payload_digest text,
  p_occurred_at timestamptz,
  p_actor uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_event record;
  v_runtime record;
  v_unit record;
  v_rule record;
  v_evaluation record;
  v_idempotent boolean := false;
  v_daily_count bigint := 0;
  v_points bigint := 0;
  v_blocks bigint := null;
  v_decision text;
  v_direction text;
  v_reason text;
  v_rule_snapshot jsonb := '{}'::jsonb;
  v_runtime_snapshot jsonb;
begin
  if p_source_domain !~ '^[a-z0-9][a-z0-9_.-]{1,63}$'
     or p_external_event_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{1,127}$'
     or p_event_code !~ '^[a-z0-9][a-z0-9_.-]{1,63}$'
     or p_payload_digest !~ '^[0-9a-fA-F]{64}$'
     or p_amount_cents < 0
     or p_amount_cents > 1000000000000 then
    raise exception 'INVALID_SHADOW_EVENT';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_subject_user_id::text || ':' || (p_occurred_at at time zone 'utc')::date::text,
      0
    )
  );

  select * into v_event
  from public.reward_shadow_events
  where source_domain = p_source_domain
    and external_event_id = p_external_event_id
  for update;

  if v_event.id is not null then
    if v_event.event_kind <> 'original'
       or v_event.event_code <> p_event_code
       or v_event.subject_user_id <> p_subject_user_id
       or v_event.amount_cents <> p_amount_cents
       or lower(v_event.payload_digest) <> lower(p_payload_digest)
       or v_event.occurred_at <> p_occurred_at then
      raise exception 'IDEMPOTENCY_CONFLICT';
    end if;
    v_idempotent := true;
  else
    insert into public.reward_shadow_events(
      source_domain,
      external_event_id,
      event_code,
      subject_user_id,
      amount_cents,
      event_kind,
      reversal_of_event_id,
      payload_digest,
      occurred_at,
      created_by
    ) values (
      p_source_domain,
      p_external_event_id,
      p_event_code,
      p_subject_user_id,
      p_amount_cents,
      'original',
      null,
      lower(p_payload_digest),
      p_occurred_at,
      p_actor
    ) returning * into v_event;
  end if;

  if v_event.subject_daily_ordinal is null or v_event.subject_utc_day is null then
    raise exception 'SHADOW_DAILY_RESERVATION_MISSING';
  end if;

  select * into v_evaluation
  from public.reward_shadow_evaluations
  where source_event_id = v_event.id;

  if v_evaluation.id is null then
    select * into v_runtime
    from public.reward_shadow_runtime_config
    where id = 1
    for share;

    if v_runtime.id is null then
      raise exception 'SHADOW_RUNTIME_MISSING';
    end if;

    select * into v_unit
    from public.reward_pilot_units
    where source_domain = p_source_domain
      and stage = 'validated';

    if v_unit.id is not null then
      select * into v_rule
      from public.reward_rule_drafts
      where pilot_unit_id = v_unit.id
        and event_code = p_event_code
        and stage = 'validated';
    end if;

    v_daily_count := v_event.subject_daily_ordinal;

    if not v_runtime.processing_enabled then
      v_decision := 'blocked';
      v_direction := 'none';
      v_reason := 'kill_switch_disabled';
    elsif p_amount_cents > v_runtime.max_amount_cents then
      v_decision := 'blocked';
      v_direction := 'none';
      v_reason := 'amount_limit_exceeded';
    elsif v_daily_count > v_runtime.max_events_per_subject_per_day then
      v_decision := 'blocked';
      v_direction := 'none';
      v_reason := 'subject_daily_event_limit_exceeded';
    elsif v_unit.id is null then
      v_decision := 'no_unit';
      v_direction := 'none';
      v_reason := 'validated_unit_missing';
    elsif v_rule.id is null then
      v_decision := 'no_rule';
      v_direction := 'none';
      v_reason := 'validated_rule_missing';
    elsif p_amount_cents < v_rule.minimum_amount_cents then
      v_decision := 'ineligible';
      v_direction := 'none';
      v_reason := 'below_minimum';
    else
      if v_rule.calculation_type = 'fixed_points' then
        v_points := v_rule.fixed_points;
      elsif v_rule.calculation_type = 'points_per_cop_block' then
        v_blocks := p_amount_cents / v_rule.cop_block_cents;
        v_points := v_blocks * v_rule.points_per_block;
      else
        raise exception 'SHADOW_RULE_CALCULATION_INVALID';
      end if;

      if v_rule.maximum_points_per_event is not null then
        v_points := least(v_points, v_rule.maximum_points_per_event);
      end if;
      v_points := least(v_points, v_runtime.max_points_per_event);

      if v_points <= 0 then
        v_decision := 'ineligible';
        v_direction := 'none';
        v_reason := 'no_complete_block';
        v_points := 0;
      else
        v_decision := 'eligible';
        v_direction := 'credit';
        v_reason := case
          when v_rule.maximum_points_per_event is not null
               and v_points = v_rule.maximum_points_per_event then 'rule_points_cap_applied'
          when v_points = v_runtime.max_points_per_event then 'runtime_points_cap_applied'
          else 'rule_calculated'
        end;
      end if;

      v_rule_snapshot := jsonb_build_object(
        'pilotUnitId', v_rule.pilot_unit_id,
        'ruleId', v_rule.id,
        'eventCode', v_rule.event_code,
        'calculationType', v_rule.calculation_type,
        'fixedPoints', v_rule.fixed_points,
        'pointsPerBlock', v_rule.points_per_block,
        'copBlockCents', v_rule.cop_block_cents,
        'minimumAmountCents', v_rule.minimum_amount_cents,
        'maximumPointsPerEvent', v_rule.maximum_points_per_event,
        'blocks', v_blocks
      );
    end if;

    v_runtime_snapshot := jsonb_build_object(
      'phase', 'signed_source_integrity_v4_1',
      'nonBinding', true,
      'ledgerEffects', false,
      'ingestionMode', 'admin_replay_only',
      'processingEnabled', v_runtime.processing_enabled,
      'maxAmountCents', v_runtime.max_amount_cents,
      'maxPointsPerEvent', v_runtime.max_points_per_event,
      'maxEventsPerSubjectPerDay', v_runtime.max_events_per_subject_per_day,
      'subjectDailyOriginalCount', v_daily_count,
      'subjectUtcDay', v_event.subject_utc_day,
      'reservationMode', 'serialized_subject_day_ordinal'
    );

    insert into public.reward_shadow_evaluations(
      source_event_id,
      pilot_unit_id,
      rule_id,
      decision,
      direction,
      calculated_points,
      reason_code,
      rule_snapshot,
      runtime_snapshot,
      created_by
    ) values (
      v_event.id,
      case when v_unit.id is null then null else v_unit.id end,
      case when v_rule.id is null then null else v_rule.id end,
      v_decision,
      v_direction,
      v_points,
      v_reason,
      v_rule_snapshot,
      v_runtime_snapshot,
      p_actor
    ) returning * into v_evaluation;
  end if;

  return jsonb_build_object(
    'idempotentReplay', v_idempotent,
    'event', to_jsonb(v_event),
    'evaluation', to_jsonb(v_evaluation),
    'ledgerEffects', false
  );
end;
$$;

revoke all on function public.process_admin_reward_shadow_original_atomic(text,text,text,uuid,bigint,text,timestamptz,uuid)
  from public, anon, authenticated;
grant execute on function public.process_admin_reward_shadow_original_atomic(text,text,text,uuid,bigint,text,timestamptz,uuid)
  to service_role;

comment on function public.process_admin_reward_shadow_original_atomic(text,text,text,uuid,bigint,text,timestamptz,uuid) is
  'Service-role-only atomic admin replay boundary. Uses the database-wide subject/day reservation ordinal and never mutates Rewards balances or ledger.';

create or replace function public.create_reward_source_reconciliation_atomic(
  p_connector_id uuid,
  p_window_start timestamptz,
  p_window_end timestamptz,
  p_export_digest text,
  p_declared_original_count integer,
  p_declared_reversal_count integer,
  p_declared_amount_cents bigint,
  p_actor uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_connector record;
  v_attempt_total bigint := 0;
  v_accepted_delivery_count bigint := 0;
  v_rejected_delivery_count bigint := 0;
  v_provenanced_event_count bigint := 0;
  v_original_count bigint := 0;
  v_reversal_count bigint := 0;
  v_amount_cents bigint := 0;
  v_hypothetical_points bigint := 0;
  v_original_delta bigint;
  v_reversal_delta bigint;
  v_amount_delta bigint;
  v_status text;
  v_snapshot jsonb;
  v_run record;
begin
  if p_window_end <= p_window_start
     or p_window_end - p_window_start > interval '31 days'
     or p_window_end > clock_timestamp() + interval '5 minutes'
     or p_export_digest !~ '^[0-9a-f]{64}$'
     or p_declared_original_count < 0
     or p_declared_reversal_count < 0
     or p_declared_amount_cents < 0 then
    raise exception 'INVALID_RECONCILIATION';
  end if;

  select * into v_connector
  from public.reward_source_connectors
  where id = p_connector_id;

  if v_connector.id is null then
    raise exception 'CONNECTOR_NOT_FOUND';
  end if;

  select
    count(*),
    count(*) filter (where outcome in ('accepted', 'idempotent_retry'))
  into v_attempt_total, v_accepted_delivery_count
  from public.reward_source_delivery_attempts
  where connector_id = p_connector_id
    and created_at >= p_window_start
    and created_at < p_window_end;

  if v_attempt_total > 5000 then
    raise exception 'RECONCILIATION_RESULT_LIMIT_EXCEEDED';
  end if;

  v_rejected_delivery_count := v_attempt_total - v_accepted_delivery_count;

  with provenanced_ids as (
    select distinct shadow_event_id
    from public.reward_source_delivery_attempts
    where connector_id = p_connector_id
      and outcome in ('accepted', 'idempotent_retry')
      and shadow_event_id is not null
  ), observed_events as (
    select e.*
    from provenanced_ids p
    join public.reward_shadow_events e on e.id = p.shadow_event_id
    where e.occurred_at >= p_window_start
      and e.occurred_at < p_window_end
  )
  select
    count(*),
    count(*) filter (where event_kind = 'original'),
    count(*) filter (where event_kind = 'reversal'),
    coalesce(sum(amount_cents) filter (where event_kind = 'original'), 0)
  into
    v_provenanced_event_count,
    v_original_count,
    v_reversal_count,
    v_amount_cents
  from observed_events;

  if v_provenanced_event_count > 5000 then
    raise exception 'RECONCILIATION_RESULT_LIMIT_EXCEEDED';
  end if;

  with provenanced_ids as (
    select distinct shadow_event_id
    from public.reward_source_delivery_attempts
    where connector_id = p_connector_id
      and outcome in ('accepted', 'idempotent_retry')
      and shadow_event_id is not null
  ), observed_events as (
    select e.id
    from provenanced_ids p
    join public.reward_shadow_events e on e.id = p.shadow_event_id
    where e.occurred_at >= p_window_start
      and e.occurred_at < p_window_end
  )
  select coalesce(sum(ev.calculated_points) filter (where ev.decision = 'eligible'), 0)
    into v_hypothetical_points
  from observed_events oe
  join public.reward_shadow_evaluations ev on ev.source_event_id = oe.id;

  v_original_delta := v_original_count - p_declared_original_count;
  v_reversal_delta := v_reversal_count - p_declared_reversal_count;
  v_amount_delta := v_amount_cents - p_declared_amount_cents;
  v_status := case
    when v_original_delta = 0 and v_reversal_delta = 0 and v_amount_delta = 0 then 'matched'
    else 'mismatch'
  end;

  v_snapshot := jsonb_build_object(
    'phase', 'signed_source_integrity_v4_1',
    'nonBinding', true,
    'ledgerEffects', false,
    'provenanceMode', 'successful_delivery_attempts',
    'connectorCode', v_connector.connector_code,
    'sourceDomain', v_connector.source_domain,
    'keyFingerprintSha256', v_connector.key_fingerprint_sha256,
    'sourceDeclared', jsonb_build_object(
      'originalCount', p_declared_original_count,
      'reversalCount', p_declared_reversal_count,
      'amountCents', p_declared_amount_cents,
      'exportDigest', p_export_digest
    ),
    'observed', jsonb_build_object(
      'originalCount', v_original_count,
      'reversalCount', v_reversal_count,
      'amountCents', v_amount_cents,
      'acceptedDeliveryCount', v_accepted_delivery_count,
      'rejectedDeliveryCount', v_rejected_delivery_count,
      'hypotheticalEligiblePoints', v_hypothetical_points
    ),
    'delta', jsonb_build_object(
      'originalCount', v_original_delta,
      'reversalCount', v_reversal_delta,
      'amountCents', v_amount_delta
    )
  );

  insert into public.reward_source_reconciliation_runs(
    connector_id,
    window_start,
    window_end,
    export_digest,
    declared_original_count,
    declared_reversal_count,
    declared_amount_cents,
    observed_original_count,
    observed_reversal_count,
    observed_amount_cents,
    accepted_delivery_count,
    rejected_delivery_count,
    hypothetical_eligible_points,
    original_count_delta,
    reversal_count_delta,
    amount_delta_cents,
    status,
    reconciliation_snapshot,
    created_by
  ) values (
    p_connector_id,
    p_window_start,
    p_window_end,
    p_export_digest,
    p_declared_original_count,
    p_declared_reversal_count,
    p_declared_amount_cents,
    v_original_count::integer,
    v_reversal_count::integer,
    v_amount_cents,
    v_accepted_delivery_count::integer,
    v_rejected_delivery_count::integer,
    v_hypothetical_points,
    v_original_delta::integer,
    v_reversal_delta::integer,
    v_amount_delta,
    v_status,
    v_snapshot,
    p_actor
  ) returning * into v_run;

  return to_jsonb(v_run);
end;
$$;

revoke all on function public.create_reward_source_reconciliation_atomic(uuid,timestamptz,timestamptz,text,integer,integer,bigint,uuid)
  from public, anon, authenticated;
grant execute on function public.create_reward_source_reconciliation_atomic(uuid,timestamptz,timestamptz,text,integer,integer,bigint,uuid)
  to service_role;

comment on function public.create_reward_source_reconciliation_atomic(uuid,timestamptz,timestamptz,text,integer,integer,bigint,uuid) is
  'Service-role-only source reconciliation. Observed events are derived exclusively from successful delivery provenance for the connector; no Rewards ledger effects.';

-- v4.1 transactional boundaries remain shadow-only.
-- No grants or writes to reward_accounts / reward_ledger_entries.