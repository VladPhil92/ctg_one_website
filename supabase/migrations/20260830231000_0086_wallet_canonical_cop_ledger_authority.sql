-- CTG One Wallet — Canonical COP Ledger Authority
--
-- Purpose
--   Promote Wallet Domain V2 from a reconciled shadow journal to the canonical
--   Saldo CTG authority while preserving public.wallets.balance_cents only as a
--   compatibility cache for legacy surfaces during migration.
--
-- Financial safety boundary
--   * cutover aborts unless every shadow wallet is initialized and in sync;
--   * historical shadow entries remain immutable evidence and are NEVER counted
--     in the authoritative balance;
--   * authoritative entries are double-entry and append-only;
--   * browser/authenticated roles cannot post journal entries or call the
--     consumption RPC;
--   * top-up reconciliation remains a two-admin process and posts exactly once;
--   * free withdrawals, P2P COP transfers and investment debits are not enabled.

-- ---------------------------------------------------------------------------
-- Cutover preflight: legacy and shadow must agree before authority changes.
-- ---------------------------------------------------------------------------
do $$
declare
  v_wallet_count bigint;
  v_drift_wallet_count bigint;
  v_total_drift bigint;
  v_all_in_sync boolean;
begin
  select
    wallet_count,
    drift_wallet_count,
    total_absolute_drift_cents,
    all_in_sync
  into
    v_wallet_count,
    v_drift_wallet_count,
    v_total_drift,
    v_all_in_sync
  from public.wallet_shadow_reconciliation_health_v2;

  if coalesce(v_all_in_sync, false) is not true
     or coalesce(v_drift_wallet_count, 0) <> 0
     or coalesce(v_total_drift, 0) <> 0 then
    raise exception 'WALLET_LEDGER_CUTOVER_RECONCILIATION_FAILED';
  end if;

  if exists (
    select 1
    from public.wallet_shadow_reconciliation_v2 r
    where not r.baseline_initialized
  ) then
    raise exception 'WALLET_LEDGER_CUTOVER_BASELINE_MISSING';
  end if;

  raise notice 'wallet ledger cutover preflight passed for % wallets', coalesce(v_wallet_count, 0);
end;
$$;

-- Shadow capture stops at the cutover boundary. Evidence tables/views remain
-- available for audit and historical proof.
drop trigger if exists wallet_shadow_capture_balance_delta_v2 on public.wallets;
drop trigger if exists wallet_shadow_initialize_available_account_v2 on public.wallet_accounts_v2;

-- ---------------------------------------------------------------------------
-- Canonical system counterpart accounts.
-- ---------------------------------------------------------------------------
insert into public.wallet_accounts_v2(user_id, account_code, account_kind, currency)
values
  (null, 'COP_LEDGER_OPENING_OFFSET', 'system_adjustment', 'COP'),
  (null, 'COP_ECOSYSTEM_CONSUMPTION', 'system_clearing', 'COP')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Canonical ledger helpers. No API role receives direct execution.
