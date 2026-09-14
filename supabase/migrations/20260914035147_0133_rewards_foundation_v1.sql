-- CTG Rewards Foundation v1
--
-- Product-truth boundary:
-- - this migration creates an off-chain rewards account and immutable audit ledger;
-- - it does NOT activate earning rules, redemption, transfers, cashback, referrals,
--   CTGO conversion, or any monetary claim;
-- - authenticated users can read only their own rows;
-- - Foundation v1 intentionally exposes no mutation RPC or direct mutation grant.

create schema if not exists private;

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
  created_by uuid,
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
  'Append-only audit ledger reserved for a future approved Rewards mutation boundary. Foundation v1 exposes no write path.';
comment on column public.reward_ledger_entries.created_by is
  'Immutable actor UUID snapshot. Intentionally not a profile FK so identity deletion cannot mutate historical ledger rows.';

create or replace function private.rewards_touch_account_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create or replace function private.rewards_prevent_ledger_update()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception 'reward ledger entries are immutable; append a compensating entry in a future approved write boundary';
end;
$$;

create or replace function private.rewards_create_account_for_profile()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.reward_accounts (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function private.rewards_touch_account_updated_at() from public, anon, authenticated, service_role;
revoke all on function private.rewards_prevent_ledger_update() from public, anon, authenticated, service_role;
revoke all on function private.rewards_create_account_for_profile() from public, anon, authenticated, service_role;

drop trigger if exists reward_accounts_touch_updated_at_trg on public.reward_accounts;
create trigger reward_accounts_touch_updated_at_trg
before update on public.reward_accounts
for each row execute function private.rewards_touch_account_updated_at();

drop trigger if exists reward_ledger_immutable_update_trg on public.reward_ledger_entries;
create trigger reward_ledger_immutable_update_trg
before update on public.reward_ledger_entries
for each row execute function private.rewards_prevent_ledger_update();

drop trigger if exists reward_account_on_profile_created on public.profiles;
create trigger reward_account_on_profile_created
after insert on public.profiles
for each row execute function private.rewards_create_account_for_profile();

-- Existing CTG One identities receive an empty foundation account only.
-- No points are seeded and no earning rule is inferred from historic activity.
insert into public.reward_accounts (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

alter table public.reward_accounts enable row level security;
alter table public.reward_ledger_entries enable row level security;

revoke all on table public.reward_accounts from public, anon, authenticated, service_role;
revoke all on table public.reward_ledger_entries from public, anon, authenticated, service_role;

grant select on table public.reward_accounts to authenticated;
grant select on table public.reward_ledger_entries to authenticated;

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
