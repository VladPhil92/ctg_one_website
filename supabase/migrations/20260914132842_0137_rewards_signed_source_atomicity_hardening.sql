-- CTG Rewards Signed Source Connectors v4 atomicity hardening
--
-- Fixes review findings before v4 promotion:
-- - durable pre-verification rate limits for unauthenticated signed-source traffic;
-- - atomic original/reversal shadow processing + successful delivery audit;
-- - per-subject/day serialization for deterministic daily-limit decisions;
-- - atomic connector configuration changes + immutable audit events.
-- Still zero authority over reward_accounts or reward_ledger_entries.

create or replace function public.consume_service_api_rate_limit(
  p_scope text,
  p_actor_key text
)
returns table (
  allowed boolean,
  remaining integer,
  retry_after_seconds integer
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_started_at timestamptz;
  v_request_count integer;
  v_limit integer;
  v_retry integer;
begin
  if p_scope = 'federation.vertice.exchange' then
    if p_actor_key is distinct from 'vertice' then
      raise exception 'SERVICE_RATE_LIMIT_ACTOR_INVALID';
    end if;
    v_limit := 120;
  elsif p_scope = 'rewards.source.preverify' then
    if p_actor_key !~ '^r_[0-9a-f]{40}$' then
      raise exception 'SERVICE_RATE_LIMIT_ACTOR_INVALID';
    end if;
    v_limit := 60;
  elsif p_scope = 'rewards.source.connector' then
    if p_actor_key !~ '^c_[a-z0-9][a-z0-9_-]{1,47}$' then
      raise exception 'SERVICE_RATE_LIMIT_ACTOR_INVALID';
    end if;
    v_limit := 600;
  else
    raise exception 'SERVICE_RATE_LIMIT_SCOPE_INVALID';
  end if;

  insert into private.service_api_rate_limit_windows(
    scope, actor_key, window_started_at, request_count, updated_at
  ) values (
    p_scope, p_actor_key, v_now, 0, v_now
  )
  on conflict (scope, actor_key) do nothing;

  select window_started_at, request_count
    into v_started_at, v_request_count
  from private.service_api_rate_limit_windows
  where scope = p_scope and actor_key = p_actor_key
  for update;

  if v_started_at + interval '60 seconds' <= v_now then
    update private.service_api_rate_limit_windows
    set window_started_at = v_now,
        request_count = 1,
        updated_at = v_now
    where scope = p_scope and actor_key = p_actor_key;
    return query select true, v_limit - 1, 0;
    return;
  end if;

  if v_request_count >= v_limit then
    v_retry := greatest(1, ceil(extract(epoch from ((v_started_at + interval '60 seconds') - v_now)))::integer);
    return query select false, 0, v_retry;
    return;
  end if;

  v_request_count := v_request_count + 1;
  update private.service_api_rate_limit_windows
  set request_count = v_request_count,
      updated_at = v_now
  where scope = p_scope and actor_key = p_actor_key;

  return query select true, greatest(0, v_limit - v_request_count), 0;
end;
$$;

revoke all on function public.consume_service_api_rate_limit(text, text)
  from public, anon, authenticated;
grant execute on function public.consume_service_api_rate_limit(text, text)
  to service_role;

comment on function public.consume_service_api_rate_limit(text, text) is
  'Service-role-only durable limiter for trusted federation and Rewards signed-source pre-verification boundaries.';

create or replace function private.reward_source_connector_snapshot(p_connector_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'connectorCode', c.connector_code,
    'pilotUnitId', c.pilot_unit_id,
    'sourceDomain', c.source_domain,
    'authScheme', c.auth_scheme,
    'keyFingerprintSha256', c.key_fingerprint_sha256,
    'stage', c.stage,
    'ingestionEnabled', c.ingestion_enabled,
    'maxClockSkewSeconds', c.max_clock_skew_seconds,
    'allowedEventCodes', coalesce((
      select jsonb_agg(a.event_code order by a.event_code)
      from public.reward_source_connector_event_allowlist a
      where a.connector_id = c.id
    ), '[]'::jsonb)
  )
  from public.reward_source_connectors c
  where c.id = p_connector_id;
$$;

revoke all on function private.reward_source_connector_snapshot(uuid)
  from public, anon, authenticated;
grant execute on function private.reward_source_connector_snapshot(uuid)
  to service_role;

create or replace function public.create_reward_source_connector_atomic(
  p_pilot_unit_id uuid,
  p_connector_code text,
  p_name text,
  p_public_key_pem text,
  p_key_fingerprint_sha256 text,
  p_max_clock_skew_seconds integer,
  p_notes text,
  p_actor uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_unit record;
  v_connector record;
begin
  select id, source_domain, stage into v_unit
  from public.reward_pilot_units
  where id = p_pilot_unit_id
  for share;
  if v_unit.id is null or v_unit.stage = 'archived' then
    raise exception 'PILOT_UNIT_NOT_AVAILABLE';
  end if;

  insert into public.reward_source_connectors(
    pilot_unit_id, connector_code, name, source_domain, auth_scheme,
    public_key_pem, key_fingerprint_sha256, max_clock_skew_seconds, notes, created_by
  ) values (
    v_unit.id, p_connector_code, p_name, v_unit.source_domain, 'ed25519_v1',
    p_public_key_pem, p_key_fingerprint_sha256, p_max_clock_skew_seconds, p_notes, p_actor
  ) returning * into v_connector;

  insert into public.reward_source_connector_config_events(connector_id, event_type, config_snapshot, created_by)
  values (v_connector.id, 'created', private.reward_source_connector_snapshot(v_connector.id), p_actor);

  return jsonb_build_object(
    'id', v_connector.id,
    'pilot_unit_id', v_connector.pilot_unit_id,
    'connector_code', v_connector.connector_code,
    'name', v_connector.name,
    'source_domain', v_connector.source_domain,
    'auth_scheme', v_connector.auth_scheme,
    'key_fingerprint_sha256', v_connector.key_fingerprint_sha256,
    'stage', v_connector.stage,
    'ingestion_enabled', v_connector.ingestion_enabled,
    'max_clock_skew_seconds', v_connector.max_clock_skew_seconds,
    'notes', v_connector.notes,
    'created_at', v_connector.created_at,
    'updated_at', v_connector.updated_at
  );
end;
$$;

create or replace function public.replace_reward_source_allowlist_atomic(
  p_connector_id uuid,
  p_event_codes text[],
  p_actor uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_connector record;
  v_code text;
begin
  select * into v_connector
  from public.reward_source_connectors
  where id = p_connector_id
  for update;
  if v_connector.id is null or v_connector.stage = 'archived' then
    raise exception 'CONNECTOR_NOT_AVAILABLE';
  end if;
  if v_connector.ingestion_enabled then
    raise exception 'DISABLE_CONNECTOR_BEFORE_ALLOWLIST_CHANGE';
  end if;
  if coalesce(array_length(p_event_codes, 1), 0) < 1 or array_length(p_event_codes, 1) > 32 then
    raise exception 'INVALID_ALLOWLIST';
  end if;

  delete from public.reward_source_connector_event_allowlist where connector_id = p_connector_id;
  foreach v_code in array p_event_codes loop
    if v_code !~ '^[a-z0-9][a-z0-9_.-]{1,63}$' then
      raise exception 'INVALID_ALLOWLIST';
    end if;
    insert into public.reward_source_connector_event_allowlist(connector_id, event_code, created_by)
    values (p_connector_id, v_code, p_actor);
  end loop;

  insert into public.reward_source_connector_config_events(connector_id, event_type, config_snapshot, created_by)
  values (p_connector_id, 'allowlist_updated', private.reward_source_connector_snapshot(p_connector_id), p_actor);

  return private.reward_source_connector_snapshot(p_connector_id);
end;
$$;

create or replace function public.set_reward_source_connector_stage_atomic(
  p_connector_id uuid,
  p_stage text,
  p_actor uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_connector record;
  v_unit_stage text;
  v_allowlist_count integer;
begin
  if p_stage not in ('draft', 'validated', 'archived') then raise exception 'INVALID_STAGE_CHANGE'; end if;
  select * into v_connector from public.reward_source_connectors where id = p_connector_id for update;
  if v_connector.id is null then raise exception 'CONNECTOR_NOT_FOUND'; end if;

  if p_stage = 'validated' then
    select stage into v_unit_stage from public.reward_pilot_units where id = v_connector.pilot_unit_id;
    select count(*) into v_allowlist_count from public.reward_source_connector_event_allowlist where connector_id = p_connector_id;
    if v_unit_stage is distinct from 'validated' then raise exception 'PILOT_UNIT_MUST_BE_VALIDATED'; end if;
    if v_allowlist_count < 1 then raise exception 'CONNECTOR_ALLOWLIST_REQUIRED'; end if;
  end if;

  update public.reward_source_connectors
  set stage = p_stage,
      ingestion_enabled = case when p_stage = 'archived' then false else ingestion_enabled end
  where id = p_connector_id
  returning * into v_connector;

  insert into public.reward_source_connector_config_events(connector_id, event_type, config_snapshot, created_by)
  values (p_connector_id, p_stage, private.reward_source_connector_snapshot(p_connector_id), p_actor);

  return private.reward_source_connector_snapshot(p_connector_id);
end;
$$;

create or replace function public.set_reward_source_connector_ingestion_atomic(
  p_connector_id uuid,
  p_enabled boolean,
  p_actor uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_connector record;
  v_unit_stage text;
  v_runtime_enabled boolean;
  v_allowlist_count integer;
begin
  select * into v_connector from public.reward_source_connectors where id = p_connector_id for update;
  if v_connector.id is null or v_connector.stage = 'archived' then raise exception 'CONNECTOR_NOT_AVAILABLE'; end if;

  if p_enabled then
    if v_connector.stage <> 'validated' then raise exception 'CONNECTOR_MUST_BE_VALIDATED'; end if;
    select stage into v_unit_stage from public.reward_pilot_units where id = v_connector.pilot_unit_id;
    select processing_enabled into v_runtime_enabled from public.reward_shadow_runtime_config where id = 1;
    select count(*) into v_allowlist_count from public.reward_source_connector_event_allowlist where connector_id = p_connector_id;
    if v_unit_stage is distinct from 'validated' then raise exception 'PILOT_UNIT_MUST_BE_VALIDATED'; end if;
    if not coalesce(v_runtime_enabled, false) then raise exception 'GLOBAL_SHADOW_KILL_SWITCH_CLOSED'; end if;
    if v_allowlist_count < 1 then raise exception 'CONNECTOR_ALLOWLIST_REQUIRED'; end if;
  end if;

  update public.reward_source_connectors set ingestion_enabled = p_enabled
  where id = p_connector_id returning * into v_connector;

  insert into public.reward_source_connector_config_events(connector_id, event_type, config_snapshot, created_by)
  values (p_connector_id, case when p_enabled then 'enabled' else 'disabled' end, private.reward_source_connector_snapshot(p_connector_id), p_actor);

  return private.reward_source_connector_snapshot(p_connector_id);
end;
$$;

create or replace function public.rotate_reward_source_connector_key_atomic(
  p_connector_id uuid,
  p_public_key_pem text,
  p_key_fingerprint_sha256 text,
  p_actor uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_connector record;
begin
  select * into v_connector from public.reward_source_connectors where id = p_connector_id for update;
  if v_connector.id is null or v_connector.stage = 'archived' then raise exception 'CONNECTOR_NOT_AVAILABLE'; end if;
  if v_connector.key_fingerprint_sha256 = p_key_fingerprint_sha256 then raise exception 'KEY_FINGERPRINT_UNCHANGED'; end if;

  update public.reward_source_connectors
  set public_key_pem = p_public_key_pem,
      key_fingerprint_sha256 = p_key_fingerprint_sha256,
      ingestion_enabled = false
  where id = p_connector_id returning * into v_connector;

  insert into public.reward_source_connector_config_events(connector_id, event_type, config_snapshot, created_by)
  values (p_connector_id, 'key_rotated', private.reward_source_connector_snapshot(p_connector_id), p_actor);

  return private.reward_source_connector_snapshot(p_connector_id);
end;
$$;

revoke all on function public.create_reward_source_connector_atomic(uuid,text,text,text,text,integer,text,uuid) from public, anon, authenticated;
revoke all on function public.replace_reward_source_allowlist_atomic(uuid,text[],uuid) from public, anon, authenticated;
revoke all on function public.set_reward_source_connector_stage_atomic(uuid,text,uuid) from public, anon, authenticated;
revoke all on function public.set_reward_source_connector_ingestion_atomic(uuid,boolean,uuid) from public, anon, authenticated;
revoke all on function public.rotate_reward_source_connector_key_atomic(uuid,text,text,uuid) from public, anon, authenticated;
grant execute on function public.create_reward_source_connector_atomic(uuid,text,text,text,text,integer,text,uuid) to service_role;
grant execute on function public.replace_reward_source_allowlist_atomic(uuid,text[],uuid) to service_role;
grant execute on function public.set_reward_source_connector_stage_atomic(uuid,text,uuid) to service_role;
grant execute on function public.set_reward_source_connector_ingestion_atomic(uuid,boolean,uuid) to service_role;
grant execute on function public.rotate_reward_source_connector_key_atomic(uuid,text,text,uuid) to service_role;

create or replace function public.process_signed_reward_source_event_atomic(
  p_connector_id uuid,
  p_external_event_id text,
  p_event_code text,
  p_event_kind text,
  p_subject_user_id uuid,
  p_amount_cents bigint,
  p_reversal_of_external_event_id text,
  p_payload_digest text,
  p_occurred_at timestamptz,
  p_request_nonce text,
  p_signed_at timestamptz,
  p_signature_digest text,
  p_key_fingerprint_sha256 text,
  p_nonce_retry boolean
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_connector record;
  v_runtime record;
  v_unit record;
  v_rule record;
  v_event record;
  v_original record;
  v_evaluation record;
  v_existing_delivery boolean := false;
  v_idempotent boolean := false;
  v_daily_count integer := 0;
  v_points bigint := 0;
  v_blocks bigint := null;
  v_decision text;
  v_direction text;
  v_reason text;
  v_rule_snapshot jsonb := '{}'::jsonb;
  v_runtime_snapshot jsonb;
  v_has_source_provenance boolean;
begin
  select * into v_connector from public.reward_source_connectors where id = p_connector_id for share;
  if v_connector.id is null or v_connector.stage <> 'validated' or not v_connector.ingestion_enabled then
    raise exception 'SOURCE_CONNECTOR_DISABLED';
  end if;
  if v_connector.key_fingerprint_sha256 <> p_key_fingerprint_sha256 then raise exception 'SOURCE_KEY_CHANGED'; end if;
  if not exists (
    select 1 from public.reward_source_connector_event_allowlist
    where connector_id = p_connector_id and event_code = p_event_code
  ) then raise exception 'SOURCE_EVENT_NOT_ALLOWED'; end if;

  if p_event_kind = 'original' then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
      p_subject_user_id::text || ':' || (p_occurred_at at time zone 'utc')::date::text, 0
    ));

    select * into v_event from public.reward_shadow_events
    where source_domain = v_connector.source_domain and external_event_id = p_external_event_id
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
      select exists(
        select 1 from public.reward_source_delivery_attempts
        where connector_id = p_connector_id and shadow_event_id = v_event.id
          and outcome in ('accepted','idempotent_retry')
      ) into v_has_source_provenance;
      if not v_has_source_provenance then raise exception 'SOURCE_EVENT_PROVENANCE_CONFLICT'; end if;
      v_idempotent := true;
    else
      insert into public.reward_shadow_events(
        source_domain, external_event_id, event_code, subject_user_id, amount_cents,
        event_kind, reversal_of_event_id, payload_digest, occurred_at, created_by
      ) values (
        v_connector.source_domain, p_external_event_id, p_event_code, p_subject_user_id, p_amount_cents,
        'original', null, p_payload_digest, p_occurred_at, null
      ) returning * into v_event;
    end if;

    select * into v_evaluation from public.reward_shadow_evaluations where source_event_id = v_event.id;
    if v_evaluation.id is null then
      select * into v_runtime from public.reward_shadow_runtime_config where id = 1 for share;
      select * into v_unit from public.reward_pilot_units
      where id = v_connector.pilot_unit_id and source_domain = v_connector.source_domain and stage = 'validated';
      if v_unit.id is not null then
        select * into v_rule from public.reward_rule_drafts
        where pilot_unit_id = v_unit.id and event_code = p_event_code and stage = 'validated';
      end if;

      select count(*) into v_daily_count from public.reward_shadow_events
      where subject_user_id = p_subject_user_id
        and event_kind = 'original'
        and occurred_at >= ((p_occurred_at at time zone 'utc')::date at time zone 'utc')
        and occurred_at < (((p_occurred_at at time zone 'utc')::date + 1) at time zone 'utc');

      if not v_runtime.processing_enabled then
        v_decision := 'blocked'; v_direction := 'none'; v_reason := 'kill_switch_disabled';
      elsif p_amount_cents > v_runtime.max_amount_cents then
        v_decision := 'blocked'; v_direction := 'none'; v_reason := 'amount_limit_exceeded';
      elsif v_daily_count > v_runtime.max_events_per_subject_per_day then
        v_decision := 'blocked'; v_direction := 'none'; v_reason := 'subject_daily_event_limit_exceeded';
      elsif v_unit.id is null then
        v_decision := 'no_unit'; v_direction := 'none'; v_reason := 'validated_unit_missing';
      elsif v_rule.id is null then
        v_decision := 'no_rule'; v_direction := 'none'; v_reason := 'validated_rule_missing';
      elsif p_amount_cents < v_rule.minimum_amount_cents then
        v_decision := 'ineligible'; v_direction := 'none'; v_reason := 'below_minimum';
      else
        if v_rule.calculation_type = 'fixed_points' then
          v_points := v_rule.fixed_points;
        elsif v_rule.calculation_type = 'points_per_cop_block' then
          v_blocks := p_amount_cents / v_rule.cop_block_cents;
          v_points := v_blocks * v_rule.points_per_block;
        else
          raise exception 'SOURCE_RULE_CALCULATION_INVALID';
        end if;
        if v_rule.maximum_points_per_event is not null then v_points := least(v_points, v_rule.maximum_points_per_event); end if;
        v_points := least(v_points, v_runtime.max_points_per_event);
        if v_points <= 0 then
          v_decision := 'ineligible'; v_direction := 'none'; v_reason := 'no_complete_block'; v_points := 0;
        else
          v_decision := 'eligible'; v_direction := 'credit';
          v_reason := case
            when v_rule.maximum_points_per_event is not null and v_points = v_rule.maximum_points_per_event then 'rule_points_cap_applied'
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
        'phase','signed_source_connectors_v4','nonBinding',true,'ledgerEffects',false,
        'ingestionMode','signed_source_ed25519','connectorId',v_connector.id,
        'connectorCode',v_connector.connector_code,'keyFingerprintSha256',v_connector.key_fingerprint_sha256,
        'processingEnabled',v_runtime.processing_enabled,'maxAmountCents',v_runtime.max_amount_cents,
        'maxPointsPerEvent',v_runtime.max_points_per_event,'maxEventsPerSubjectPerDay',v_runtime.max_events_per_subject_per_day,
        'subjectDailyOriginalCount',v_daily_count
      );

      insert into public.reward_shadow_evaluations(
        source_event_id,pilot_unit_id,rule_id,decision,direction,calculated_points,reason_code,rule_snapshot,runtime_snapshot,created_by
      ) values (
        v_event.id, case when v_unit.id is null then null else v_unit.id end,
        case when v_rule.id is null then null else v_rule.id end,
        v_decision,v_direction,v_points,v_reason,v_rule_snapshot,v_runtime_snapshot,null
      ) returning * into v_evaluation;
    end if;
  elsif p_event_kind = 'reversal' then
    select * into v_original from public.reward_shadow_events
    where source_domain = v_connector.source_domain and external_event_id = p_reversal_of_external_event_id;
    if v_original.id is null or v_original.event_kind <> 'original' then raise exception 'SOURCE_ORIGINAL_NOT_FOUND'; end if;
    if v_original.event_code <> p_event_code then raise exception 'SOURCE_REVERSAL_EVENT_CODE_MISMATCH'; end if;
    select exists(
      select 1 from public.reward_source_delivery_attempts
      where connector_id = p_connector_id and shadow_event_id = v_original.id
        and outcome in ('accepted','idempotent_retry')
    ) into v_has_source_provenance;
    if not v_has_source_provenance then raise exception 'SOURCE_ORIGINAL_NOT_DELIVERED_BY_CONNECTOR'; end if;

    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_original.id::text, 1));
    select * into v_event from public.reward_shadow_events
    where source_domain = v_connector.source_domain and external_event_id = p_external_event_id
    for update;
    if v_event.id is not null then
      if v_event.event_kind <> 'reversal'
         or v_event.reversal_of_event_id <> v_original.id
         or v_event.event_code <> p_event_code
         or lower(v_event.payload_digest) <> lower(p_payload_digest)
         or v_event.occurred_at <> p_occurred_at then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
      v_idempotent := true;
    else
      if exists (select 1 from public.reward_shadow_events where reversal_of_event_id = v_original.id) then
        raise exception 'SOURCE_ORIGINAL_ALREADY_REVERSED';
      end if;
      insert into public.reward_shadow_events(
        source_domain, external_event_id, event_code, subject_user_id, amount_cents,
        event_kind, reversal_of_event_id, payload_digest, occurred_at, created_by
      ) values (
        v_connector.source_domain,p_external_event_id,p_event_code,v_original.subject_user_id,v_original.amount_cents,
        'reversal',v_original.id,p_payload_digest,p_occurred_at,null
      ) returning * into v_event;
    end if;

    select * into v_evaluation from public.reward_shadow_evaluations where source_event_id = v_event.id;
    if v_evaluation.id is null then
      select * into v_evaluation from public.reward_shadow_evaluations where source_event_id = v_original.id;
      if v_evaluation.id is null then raise exception 'SOURCE_ORIGINAL_EVALUATION_MISSING'; end if;
      insert into public.reward_shadow_evaluations(
        source_event_id,pilot_unit_id,rule_id,decision,direction,calculated_points,reason_code,rule_snapshot,runtime_snapshot,created_by
      ) values (
        v_event.id,v_evaluation.pilot_unit_id,v_evaluation.rule_id,'reversal','debit',
        case when v_evaluation.direction = 'credit' then v_evaluation.calculated_points else 0 end,
        'source_event_reversed',
        jsonb_build_object('originalEventId',v_original.id,'originalEvaluationId',v_evaluation.id,'originalDecision',v_evaluation.decision,'originalDirection',v_evaluation.direction,'originalCalculatedPoints',v_evaluation.calculated_points),
        jsonb_build_object('phase','signed_source_connectors_v4','nonBinding',true,'ledgerEffects',false,'ingestionMode','signed_source_ed25519','connectorId',v_connector.id,'connectorCode',v_connector.connector_code,'keyFingerprintSha256',v_connector.key_fingerprint_sha256,'reversalBypassesKillSwitch',true),
        null
      ) returning * into v_evaluation;
    end if;
  else
    raise exception 'SOURCE_EVENT_KIND_INVALID';
  end if;

  select exists(
    select 1 from public.reward_source_delivery_attempts
    where connector_id = p_connector_id
      and request_nonce = p_request_nonce
      and shadow_event_id = v_event.id
      and outcome in ('accepted','idempotent_retry')
  ) into v_existing_delivery;

  insert into public.reward_source_delivery_attempts(
    connector_id,request_nonce,signed_at,payload_digest,signature_digest,key_fingerprint_sha256,
    external_event_id,event_code,outcome,shadow_event_id,http_status,detail_code
  ) values (
    p_connector_id,p_request_nonce,p_signed_at,p_payload_digest,p_signature_digest,p_key_fingerprint_sha256,
    p_external_event_id,p_event_code,
    case when p_nonce_retry or v_idempotent or v_existing_delivery then 'idempotent_retry' else 'accepted' end,
    v_event.id,
    case when p_nonce_retry or v_idempotent or v_existing_delivery then 200 else 201 end,
    case when p_nonce_retry or v_idempotent or v_existing_delivery then 'IDEMPOTENT_RETRY' else 'SHADOW_EVENT_ACCEPTED' end
  );

  return jsonb_build_object(
    'idempotentRetry', (p_nonce_retry or v_idempotent or v_existing_delivery),
    'shadowEventId', v_event.id,
    'decision', v_evaluation.decision,
    'direction', v_evaluation.direction,
    'hypotheticalPoints', v_evaluation.calculated_points,
    'reasonCode', v_evaluation.reason_code
  );
end;
$$;

revoke all on function public.process_signed_reward_source_event_atomic(uuid,text,text,text,uuid,bigint,text,text,timestamptz,text,timestamptz,text,text,boolean)
  from public, anon, authenticated;
grant execute on function public.process_signed_reward_source_event_atomic(uuid,text,text,text,uuid,bigint,text,text,timestamptz,text,timestamptz,text,text,boolean)
  to service_role;

comment on function public.process_signed_reward_source_event_atomic(uuid,text,text,text,uuid,bigint,text,text,timestamptz,text,timestamptz,text,text,boolean) is
  'Service-role-only atomic signed-source shadow processor. Serializes subject/day limits and commits shadow event, evaluation, and successful delivery audit together. Never mutates Rewards balances or ledger.';

-- 0137 remains shadow-only: no grants or writes to reward_accounts / reward_ledger_entries.
