-- CTG One Wallet — Shadow Journal + Opening Balance Reconciliation
--
-- Purpose
--   Mirror the authoritative legacy COP wallet into the Wallet Domain V2 journal
--   so accounting equivalence can be measured before any authority cutover.
--
-- Financial safety boundary
--   * public.wallets.balance_cents remains the ONLY authoritative COP balance;
--   * shadow journal writes NEVER change public.wallets or transaction status;
--   * no browser/service RPC can choose a posting amount;
--   * service_role receives read-only observability, not journal mutation rights;
--   * capture failures are fail-open for the legacy balance path and become
--     explicit reconciliation drift instead of blocking an approved deposit;
--   * a later, separately reviewed migration is required before journal authority.

-- ---------------------------------------------------------------------------
-- Dedicated shadow offset account. This is an accounting mirror counterpart,
-- not a bank balance, customer liability or production clearing account.
-- ---------------------------------------------------------------------------
insert into public.wallet_accounts_v2(user_id, account_code, account_kind, currency)
values (null, 'COP_SHADOW_OFFSET', 'system_adjustment', 'COP')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Immutable opening snapshots. Existing balances are snapshotted exactly once.
-- Zero balances deliberately have no journal entry because postings cannot be 0.
-- ---------------------------------------------------------------------------
create table public.wallet_shadow_opening_snapshots_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  wallet_id uuid not null references public.wallets(id) on delete restrict,
  account_id uuid not null references public.wallet_accounts_v2(id) on delete restrict,
  opening_balance_cents bigint not null check (opening_balance_cents >= 0),
  journal_entry_id uuid references public.wallet_journal_entries_v2(id) on delete restrict,
  captured_at timestamptz not null default now(),
  constraint wallet_shadow_opening_snapshots_v2_user_unique unique (user_id),
  constraint wallet_shadow_opening_snapshots_v2_wallet_unique unique (wallet_id),
  constraint wallet_shadow_opening_snapshots_v2_account_unique unique (account_id),
  constraint wallet_shadow_opening_snapshots_v2_zero_entry_check check (
    (opening_balance_cents = 0 and journal_entry_id is null)
    or (opening_balance_cents > 0 and journal_entry_id is not null)
  )
);

comment on table public.wallet_shadow_opening_snapshots_v2 is
  'One-time, non-authoritative opening snapshot used to prove Wallet V2 journal equivalence with legacy wallets.balance_cents before any cutover.';

alter table public.wallet_shadow_opening_snapshots_v2 enable row level security;
create policy wallet_shadow_opening_snapshots_v2_read_own
  on public.wallet_shadow_opening_snapshots_v2
  for select
  to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.wallet_shadow_opening_snapshots_v2
  from public, anon, authenticated, service_role;
grant select on public.wallet_shadow_opening_snapshots_v2
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Append-only capture failures. Shadow capture must not break authoritative
-- legacy money movement; any failure is recorded and surfaces as reconciliation
-- drift. UUIDs are intentionally not FK-bound so even integrity failures can log.
-- ---------------------------------------------------------------------------
create table public.wallet_shadow_capture_failures_v2 (
  id uuid primary key default gen_random_uuid(),
  phase text not null check (phase in ('account_initialize','balance_delta')),
  user_id uuid,
  wallet_id uuid,
  old_balance_cents bigint,
  new_balance_cents bigint,
  delta_cents bigint,
  error_sqlstate text not null,
  error_message text not null,
  occurred_at timestamptz not null default now()
);

comment on table public.wallet_shadow_capture_failures_v2 is
  'Append-only operational evidence that a non-authoritative shadow capture failed. A failure never authorizes or changes a legacy wallet balance.';

alter table public.wallet_shadow_capture_failures_v2 enable row level security;
revoke all on public.wallet_shadow_capture_failures_v2
  from public, anon, authenticated, service_role;
grant select on public.wallet_shadow_capture_failures_v2 to service_role;

-- Snapshot/failure evidence is immutable. Journal rows remain governed by the
-- broader Wallet V2 contract because future reversal semantics are separate.
create or replace function public._wallet_shadow_reject_evidence_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'wallet shadow evidence is append-only';
end;
$$;

create trigger wallet_shadow_opening_snapshots_v2_immutable
before update or delete on public.wallet_shadow_opening_snapshots_v2
for each row execute function public._wallet_shadow_reject_evidence_mutation();

create trigger wallet_shadow_capture_failures_v2_immutable
before update or delete on public.wallet_shadow_capture_failures_v2
for each row execute function public._wallet_shadow_reject_evidence_mutation();

