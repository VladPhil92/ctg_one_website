-- CTG Rewards Foundation v1
--
-- Product-truth boundary:
-- - this migration creates an off-chain rewards account and immutable audit ledger;
-- - it does NOT activate earning rules, redemption, transfers, cashback, referrals,
--   CTGO conversion, or any monetary claim;
-- - authenticated users can read only their own rows;
-- - all mutations remain server/operator controlled and ledger-backed.

create table if not exists public.reward_accounts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  status text not null default 'foundation'
    check (status in ('foundation', 'active', 'frozen')),
  points_balance bigint not null default 0 check (points_balance >= 0),
  lifetime_earned bigint not null default 0 check (lifetime_earned >= 0),
  lifetime_reversed bigint not null default 0 check (lifetime_reversed >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.reward_accounts is
  'Off-chain CTG Rewards account foundation. A row does not mean earning/redemption rules are active.';
comment on column public.reward_accounts.points_balance is
  'Non-monetary loyalty points. No COP value, CTGO conversion, transferability, or redemption is implied.';

create table if not exists public.reward_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.reward_accounts(user_id) on delete cascade,
  entry_type text not null check (entry_type in ('earn', 'adjustment', 'reversal')),
  points_delta bigint not null check (points_delta <> 0),
  balance_after bigint not null check (balance_after >= 0),
  source_domain text not null check (char_length(source_domain) between 2 and 64),
  source_reference text check (source_reference is null or char_length(source_reference) <= 160),
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 200),
  description text check (description is null or char_length(description) <= 240),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint reward_ledger_entry_direction_check check (
    (entry_type = 'earn' and points_delta > 0)
    or entry_type = 'adjustment'
    or (entry_type = 'reversal' and points_delta < 0)
  )
);

create unique index if not exists reward_ledger_entries_idempotency_uidx
  on public.reward_ledger_entries (idempotency_key);
create index if not exists reward_ledger_entries_user_created_idx
  on public.reward_ledger_entries (user_id, created_at desc);
create index if not exists reward_ledger_entries_source_idx
  on public.reward_ledger_entries (source_domain, source_reference)
  where source_reference is not null;

comment on table public.reward_ledger_entries is
  'Append-only audit ledger for future approved Rewards credits/adjustments/reversals. No redemption rail is active in Foundation v1.';

create or replace function public.rewards_touch_account_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create or replace function public.rewards_prevent_ledger_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception 'reward ledger entries are immutable; append a reversal instead';
end;
$$;