-- ---------------------------------------------------------------------------
create or replace function public._wallet_ledger_assert_balanced(p_entry_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count bigint;
  v_sum bigint;
begin
  select count(*), coalesce(sum(p.amount_cents), 0)::bigint
    into v_count, v_sum
  from public.wallet_journal_postings_v2 p
  where p.entry_id = p_entry_id;

  if v_count <> 2 or v_sum <> 0 then
    raise exception 'WALLET_LEDGER_UNBALANCED_ENTRY';
  end if;
end;
$$;

revoke all on function public._wallet_ledger_assert_balanced(uuid)
  from public, anon, authenticated, service_role;

create or replace function public._wallet_ledger_balance_cents(p_user_id uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(p.amount_cents), 0)::bigint
  from public.wallet_accounts_v2 a
  left join public.wallet_journal_postings_v2 p on p.account_id = a.id
  left join public.wallet_journal_entries_v2 e
    on e.id = p.entry_id
   and e.status = 'posted'
   and e.metadata ->> 'authoritative' = 'true'
  where a.user_id = p_user_id
    and a.account_kind = 'user_available'
    and a.currency = 'COP'
    and a.status <> 'closed';
$$;

revoke all on function public._wallet_ledger_balance_cents(uuid)
  from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Authoritative opening entries. Shadow rows are not reused: their metadata
-- deliberately says authoritative=false. This creates an explicit audit line
-- at the authority boundary using the exact reconciled legacy balance.
-- ---------------------------------------------------------------------------
do $$
declare
  v_row record;
  v_offset_account_id uuid;
  v_entry_id uuid;
begin
  select a.id into v_offset_account_id
  from public.wallet_accounts_v2 a
  where a.user_id is null
    and a.account_code = 'COP_LEDGER_OPENING_OFFSET'
    and a.currency = 'COP'
    and a.status <> 'closed';

  if v_offset_account_id is null then
    raise exception 'WALLET_LEDGER_OPENING_OFFSET_NOT_FOUND';
  end if;

  for v_row in
    select
      r.user_id,
      r.account_id,
      r.legacy_wallet_id,
      r.legacy_balance_cents
    from public.wallet_shadow_reconciliation_v2 r
    order by r.user_id
  loop
    if v_row.legacy_balance_cents > 0 then
      v_entry_id := gen_random_uuid();

      insert into public.wallet_journal_entries_v2(
        id,
        subject_user_id,
        event_type,
        status,
        currency,
        idempotency_key,
        source_type,
        source_id,
        occurred_at,
        posted_at,
        metadata
      ) values (
        v_entry_id,
        v_row.user_id,
        'ledger.opening_balance',
        'posted',
        'COP',
        'ledger.opening:' || v_row.legacy_wallet_id::text,
        'ledger_cutover',
        v_row.legacy_wallet_id,
        clock_timestamp(),
        clock_timestamp(),
        jsonb_build_object(
          'authoritative', true,
          'cutover', true,
          'openingBalanceCents', v_row.legacy_balance_cents
        )
      );

      insert into public.wallet_journal_postings_v2(entry_id, account_id, amount_cents, memo)
      values
        (v_entry_id, v_row.account_id, v_row.legacy_balance_cents, 'Canonical Saldo CTG opening balance'),
        (v_entry_id, v_offset_account_id, -v_row.legacy_balance_cents, 'Canonical ledger opening offset');

      perform public._wallet_ledger_assert_balanced(v_entry_id);
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Canonical balance projection. The legacy wallet ID remains visible only to
-- preserve API compatibility; available balance is now derived from posted
-- authoritative journal postings.
-- ---------------------------------------------------------------------------
drop view public.wallet_balance_compatibility_v2;

create view public.wallet_balance_compatibility_v2
with (security_invoker = true)
as
with authoritative_balances as (
  select
    a.id as account_id,
    coalesce(sum(p.amount_cents) filter (
      where e.status = 'posted'
        and e.metadata ->> 'authoritative' = 'true'
    ), 0)::bigint as available_balance_cents,
    max(e.posted_at) filter (
      where e.status = 'posted'
        and e.metadata ->> 'authoritative' = 'true'
    ) as last_posted_at
  from public.wallet_accounts_v2 a
  left join public.wallet_journal_postings_v2 p on p.account_id = a.id
  left join public.wallet_journal_entries_v2 e on e.id = p.entry_id
  where a.account_kind = 'user_available'
    and a.status <> 'closed'
  group by a.id
)
select
  a.id as account_id,
  a.user_id,
  w.id as legacy_wallet_id,
  a.currency,
  coalesce(b.available_balance_cents, 0)::bigint as available_balance_cents,
  'ctg_ledger_v2'::text as balance_authority,
  true as journal_posting_enabled,
  coalesce(b.last_posted_at, w.updated_at) as balance_updated_at
from public.wallet_accounts_v2 a
join public.wallets w
  on w.user_id = a.user_id and w.currency = a.currency
left join authoritative_balances b on b.account_id = a.id
where a.account_kind = 'user_available'
  and a.status <> 'closed';

comment on view public.wallet_balance_compatibility_v2 is
  'Wallet V2 Saldo CTG read model. available_balance_cents is derived from posted authoritative journal entries; public.wallets.balance_cents is compatibility cache only.';

revoke all on public.wallet_balance_compatibility_v2 from public, anon, authenticated, service_role;
grant select on public.wallet_balance_compatibility_v2 to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Canonical user activity derived from the user-available posting of each entry.
-- ---------------------------------------------------------------------------
create view public.wallet_ledger_activity_v2
with (security_invoker = true)
as
select
  e.id,
  e.subject_user_id as user_id,
  e.event_type,
  e.status,
  e.currency,
  abs(p.amount_cents)::bigint as amount_cents,
  case when p.amount_cents > 0 then 'credit' else 'debit' end::text as direction,
  e.source_type,
  e.source_id,
  e.external_reference,
  e.occurred_at,
  e.posted_at
from public.wallet_journal_entries_v2 e
join public.wallet_journal_postings_v2 p on p.entry_id = e.id
join public.wallet_accounts_v2 a on a.id = p.account_id
where e.subject_user_id is not null
  and e.metadata ->> 'authoritative' = 'true'
  and a.user_id = e.subject_user_id
  and a.account_kind = 'user_available'
  and a.currency = e.currency;

comment on view public.wallet_ledger_activity_v2 is
  'Display-safe Saldo CTG activity projection. Signed journal deltas become explicit credit/debit direction while system counterpart postings remain hidden.';

revoke all on public.wallet_ledger_activity_v2 from public, anon, authenticated, service_role;
grant select on public.wallet_ledger_activity_v2 to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Compatibility-cache reconciliation. Ledger is authority; drift is cache minus
-- ledger. This is operational evidence only and cannot move money.
-- ---------------------------------------------------------------------------
create view public.wallet_ledger_reconciliation_v2
with (security_invoker = true)
as
select
  b.account_id,
  b.user_id,
  b.legacy_wallet_id,
  b.currency,
  b.available_balance_cents as ledger_balance_cents,
  w.balance_cents as legacy_cache_balance_cents,
  (w.balance_cents - b.available_balance_cents)::bigint as drift_cents,
  (w.balance_cents = b.available_balance_cents) as in_sync,
  b.balance_updated_at,
  'ctg_ledger_v2'::text as balance_authority
from public.wallet_balance_compatibility_v2 b
join public.wallets w on w.id = b.legacy_wallet_id;

revoke all on public.wallet_ledger_reconciliation_v2 from public, anon, authenticated, service_role;
grant select on public.wallet_ledger_reconciliation_v2 to authenticated, service_role;

create view public.wallet_ledger_reconciliation_health_v2
with (security_invoker = true)
as
select
  count(*)::bigint as wallet_count,
  count(*) filter (where not r.in_sync)::bigint as drift_wallet_count,
  coalesce(sum(abs(r.drift_cents)), 0)::bigint as total_absolute_drift_cents,
  coalesce(bool_and(r.in_sync), true) as all_in_sync,
  'ctg_ledger_v2'::text as balance_authority
from public.wallet_ledger_reconciliation_v2 r;

revoke all on public.wallet_ledger_reconciliation_health_v2 from public, anon, authenticated, service_role;
grant select on public.wallet_ledger_reconciliation_health_v2 to service_role;

-- ---------------------------------------------------------------------------
-- Top-up reconciliation now posts the canonical credit before updating the
-- legacy compatibility cache. The existing two-admin trust boundary is kept.
-- ---------------------------------------------------------------------------
create or replace function public.reconcile_wallet_topup_claim(
  p_claim_id uuid,
  p_admin_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_claim public.wallet_topup_claims%rowtype;
  v_tx public.transactions%rowtype;
  v_wallet public.wallets%rowtype;
  v_user_account_id uuid;
  v_clearing_account_id uuid;
  v_entry_id uuid;
  v_balance_before bigint;
  v_balance_after bigint;
  v_reference_authority text;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;

  select c.* into v_claim
  from public.wallet_topup_claims c
  where c.id = p_claim_id
  for update;

  if v_claim.id is null then raise exception 'WALLET_TOPUP_CLAIM_NOT_FOUND'; end if;
  if v_claim.state = 'reconciled' then
    return jsonb_build_object(
      'claimId', v_claim.id,
      'transactionId', v_claim.transaction_id,
      'state', v_claim.state,
      'idempotentReplay', true
    );
  end if;
  if v_claim.state <> 'verified' then raise exception 'WALLET_TOPUP_NOT_VERIFIED'; end if;
  if v_claim.verified_by = auth.uid() then raise exception 'WALLET_TOPUP_INDEPENDENT_RECONCILER_REQUIRED'; end if;

  select t.* into v_tx
  from public.transactions t
  where t.id = v_claim.transaction_id
  for update;

  if v_tx.id is null then raise exception 'WALLET_TOPUP_TRANSACTION_NOT_FOUND'; end if;
  if v_tx.type <> 'deposit' or v_tx.status <> 'pending' then raise exception 'WALLET_TOPUP_TRANSACTION_STATE_INVALID'; end if;
  if v_tx.user_id <> v_claim.user_id
     or v_tx.method <> v_claim.rail
     or v_tx.amount_cents <> v_claim.amount_cents
     or public.normalize_wallet_topup_reference(v_tx.external_reference) <> v_claim.normalized_reference then
    raise exception 'WALLET_TOPUP_TRANSACTION_MISMATCH';
  end if;

  select w.* into v_wallet
  from public.wallets w
  where w.user_id = v_claim.user_id
  for update;

  if v_wallet.id is null then raise exception 'WALLET_TOPUP_WALLET_NOT_FOUND'; end if;
  if v_wallet.currency <> 'COP' then raise exception 'WALLET_TOPUP_CURRENCY_INVALID'; end if;

  select a.id into v_user_account_id
  from public.wallet_accounts_v2 a
  where a.user_id = v_claim.user_id
    and a.account_kind = 'user_available'
    and a.currency = 'COP'
    and a.status = 'active';

  select a.id into v_clearing_account_id
  from public.wallet_accounts_v2 a
  where a.user_id is null
    and a.account_code = 'COP_EXTERNAL_CLEARING'
    and a.currency = 'COP'
    and a.status = 'active';

  if v_user_account_id is null or v_clearing_account_id is null then
    raise exception 'WALLET_TOPUP_LEDGER_ACCOUNT_MISSING';
  end if;

  v_balance_before := public._wallet_ledger_balance_cents(v_claim.user_id);
  if v_wallet.balance_cents <> v_balance_before then
    raise exception 'WALLET_TOPUP_COMPATIBILITY_CACHE_DRIFT';
  end if;

  v_entry_id := gen_random_uuid();

  insert into public.wallet_journal_entries_v2(
    id,
    subject_user_id,
    event_type,
    status,
    currency,
    idempotency_key,
    source_type,
    source_id,
    external_reference,
    occurred_at,
    posted_at,
    metadata
  ) values (
    v_entry_id,
    v_claim.user_id,
    'ledger.topup',
    'posted',
    'COP',
    'ledger.topup:' || v_claim.id::text,
    'wallet_topup_claim',
    v_claim.id,
    v_claim.normalized_reference,
    clock_timestamp(),
    clock_timestamp(),
    jsonb_build_object(
      'authoritative', true,
      'claimId', v_claim.id,
      'transactionId', v_tx.id,
      'rail', v_claim.rail,
      'reconciledBy', auth.uid()
    )
  );

  insert into public.wallet_journal_postings_v2(entry_id, account_id, amount_cents, memo)
  values
    (v_entry_id, v_user_account_id, v_claim.amount_cents, 'Reconciled Saldo CTG top-up'),
    (v_entry_id, v_clearing_account_id, -v_claim.amount_cents, 'External COP clearing');

  perform public._wallet_ledger_assert_balanced(v_entry_id);

  insert into public.wallet_transaction_references_v2(
    subject_user_id,
    journal_entry_id,
    authority,
    reference_kind,
    reference_value
  ) values (
    v_claim.user_id,
    v_entry_id,
    'ctg-ledger',
    'topup_claim',
    v_claim.id::text
  );

  v_reference_authority := case when v_claim.rail = 'bre_b_qr' then 'bre_b' else 'bank' end;
  insert into public.wallet_transaction_references_v2(
    subject_user_id,
    journal_entry_id,
    authority,
    reference_kind,
    reference_value
  ) values (
    v_claim.user_id,
    v_entry_id,
    v_reference_authority,
    'payment_reference',
    v_claim.normalized_reference
  );

  update public.wallets
  set balance_cents = v_balance_before + v_claim.amount_cents,
      updated_at = now()
  where id = v_wallet.id;

  update public.transactions
  set status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      admin_notes = coalesce(nullif(btrim(coalesce(p_admin_notes, '')), ''), admin_notes)
  where id = v_tx.id;

  update public.wallet_topup_claims
  set state = 'reconciled',
      reconciled_by = auth.uid(),
      reconciled_at = now(),
      updated_at = now()
  where id = p_claim_id;

  v_balance_after := public._wallet_ledger_balance_cents(v_claim.user_id);
  if v_balance_after <> v_balance_before + v_claim.amount_cents then
    raise exception 'WALLET_TOPUP_LEDGER_POSTING_MISMATCH';
  end if;

  insert into public.admin_audit_log(admin_id, action, target_table, target_id, details)
  values (
    auth.uid(),
    'reconcile_wallet_topup_claim',
    'wallet_topup_claims',
    p_claim_id,
    jsonb_build_object(
      'transaction_id', v_tx.id,
      'wallet_id', v_wallet.id,
      'journal_entry_id', v_entry_id,
      'amount_cents', v_claim.amount_cents,
      'balance_before_cents', v_balance_before,
      'balance_after_cents', v_balance_after,
      'rail', v_claim.rail,
      'normalized_reference', v_claim.normalized_reference,
      'verified_by', v_claim.verified_by,
      'balance_authority', 'ctg_ledger_v2'
    )
  );

  return jsonb_build_object(
    'claimId', p_claim_id,
    'transactionId', v_tx.id,
    'journalEntryId', v_entry_id,
    'state', 'reconciled',
    'creditedCents', v_claim.amount_cents,
    'balanceCents', v_balance_after,
    'balanceAuthority', 'ctg_ledger_v2',
    'idempotentReplay', false
  );
end;
$$;

revoke all on function public.reconcile_wallet_topup_claim(uuid,text)
  from public, anon, authenticated, service_role;
grant execute on function public.reconcile_wallet_topup_claim(uuid,text) to authenticated;

-- ---------------------------------------------------------------------------
-- Trusted ecosystem-consumption debit. No browser/authenticated role can call
-- this function; a future CTG One server-side purchase adapter supplies the
-- canonical user, amount and idempotency/reference data.
-- ---------------------------------------------------------------------------
create or replace function public.consume_wallet_cop_balance_server(
  p_user_id uuid,
  p_amount_cents bigint,
  p_idempotency_key text,
  p_external_reference text,
  p_description text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_wallet public.wallets%rowtype;
  v_existing_entry public.wallet_journal_entries_v2%rowtype;
  v_user_account_id uuid;
  v_consumption_account_id uuid;
  v_existing_delta bigint;
  v_entry_id uuid;
  v_balance_before bigint;
  v_balance_after bigint;
  v_key text;
  v_reference text;
begin
  if p_user_id is null then raise exception 'WALLET_CONSUMPTION_USER_REQUIRED'; end if;
  if p_amount_cents is null or p_amount_cents <= 0 then raise exception 'WALLET_CONSUMPTION_AMOUNT_INVALID'; end if;

  v_key := lower(btrim(coalesce(p_idempotency_key, '')));
  v_reference := btrim(coalesce(p_external_reference, ''));
  if length(v_key) < 8 or length(v_key) > 128 then raise exception 'WALLET_CONSUMPTION_IDEMPOTENCY_INVALID'; end if;
  if length(v_reference) < 1 or length(v_reference) > 255 then raise exception 'WALLET_CONSUMPTION_REFERENCE_INVALID'; end if;

  select e.* into v_existing_entry
  from public.wallet_journal_entries_v2 e
  where e.idempotency_key_normalized = v_key;

  if v_existing_entry.id is not null then
    if v_existing_entry.subject_user_id <> p_user_id
       or v_existing_entry.event_type <> 'ledger.consumption'
       or v_existing_entry.external_reference <> v_reference then
      raise exception 'WALLET_CONSUMPTION_IDEMPOTENCY_CONFLICT';
    end if;

    select p.amount_cents into v_existing_delta
    from public.wallet_journal_postings_v2 p
    join public.wallet_accounts_v2 a on a.id = p.account_id
    where p.entry_id = v_existing_entry.id
      and a.user_id = p_user_id
      and a.account_kind = 'user_available';

    if v_existing_delta <> -p_amount_cents then
      raise exception 'WALLET_CONSUMPTION_IDEMPOTENCY_CONFLICT';
    end if;

    return jsonb_build_object(
      'journalEntryId', v_existing_entry.id,
      'debitedCents', p_amount_cents,
      'balanceCents', public._wallet_ledger_balance_cents(p_user_id),
      'balanceAuthority', 'ctg_ledger_v2',
      'idempotentReplay', true
    );
  end if;

  select w.* into v_wallet
  from public.wallets w
  where w.user_id = p_user_id
  for update;

  if v_wallet.id is null then raise exception 'WALLET_CONSUMPTION_WALLET_NOT_FOUND'; end if;
  if v_wallet.currency <> 'COP' then raise exception 'WALLET_CONSUMPTION_CURRENCY_INVALID'; end if;

  select a.id into v_user_account_id
  from public.wallet_accounts_v2 a
  where a.user_id = p_user_id
    and a.account_kind = 'user_available'
    and a.currency = 'COP'
    and a.status = 'active';

  select a.id into v_consumption_account_id
  from public.wallet_accounts_v2 a
  where a.user_id is null
    and a.account_code = 'COP_ECOSYSTEM_CONSUMPTION'
    and a.currency = 'COP'
    and a.status = 'active';

  if v_user_account_id is null or v_consumption_account_id is null then
    raise exception 'WALLET_CONSUMPTION_LEDGER_ACCOUNT_MISSING';
  end if;

  v_balance_before := public._wallet_ledger_balance_cents(p_user_id);
  if v_wallet.balance_cents <> v_balance_before then
    raise exception 'WALLET_CONSUMPTION_COMPATIBILITY_CACHE_DRIFT';
  end if;
  if v_balance_before < p_amount_cents then
    raise exception 'WALLET_COP_INSUFFICIENT_FUNDS';
  end if;

  v_entry_id := gen_random_uuid();

  insert into public.wallet_journal_entries_v2(
    id,
    subject_user_id,
    event_type,
    status,
    currency,
    idempotency_key,
    source_type,
    external_reference,
    occurred_at,
    posted_at,
    metadata
  ) values (
    v_entry_id,
    p_user_id,
    'ledger.consumption',
    'posted',
    'COP',
    v_key,
    'ecosystem_purchase',
    v_reference,
    clock_timestamp(),
    clock_timestamp(),
    jsonb_build_object(
      'authoritative', true,
      'description', nullif(btrim(coalesce(p_description, '')), ''),
      'amountCents', p_amount_cents
    )
  );

  insert into public.wallet_journal_postings_v2(entry_id, account_id, amount_cents, memo)
  values
    (v_entry_id, v_user_account_id, -p_amount_cents, 'Saldo CTG ecosystem consumption'),
    (v_entry_id, v_consumption_account_id, p_amount_cents, 'CTG ecosystem consumption clearing');

  perform public._wallet_ledger_assert_balanced(v_entry_id);

  insert into public.wallet_transaction_references_v2(
    subject_user_id,
    journal_entry_id,
    authority,
    reference_kind,
    reference_value
  ) values (
    p_user_id,
    v_entry_id,
    'ctg-ledger',
    'ecosystem_purchase',
    v_reference
  );

  v_balance_after := v_balance_before - p_amount_cents;

  update public.wallets
  set balance_cents = v_balance_after,
      updated_at = now()
  where id = v_wallet.id;

  if public._wallet_ledger_balance_cents(p_user_id) <> v_balance_after then
    raise exception 'WALLET_CONSUMPTION_LEDGER_POSTING_MISMATCH';
  end if;

  return jsonb_build_object(
    'journalEntryId', v_entry_id,
    'debitedCents', p_amount_cents,
    'balanceCents', v_balance_after,
    'balanceAuthority', 'ctg_ledger_v2',
    'idempotentReplay', false
  );
end;
$$;

revoke all on function public.consume_wallet_cop_balance_server(uuid,bigint,text,text,text)
  from public, anon, authenticated, service_role;
grant execute on function public.consume_wallet_cop_balance_server(uuid,bigint,text,text,text)
  to service_role;

comment on function public.consume_wallet_cop_balance_server(uuid,bigint,text,text,text) is
  'Service-role-only atomic Saldo CTG debit for a trusted ecosystem purchase adapter. It cannot be called by browser/authenticated roles and does not enable withdrawals, P2P or investment debits.';