revoke all on function public._wallet_shadow_reject_evidence_mutation()
  from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Internal balanced-entry assertion. It is called inside the same PL/pgSQL
-- subtransaction that writes shadow entries, so an assertion failure rolls back
-- only the shadow attempt and is caught by the fail-open legacy trigger.
-- ---------------------------------------------------------------------------
create or replace function public._wallet_shadow_assert_balanced(p_entry_id uuid)
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
    raise exception 'WALLET_SHADOW_UNBALANCED_ENTRY';
  end if;
end;
$$;

revoke all on function public._wallet_shadow_assert_balanced(uuid)
  from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- One-time initializer for a user's current authoritative balance.
-- This function is internal only: no API role receives EXECUTE.
-- ---------------------------------------------------------------------------
create or replace function public._wallet_shadow_initialize_user(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_wallet public.wallets%rowtype;
  v_account_id uuid;
  v_offset_account_id uuid;
  v_existing_snapshot_id uuid;
  v_entry_id uuid;
  v_snapshot_id uuid;
begin
  select s.id
    into v_existing_snapshot_id
  from public.wallet_shadow_opening_snapshots_v2 s
  where s.user_id = p_user_id;

  if v_existing_snapshot_id is not null then
    return v_existing_snapshot_id;
  end if;

  select w.*
    into v_wallet
  from public.wallets w
  where w.user_id = p_user_id
  for update;

  if v_wallet.id is null then
    raise exception 'WALLET_SHADOW_WALLET_NOT_FOUND';
  end if;
  if v_wallet.currency <> 'COP' then
    raise exception 'WALLET_SHADOW_UNSUPPORTED_CURRENCY';
  end if;

  select a.id
    into v_account_id
  from public.wallet_accounts_v2 a
  where a.user_id = p_user_id
    and a.account_kind = 'user_available'
    and a.currency = v_wallet.currency
    and a.status <> 'closed';

  if v_account_id is null then
    raise exception 'WALLET_SHADOW_ACCOUNT_NOT_FOUND';
  end if;

  if v_wallet.balance_cents > 0 then
    select a.id
      into v_offset_account_id
    from public.wallet_accounts_v2 a
    where a.user_id is null
      and a.account_code = 'COP_SHADOW_OFFSET'
      and a.currency = v_wallet.currency
      and a.status <> 'closed';

    if v_offset_account_id is null then
      raise exception 'WALLET_SHADOW_OFFSET_NOT_FOUND';
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
      occurred_at,
      posted_at,
      metadata
    ) values (
      v_entry_id,
      p_user_id,
      'shadow.opening_balance',
      'posted',
      v_wallet.currency,
      'shadow.opening:' || v_wallet.id::text,
      'legacy_wallet',
      v_wallet.id,
      now(),
      now(),
      jsonb_build_object(
        'shadow', true,
        'authoritative', false,
        'openingBalanceCents', v_wallet.balance_cents
      )
    );

    insert into public.wallet_journal_postings_v2(entry_id, account_id, amount_cents, memo)
    values
      (v_entry_id, v_account_id, v_wallet.balance_cents, 'Shadow opening balance'),
      (v_entry_id, v_offset_account_id, -v_wallet.balance_cents, 'Shadow opening offset');

    perform public._wallet_shadow_assert_balanced(v_entry_id);
  end if;

  insert into public.wallet_shadow_opening_snapshots_v2(
    user_id,
    wallet_id,
    account_id,
    opening_balance_cents,
    journal_entry_id
  ) values (
    p_user_id,
    v_wallet.id,
    v_account_id,
    v_wallet.balance_cents,
    v_entry_id
  )
  returning id into v_snapshot_id;

  return v_snapshot_id;
end;
$$;

revoke all on function public._wallet_shadow_initialize_user(uuid)
  from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Fail-open shadow delta capture.
--
-- A successful legacy balance UPDATE is always the authority. Shadow failures
-- are isolated inside an exception block, logged best-effort and returned as
-- reconciliation drift; they do not roll back the authoritative wallet UPDATE.
-- ---------------------------------------------------------------------------
create or replace function public._wallet_shadow_capture_balance_delta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_snapshot public.wallet_shadow_opening_snapshots_v2%rowtype;
  v_offset_account_id uuid;
  v_delta bigint;
  v_entry_id uuid;
  v_sqlstate text;
  v_message text;
