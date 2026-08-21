-- CTG Craft Beer Investment — Finance reinvestment operations queue.
-- Adds one bounded finance-only read model over participant reinvestment requests.
-- Approval/rejection continue through the Phase 15 transactional commands.

create or replace function public.get_finance_reinvestment_queue_snapshot(
  p_active_limit integer default 50,
  p_history_limit integer default 50
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_active_limit integer := least(greatest(coalesce(p_active_limit, 50), 1), 100);
  v_history_limit integer := least(greatest(coalesce(p_history_limit, 50), 1), 100);
  v_active jsonb;
  v_history jsonb;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not public.is_investment_admin() then raise exception 'not authorized'; end if;

  with source_credit as (
    select
      r.id as request_id,
      coalesce(sum(le.amount_cents), 0)::bigint as source_credit_cents
    from public.investment_reinvestment_requests r
    left join public.investment_ledger_entries le
      on le.participant_user_id = r.participant_user_id
     and le.entry_type = 'SETTLEMENT_CREDIT'
     and le.reference = r.source_settlement_id::text
    where r.status = 'REQUESTED'
    group by r.id
  ), source_reserved as (
    select
      r.id as request_id,
      coalesce((
        select sum(other.amount_cents)
        from public.investment_reinvestment_requests other
        where other.participant_user_id = r.participant_user_id
          and other.source_settlement_id = r.source_settlement_id
          and other.status in ('REQUESTED','APPROVED')
      ), 0)::bigint as source_used_or_reserved_cents
    from public.investment_reinvestment_requests r
    where r.status = 'REQUESTED'
  )
  select coalesce(jsonb_agg(row_payload order by created_at asc, id), '[]'::jsonb)
  into v_active
  from (
    select
      r.id,
      r.created_at,
      jsonb_build_object(
        'id', r.id,
        'participantUserId', r.participant_user_id,
        'participantKycStatus', p.kyc_status,
        'sourceSettlementId', r.source_settlement_id,
        'sourceLotId', source_lot.id,
        'sourceLotCode', source_lot.code,
        'sourceBeerStyle', source_lot.beer_style,
        'targetLotId', target_lot.id,
        'targetLotCode', target_lot.code,
        'targetBeerStyle', target_lot.beer_style,
        'targetLotStatus', target_lot.status,
        'caseEquivalentUnits', r.case_equivalent_units,
        'amountCents', r.amount_cents,
        'status', r.status,
        'createdAt', r.created_at,
        'sourceCreditCents', coalesce(sc.source_credit_cents, 0),
        'sourceUsedOrReservedCents', coalesce(sr.source_used_or_reserved_cents, 0),
        'participantSpendableBalanceCents', public.get_investment_spendable_balance(r.participant_user_id),
        'legacyCaseIntentMissing', r.case_equivalent_units is null
      ) as row_payload
    from public.investment_reinvestment_requests r
    join public.investment_participant_profiles p on p.user_id = r.participant_user_id
    join public.investment_settlements s on s.id = r.source_settlement_id
    join public.investment_production_lots source_lot on source_lot.id = s.lot_id
    join public.investment_production_lots target_lot on target_lot.id = r.target_lot_id
    left join source_credit sc on sc.request_id = r.id
    left join source_reserved sr on sr.request_id = r.id
    where r.status = 'REQUESTED'
    order by r.created_at asc, r.id
    limit v_active_limit
  ) q;

  select coalesce(jsonb_agg(row_payload order by event_at desc, id), '[]'::jsonb)
  into v_history
  from (
    select
      r.id,
      coalesce(r.reviewed_at, r.created_at) as event_at,
      jsonb_build_object(
        'id', r.id,
        'participantUserId', r.participant_user_id,
        'sourceSettlementId', r.source_settlement_id,
        'targetLotId', target_lot.id,
        'targetLotCode', target_lot.code,
        'targetBeerStyle', target_lot.beer_style,
        'caseEquivalentUnits', r.case_equivalent_units,
        'amountCents', r.amount_cents,
        'status', r.status,
        'reviewNotes', r.review_notes,
        'createdAt', r.created_at,
        'reviewedAt', r.reviewed_at,
        'reviewedBy', r.reviewed_by
      ) as row_payload
    from public.investment_reinvestment_requests r
    join public.investment_production_lots target_lot on target_lot.id = r.target_lot_id
    where r.status in ('APPROVED','REJECTED','CANCELLED')
    order by coalesce(r.reviewed_at, r.created_at) desc, r.id
    limit v_history_limit
  ) q;

  return jsonb_build_object(
    'active', v_active,
    'history', v_history,
    'activeLimit', v_active_limit,
    'historyLimit', v_history_limit,
    'generatedAt', now()
  );
end;
$$;

comment on function public.get_finance_reinvestment_queue_snapshot(integer,integer) is
  'Bounded finance-admin operational read model for reinvestment review. Does not mutate requests; approval/rejection remain separate audited commands.';

revoke all on function public.get_finance_reinvestment_queue_snapshot(integer,integer) from public;
revoke execute on function public.get_finance_reinvestment_queue_snapshot(integer,integer) from anon;
grant execute on function public.get_finance_reinvestment_queue_snapshot(integer,integer) to authenticated;
