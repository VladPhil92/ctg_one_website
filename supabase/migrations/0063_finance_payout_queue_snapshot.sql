-- CTG One Finance OS — exact, bounded payout queue read model.
--
-- Finance must see every active withdrawal without scanning the entire monetary
-- history or reconciling every payout on each browser refresh. This migration
-- adds deterministic queue indexes and one finance.manage-only snapshot that
-- returns exact status counters plus bounded active/paid pages enriched with the
-- authoritative payout lifecycle and the participant's registered masked
-- destination. No mutation, ledger, settlement or payout state rule changes.

create index if not exists investment_withdrawal_requests_active_queue_idx
  on public.investment_withdrawal_requests(created_at asc, id asc)
  where status in ('REQUESTED','UNDER_REVIEW','APPROVED','PAYMENT_PROCESSING');

create index if not exists investment_withdrawal_requests_paid_history_idx
  on public.investment_withdrawal_requests(created_at desc, id desc)
  where status = 'PAID';

create or replace function public.get_finance_payout_queue_snapshot(
  p_active_limit integer default 25,
  p_active_offset integer default 0,
  p_paid_limit integer default 25,
  p_paid_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not public.has_investment_permission('finance.manage') then
    raise exception 'finance.manage required';
  end if;

  if p_active_limit is null or p_active_limit < 1 or p_active_limit > 100 then
    raise exception 'active limit must be between 1 and 100';
  end if;
  if p_paid_limit is null or p_paid_limit < 1 or p_paid_limit > 100 then
    raise exception 'paid limit must be between 1 and 100';
  end if;
  if p_active_offset is null or p_active_offset < 0 then
    raise exception 'active offset must be non-negative';
  end if;
  if p_paid_offset is null or p_paid_offset < 0 then
    raise exception 'paid offset must be non-negative';
  end if;

  with status_summary as (
    select
      count(*) filter (where w.status = 'REQUESTED')::bigint as requested,
      count(*) filter (where w.status = 'UNDER_REVIEW')::bigint as under_review,
      count(*) filter (where w.status = 'APPROVED')::bigint as approved,
      count(*) filter (where w.status = 'PAYMENT_PROCESSING')::bigint as payment_processing,
      count(*) filter (where w.status = 'PAID')::bigint as paid
    from public.investment_withdrawal_requests w
  ),
  active_page as (
    select w.*
    from public.investment_withdrawal_requests w
    where w.status in ('REQUESTED','UNDER_REVIEW','APPROVED','PAYMENT_PROCESSING')
    order by w.created_at asc, w.id asc
    limit p_active_limit
    offset p_active_offset
  ),
  paid_page as (
    select w.*
    from public.investment_withdrawal_requests w
    where w.status = 'PAID'
    order by w.created_at desc, w.id desc
    limit p_paid_limit
    offset p_paid_offset
  ),
  visible as (
    select * from active_page
    union all
    select * from paid_page
  ),
  enriched as (
    select
      w.id,
      w.participant_user_id,
      w.amount_cents,
      w.status,
      w.admin_notes,
      w.created_at,
      profile.bank_account_masked,
      profile.payout_destination_fingerprint,
      p.id as payout_id,
      p.payout_rail,
      p.provider_code,
      p.destination_masked as payout_destination_masked,
      coalesce(last_event.event_type,'NOT_INITIATED') as payout_state,
      last_event.external_reference,
      coalesce(debit.withdrawal_debit_cents,0)::bigint as withdrawal_debit_cents,
      (
        w.status = 'PAID'
        and p.id is not null
        and last_event.event_type = 'CONFIRMED'
        and coalesce(debit.withdrawal_debit_cents,0) = -w.amount_cents
      ) as is_reconciled
    from visible w
    left join public.investment_participant_profiles profile
      on profile.user_id = w.participant_user_id
    left join public.investment_payouts p
      on p.withdrawal_request_id = w.id
    left join lateral (
      select e.event_type, e.external_reference
      from public.investment_payout_events e
      where e.payout_id = p.id
      order by e.occurred_at desc, e.id desc
      limit 1
    ) last_event on true
    left join lateral (
      select coalesce(sum(le.amount_cents),0)::bigint as withdrawal_debit_cents
      from public.investment_ledger_entries le
      where le.source_payout_id = p.id
        and le.entry_type = 'WITHDRAWAL_DEBIT'
    ) debit on true
  ),
  active_json as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', e.id,
          'participant_user_id', e.participant_user_id,
          'amount_cents', e.amount_cents,
          'status', e.status,
          'admin_notes', e.admin_notes,
          'created_at', e.created_at,
          'bank_account_masked', e.bank_account_masked,
          'payout_destination_fingerprint', e.payout_destination_fingerprint,
          'payout_id', e.payout_id,
          'payout_rail', e.payout_rail,
          'provider_code', e.provider_code,
          'payout_destination_masked', e.payout_destination_masked,
          'payout_state', e.payout_state,
          'external_reference', e.external_reference,
          'withdrawal_debit_cents', e.withdrawal_debit_cents,
          'is_reconciled', e.is_reconciled
        )
        order by e.created_at asc, e.id asc
      ) filter (where e.status in ('REQUESTED','UNDER_REVIEW','APPROVED','PAYMENT_PROCESSING')),
      '[]'::jsonb
    ) as rows
    from enriched e
  ),
  paid_json as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', e.id,
          'participant_user_id', e.participant_user_id,
          'amount_cents', e.amount_cents,
          'status', e.status,
          'admin_notes', e.admin_notes,
          'created_at', e.created_at,
          'bank_account_masked', e.bank_account_masked,
          'payout_destination_fingerprint', e.payout_destination_fingerprint,
          'payout_id', e.payout_id,
          'payout_rail', e.payout_rail,
          'provider_code', e.provider_code,
          'payout_destination_masked', e.payout_destination_masked,
          'payout_state', e.payout_state,
          'external_reference', e.external_reference,
          'withdrawal_debit_cents', e.withdrawal_debit_cents,
          'is_reconciled', e.is_reconciled
        )
        order by e.created_at desc, e.id desc
      ) filter (where e.status = 'PAID'),
      '[]'::jsonb
    ) as rows
    from enriched e
  )
  select jsonb_build_object(
    'generated_at', now(),
    'status_counts', jsonb_build_object(
      'REQUESTED', s.requested,
      'UNDER_REVIEW', s.under_review,
      'APPROVED', s.approved,
      'PAYMENT_PROCESSING', s.payment_processing,
      'PAID', s.paid
    ),
    'active_total', s.requested + s.under_review + s.approved + s.payment_processing,
    'paid_total', s.paid,
    'active_limit', p_active_limit,
    'active_offset', p_active_offset,
    'paid_limit', p_paid_limit,
    'paid_offset', p_paid_offset,
    'active_rows', a.rows,
    'paid_rows', p.rows
  )
  into v_result
  from status_summary s
  cross join active_json a
  cross join paid_json p;

  return v_result;
end;
$$;

comment on function public.get_finance_payout_queue_snapshot(integer, integer, integer, integer) is
  'Finance OS read model: exact withdrawal status counts plus independently bounded active and paid pages with payout reconciliation and masked payout destination data.';

revoke all on function public.get_finance_payout_queue_snapshot(integer, integer, integer, integer)
  from public, anon;
grant execute on function public.get_finance_payout_queue_snapshot(integer, integer, integer, integer)
  to authenticated;