begin
  if new.balance_cents = old.balance_cents then
    return new;
  end if;

  begin
    if new.currency <> old.currency or new.currency <> 'COP' then
      raise exception 'WALLET_SHADOW_UNSUPPORTED_CURRENCY';
    end if;

    select s.*
      into v_snapshot
    from public.wallet_shadow_opening_snapshots_v2 s
    where s.user_id = new.user_id;

    -- Recovery-safe behavior for a structurally missing baseline: capture the
    -- current authoritative NEW balance as the baseline and do not double-count
    -- this UPDATE as a delta.
    if v_snapshot.id is null then
      perform public._wallet_shadow_initialize_user(new.user_id);
      return new;
    end if;

    select a.id
      into v_offset_account_id
    from public.wallet_accounts_v2 a
    where a.user_id is null
      and a.account_code = 'COP_SHADOW_OFFSET'
      and a.currency = new.currency
      and a.status <> 'closed';

    if v_offset_account_id is null then
      raise exception 'WALLET_SHADOW_OFFSET_NOT_FOUND';
    end if;

    v_delta := new.balance_cents - old.balance_cents;
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
      new.user_id,
      'shadow.balance_delta',
      'posted',
      new.currency,
      'shadow.delta:' || new.id::text || ':' || gen_random_uuid()::text,
      'legacy_wallet',
      new.id,
      clock_timestamp(),
      clock_timestamp(),
      jsonb_build_object(
        'shadow', true,
        'authoritative', false,
        'oldBalanceCents', old.balance_cents,
        'newBalanceCents', new.balance_cents,
        'deltaCents', v_delta
      )
    );

    insert into public.wallet_journal_postings_v2(entry_id, account_id, amount_cents, memo)
    values
      (v_entry_id, v_snapshot.account_id, v_delta, 'Shadow legacy balance delta'),
      (v_entry_id, v_offset_account_id, -v_delta, 'Shadow balance offset');

    perform public._wallet_shadow_assert_balanced(v_entry_id);
  exception when others then
    get stacked diagnostics
      v_sqlstate = returned_sqlstate,
      v_message = message_text;

    begin
      insert into public.wallet_shadow_capture_failures_v2(
        phase,
        user_id,
        wallet_id,
        old_balance_cents,
        new_balance_cents,
        delta_cents,
        error_sqlstate,
        error_message
      ) values (
        'balance_delta',
        new.user_id,
        new.id,
        old.balance_cents,
        new.balance_cents,
        new.balance_cents - old.balance_cents,
        coalesce(v_sqlstate, 'UNKNOWN'),
        left(coalesce(v_message, 'unknown shadow capture error'), 500)
      );
    exception when others then
      raise warning 'wallet shadow capture failure could not be logged for wallet %', new.id;
    end;
  end;

  return new;
end;
$$;

revoke all on function public._wallet_shadow_capture_balance_delta()
  from public, anon, authenticated, service_role;

-- Install the AFTER UPDATE mirror and capture the opening baseline while holding
-- one table lock inside this DO statement's transaction. This closes the race
-- between baseline capture and trigger installation without relying on a
-- top-level LOCK statement (Supabase executes migration statements separately).
do $$
declare
  v_user_id uuid;
begin
  lock table public.wallets in share row exclusive mode;

  execute $trigger$
    create trigger wallet_shadow_capture_balance_delta_v2
    after update of balance_cents on public.wallets
    for each row
    when (new.balance_cents is distinct from old.balance_cents)
    execute function public._wallet_shadow_capture_balance_delta()
  $trigger$;

  for v_user_id in
    select w.user_id from public.wallets w order by w.user_id
  loop
    perform public._wallet_shadow_initialize_user(v_user_id);
  end loop;
end;
$$;

-- Future users receive a zero/current opening snapshot immediately after their
-- Wallet V2 available account exists. Failure is non-blocking for user creation.
create or replace function public._wallet_shadow_after_available_account_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_wallet_id uuid;
  v_balance bigint;
  v_sqlstate text;
  v_message text;