create or replace function public.rewards_create_account_for_profile()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  insert into public.reward_accounts (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists reward_accounts_touch_updated_at_trg on public.reward_accounts;
create trigger reward_accounts_touch_updated_at_trg
before update on public.reward_accounts
for each row execute function public.rewards_touch_account_updated_at();

drop trigger if exists reward_ledger_immutable_update_trg on public.reward_ledger_entries;
create trigger reward_ledger_immutable_update_trg
before update on public.reward_ledger_entries
for each row execute function public.rewards_prevent_ledger_mutation();

drop trigger if exists reward_ledger_immutable_delete_trg on public.reward_ledger_entries;
create trigger reward_ledger_immutable_delete_trg
before delete on public.reward_ledger_entries
for each row execute function public.rewards_prevent_ledger_mutation();

drop trigger if exists reward_account_on_profile_created on public.profiles;
create trigger reward_account_on_profile_created
after insert on public.profiles
for each row execute function public.rewards_create_account_for_profile();

-- Existing CTG One identities receive an empty foundation account only.
-- No points are seeded and no earning rule is inferred from historic activity.
insert into public.reward_accounts (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

alter table public.reward_accounts enable row level security;
alter table public.reward_ledger_entries enable row level security;

revoke all on table public.reward_accounts from public, anon, authenticated;
revoke all on table public.reward_ledger_entries from public, anon, authenticated;

grant select on table public.reward_accounts to authenticated;
grant select on table public.reward_ledger_entries to authenticated;
grant select, insert, update, delete on table public.reward_accounts to service_role;
grant select, insert on table public.reward_ledger_entries to service_role;

-- Authenticated reads are ownership-scoped. Client roles receive no write grant.
drop policy if exists reward_accounts_select_own on public.reward_accounts;
create policy reward_accounts_select_own
on public.reward_accounts
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists reward_ledger_entries_select_own on public.reward_ledger_entries;
create policy reward_ledger_entries_select_own
on public.reward_ledger_entries
for select
to authenticated
using ((select auth.uid()) = user_id);

-- Canonical future write boundary. This function is SECURITY INVOKER and is
-- executable only by service_role. Foundation v1 does not expose an HTTP route
-- that calls it, so no commercial earning rule becomes active by this migration.
create or replace function public.apply_reward_ledger_entry(
  p_user_id uuid,
  p_points_delta bigint,
  p_entry_type text,
  p_source_domain text,
  p_idempotency_key text,
  p_source_reference text default null,
  p_description text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_created_by uuid default null
)
returns table(entry_id uuid, balance_after bigint, applied boolean)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_account public.reward_accounts%rowtype;
  v_existing public.reward_ledger_entries%rowtype;
  v_new_balance bigint;
  v_entry_id uuid;
begin
  if p_points_delta = 0 then
    raise exception 'points delta must be non-zero';
  end if;
  if p_entry_type not in ('earn', 'adjustment', 'reversal') then
    raise exception 'unsupported reward entry type';
  end if;
  if p_entry_type = 'earn' and p_points_delta < 0 then
    raise exception 'earn entries must be positive';
  end if;
  if p_entry_type = 'reversal' and p_points_delta > 0 then
    raise exception 'reversal entries must be negative';
  end if;
  if p_metadata is null or jsonb_typeof(p_metadata) <> 'object' then
    raise exception 'metadata must be a JSON object';
  end if;

  insert into public.reward_accounts (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select * into v_account
  from public.reward_accounts
  where user_id = p_user_id
  for update;

  if v_account is null then
    raise exception 'reward account not found';
  end if;

  -- Re-check idempotency after acquiring the account lock so concurrent calls
  -- with the same key serialize to exactly one ledger mutation.
  select * into v_existing
  from public.reward_ledger_entries
  where idempotency_key = p_idempotency_key;

  if v_existing is not null then
    if v_existing.user_id <> p_user_id
      or v_existing.points_delta <> p_points_delta
      or v_existing.entry_type <> p_entry_type
      or v_existing.source_domain <> p_source_domain then
      raise exception 'idempotency key already used with different reward facts';
    end if;
    return query select v_existing.id, v_existing.balance_after, false;
    return;
  end if;

  v_new_balance := v_account.points_balance + p_points_delta;
  if v_new_balance < 0 then
    raise exception 'reward balance cannot become negative';
  end if;

  update public.reward_accounts
  set points_balance = v_new_balance,
      lifetime_earned = lifetime_earned + greatest(p_points_delta, 0),
      lifetime_reversed = lifetime_reversed + greatest(-p_points_delta, 0)
  where user_id = p_user_id;

  insert into public.reward_ledger_entries (
    user_id,
    entry_type,
    points_delta,
    balance_after,
    source_domain,
    source_reference,
    idempotency_key,
    description,
    metadata,
    created_by
  ) values (
    p_user_id,
    p_entry_type,
    p_points_delta,
    v_new_balance,
    p_source_domain,
    p_source_reference,
    p_idempotency_key,
    p_description,
    p_metadata,
    p_created_by
  ) returning id into v_entry_id;

  return query select v_entry_id, v_new_balance, true;
end;
$$;

revoke execute on function public.rewards_touch_account_updated_at() from public, anon, authenticated;
revoke execute on function public.rewards_prevent_ledger_mutation() from public, anon, authenticated;
revoke execute on function public.rewards_create_account_for_profile() from public, anon, authenticated;
revoke execute on function public.apply_reward_ledger_entry(uuid, bigint, text, text, text, text, text, jsonb, uuid)
  from public, anon, authenticated;
grant execute on function public.apply_reward_ledger_entry(uuid, bigint, text, text, text, text, text, jsonb, uuid)
  to service_role;