begin
  if new.user_id is null
     or new.account_kind <> 'user_available'
     or new.currency <> 'COP' then
    return new;
  end if;

  begin
    perform public._wallet_shadow_initialize_user(new.user_id);
  exception when others then
    get stacked diagnostics
      v_sqlstate = returned_sqlstate,
      v_message = message_text;

    select w.id, w.balance_cents
      into v_wallet_id, v_balance
    from public.wallets w
    where w.user_id = new.user_id;

    begin
      insert into public.wallet_shadow_capture_failures_v2(
        phase,
        user_id,
        wallet_id,
        new_balance_cents,
        error_sqlstate,
        error_message
      ) values (
        'account_initialize',
        new.user_id,
        v_wallet_id,
        v_balance,
        coalesce(v_sqlstate, 'UNKNOWN'),
        left(coalesce(v_message, 'unknown shadow initialization error'), 500)
      );
    exception when others then
      raise warning 'wallet shadow account initialization failure could not be logged for user %', new.user_id;
    end;
  end;

  return new;
end;
$$;

revoke all on function public._wallet_shadow_after_available_account_insert()
  from public, anon, authenticated, service_role;

create trigger wallet_shadow_initialize_available_account_v2
after insert on public.wallet_accounts_v2
for each row
when (new.user_id is not null and new.account_kind = 'user_available')
execute function public._wallet_shadow_after_available_account_insert();

-- ---------------------------------------------------------------------------
-- Reconciliation read model. Legacy remains authority; shadow balance is a
-- derived mirror and drift is shadow minus legacy.
-- ---------------------------------------------------------------------------
create view public.wallet_shadow_reconciliation_v2
with (security_invoker = true)
as
with shadow_balances as (
  select
    p.account_id,
    coalesce(sum(p.amount_cents), 0)::bigint as shadow_balance_cents,
    max(e.posted_at) as last_shadow_posted_at
  from public.wallet_journal_postings_v2 p
  join public.wallet_journal_entries_v2 e on e.id = p.entry_id
  where e.status = 'posted'
    and e.metadata ->> 'shadow' = 'true'
    and e.metadata ->> 'authoritative' = 'false'
  group by p.account_id
)
select
  a.id as account_id,
  a.user_id,
  w.id as legacy_wallet_id,
  w.currency,
  w.balance_cents as legacy_balance_cents,
  coalesce(sb.shadow_balance_cents, 0)::bigint as shadow_balance_cents,
  (coalesce(sb.shadow_balance_cents, 0) - w.balance_cents)::bigint as drift_cents,
  (s.id is not null) as baseline_initialized,
  s.opening_balance_cents,
  s.captured_at as baseline_captured_at,
  sb.last_shadow_posted_at,
  (
    s.id is not null
    and coalesce(sb.shadow_balance_cents, 0) = w.balance_cents
  ) as in_sync,
  'legacy_wallets'::text as balance_authority,
  false as shadow_authoritative
from public.wallet_accounts_v2 a
join public.wallets w
  on w.user_id = a.user_id and w.currency = a.currency
left join public.wallet_shadow_opening_snapshots_v2 s
  on s.account_id = a.id and s.wallet_id = w.id
left join shadow_balances sb
  on sb.account_id = a.id
where a.account_kind = 'user_available'
  and a.status <> 'closed';

comment on view public.wallet_shadow_reconciliation_v2 is
  'Per-user comparison of authoritative legacy COP balance versus non-authoritative Wallet V2 shadow journal. drift_cents = shadow - legacy.';

revoke all on public.wallet_shadow_reconciliation_v2
  from public, anon, authenticated, service_role;
grant select on public.wallet_shadow_reconciliation_v2
  to authenticated, service_role;

create view public.wallet_shadow_reconciliation_health_v2
with (security_invoker = true)
as
select
  count(*)::bigint as wallet_count,
  count(*) filter (where not r.in_sync)::bigint as drift_wallet_count,
  coalesce(sum(abs(r.drift_cents)), 0)::bigint as total_absolute_drift_cents,
  coalesce(bool_and(r.in_sync), true) as all_in_sync,
  max(r.last_shadow_posted_at) as last_shadow_posted_at,
  (select count(*)::bigint from public.wallet_shadow_capture_failures_v2) as capture_failure_count,
  (select max(f.occurred_at) from public.wallet_shadow_capture_failures_v2 f) as last_capture_failure_at,
  'legacy_wallets'::text as balance_authority,
  false as shadow_authoritative
from public.wallet_shadow_reconciliation_v2 r;

comment on view public.wallet_shadow_reconciliation_health_v2 is
  'Service-role operational drift summary for the non-authoritative Wallet V2 shadow journal.';

revoke all on public.wallet_shadow_reconciliation_health_v2
  from public, anon, authenticated, service_role;
grant select on public.wallet_shadow_reconciliation_health_v2 to service_role;

-- No mutation rights are widened by this migration. Trigger-owner code is the
-- only path that mirrors legacy changes into the shadow journal.
