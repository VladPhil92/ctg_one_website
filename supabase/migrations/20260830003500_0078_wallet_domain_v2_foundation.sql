-- CTG One Wallet — Wallet Domain V2 foundation
--
-- This migration introduces a canonical internal wallet domain without changing
-- the authoritative COP balance path. public.wallets.balance_cents remains the
-- compatibility source of truth until a later, separately reviewed migration
-- establishes opening journal balances and enables trusted posting.
--
-- Safety boundary:
--   * no authenticated client can mutate V2 accounts, intents, journal rows or
--     transaction references;
--   * service_role receives read access only in this foundation slice;
--   * no journal posting RPC exists yet, so the new journal cannot move money;
--   * existing approve_deposit()/wallets.balance_cents behavior is unchanged.

-- ---------------------------------------------------------------------------
-- Canonical internal accounts
-- ---------------------------------------------------------------------------
create table public.wallet_accounts_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete restrict,
  account_code text not null check (
    account_code = upper(account_code)
    and account_code ~ '^[A-Z0-9_]{3,64}$'
  ),
  account_kind text not null check (
    account_kind in (
      'user_available',
      'user_pending',
      'system_clearing',
      'system_adjustment'
    )
  ),
  currency text not null default 'COP' check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'active' check (status in ('active','frozen','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wallet_accounts_v2_owner_kind_check check (
    (account_kind like 'user_%' and user_id is not null)
    or (account_kind like 'system_%' and user_id is null)
  )
);

comment on table public.wallet_accounts_v2 is
  'Canonical CTG One internal account registry. Account existence is structural; balances remain sourced from public.wallets until an opening-balance/journal cutover is explicitly enabled.';
comment on column public.wallet_accounts_v2.user_id is
  'Canonical profiles.id owner for user accounts. NULL is reserved for CTG system accounts.';

create unique index wallet_accounts_v2_user_code_unique
  on public.wallet_accounts_v2(user_id, account_code)
  where user_id is not null;
create unique index wallet_accounts_v2_system_code_unique
  on public.wallet_accounts_v2(account_code)
  where user_id is null;
create unique index wallet_accounts_v2_one_available_per_currency
  on public.wallet_accounts_v2(user_id, currency)
  where user_id is not null and account_kind = 'user_available' and status <> 'closed';

alter table public.wallet_accounts_v2 enable row level security;
create policy wallet_accounts_v2_read_own
  on public.wallet_accounts_v2
  for select
  to authenticated
  using (user_id = auth.uid());

revoke all on public.wallet_accounts_v2 from public, anon, authenticated, service_role;
grant select on public.wallet_accounts_v2 to authenticated, service_role;

-- Existing users receive one structural COP available account. This does not
-- copy or reinterpret their money: the compatibility view below continues to
-- read the authoritative balance from public.wallets.
insert into public.wallet_accounts_v2(user_id, account_code, account_kind, currency)
select w.user_id, 'COP_AVAILABLE', 'user_available', w.currency
from public.wallets w
on conflict do nothing;

-- Reserve a system-side account identity for future balanced journal posting.
-- It is not a bank balance and cannot currently be posted to by any API role.
insert into public.wallet_accounts_v2(user_id, account_code, account_kind, currency)
values (null, 'COP_EXTERNAL_CLEARING', 'system_clearing', 'COP')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Idempotent wallet intents
-- ---------------------------------------------------------------------------
create table public.wallet_intents_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  intent_type text not null check (intent_type ~ '^[a-z][a-z0-9_.-]{2,63}$'),
  idempotency_key text not null check (length(trim(idempotency_key)) between 8 and 128),
  idempotency_key_normalized text generated always as (lower(trim(idempotency_key))) stored,
  status text not null default 'created' check (
    status in ('created','authorized','submitted','reconciled','failed','cancelled')
  ),
  currency text not null default 'COP' check (currency ~ '^[A-Z]{3}$'),
  amount_cents bigint check (amount_cents is null or amount_cents > 0),
  external_reference text,
  metadata jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wallet_intents_v2_user_idempotency_unique
    unique (user_id, idempotency_key_normalized)
);

comment on table public.wallet_intents_v2 is
  'Server-created idempotent wallet action intents. Foundation is read-only to API roles; trusted creation/authorization is introduced separately before money movement.';

create index wallet_intents_v2_user_created_idx
  on public.wallet_intents_v2(user_id, created_at desc);
create index wallet_intents_v2_status_idx
  on public.wallet_intents_v2(status, created_at);

alter table public.wallet_intents_v2 enable row level security;
create policy wallet_intents_v2_read_own
  on public.wallet_intents_v2
  for select
  to authenticated
  using (user_id = auth.uid());

revoke all on public.wallet_intents_v2 from public, anon, authenticated, service_role;
grant select on public.wallet_intents_v2 to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Append-only journal schema (posting deliberately disabled in this slice)
-- ---------------------------------------------------------------------------
create table public.wallet_journal_entries_v2 (
  id uuid primary key default gen_random_uuid(),
  subject_user_id uuid references public.profiles(id) on delete restrict,
  intent_id uuid references public.wallet_intents_v2(id) on delete restrict,
  event_type text not null check (event_type ~ '^[a-z][a-z0-9_.-]{2,63}$'),
  status text not null default 'staged' check (status in ('staged','posted','reversed')),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  idempotency_key text not null check (length(trim(idempotency_key)) between 8 and 128),
  idempotency_key_normalized text generated always as (lower(trim(idempotency_key))) stored,
  source_type text,
  source_id uuid,
  external_reference text,
  occurred_at timestamptz not null default now(),
  posted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint wallet_journal_entries_v2_posted_timestamp_check check (
    (status = 'staged' and posted_at is null)
    or (status in ('posted','reversed') and posted_at is not null)
  ),
  constraint wallet_journal_entries_v2_idempotency_unique
    unique (idempotency_key_normalized)
);

comment on table public.wallet_journal_entries_v2 is
  'Append-only double-entry journal header. No posting RPC is exposed by migration 0078; rows remain empty until an opening-balance and trusted-posting cutover is separately approved.';

create index wallet_journal_entries_v2_subject_idx
  on public.wallet_journal_entries_v2(subject_user_id, occurred_at desc)
  where subject_user_id is not null;
create index wallet_journal_entries_v2_intent_idx
  on public.wallet_journal_entries_v2(intent_id)
  where intent_id is not null;

alter table public.wallet_journal_entries_v2 enable row level security;
create policy wallet_journal_entries_v2_read_own
  on public.wallet_journal_entries_v2
  for select
  to authenticated
  using (subject_user_id = auth.uid());

revoke all on public.wallet_journal_entries_v2 from public, anon, authenticated, service_role;
grant select on public.wallet_journal_entries_v2 to authenticated, service_role;

create table public.wallet_journal_postings_v2 (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.wallet_journal_entries_v2(id) on delete restrict,
  account_id uuid not null references public.wallet_accounts_v2(id) on delete restrict,
  amount_cents bigint not null check (amount_cents <> 0),
  memo text,
  created_at timestamptz not null default now(),
  constraint wallet_journal_postings_v2_entry_account_unique unique (entry_id, account_id)
);

comment on table public.wallet_journal_postings_v2 is
  'Signed journal postings. Positive/negative sign is a ledger delta, not a client-editable balance. Direct API writes are disabled in the foundation slice.';

create index wallet_journal_postings_v2_account_idx
  on public.wallet_journal_postings_v2(account_id, created_at desc);

alter table public.wallet_journal_postings_v2 enable row level security;
create policy wallet_journal_postings_v2_read_own
  on public.wallet_journal_postings_v2
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.wallet_journal_entries_v2 e
      where e.id = entry_id and e.subject_user_id = auth.uid()
    )
  );

revoke all on public.wallet_journal_postings_v2 from public, anon, authenticated, service_role;
grant select on public.wallet_journal_postings_v2 to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Unified external/internal reference registry
-- ---------------------------------------------------------------------------
create table public.wallet_transaction_references_v2 (
  id uuid primary key default gen_random_uuid(),
  subject_user_id uuid references public.profiles(id) on delete restrict,
  intent_id uuid references public.wallet_intents_v2(id) on delete restrict,
  journal_entry_id uuid references public.wallet_journal_entries_v2(id) on delete restrict,
  authority text not null check (
    authority in ('ctg-ledger','bank','bre_b','blockchain','investment')
  ),
  reference_kind text not null check (reference_kind ~ '^[a-z][a-z0-9_.-]{2,63}$'),
  reference_value text not null check (length(trim(reference_value)) between 1 and 255),
  reference_normalized text generated always as (lower(trim(reference_value))) stored,
  created_at timestamptz not null default now(),
  constraint wallet_transaction_references_v2_authority_unique
    unique (authority, reference_kind, reference_normalized)
);

comment on table public.wallet_transaction_references_v2 is
  'Canonical idempotency/reference registry across CTG ledger, bank/Bre-B, blockchain and Investment rails. Direct API writes are disabled until trusted reconciliation adapters adopt it.';

create index wallet_transaction_references_v2_subject_idx
  on public.wallet_transaction_references_v2(subject_user_id, created_at desc)
  where subject_user_id is not null;

alter table public.wallet_transaction_references_v2 enable row level security;
create policy wallet_transaction_references_v2_read_own
  on public.wallet_transaction_references_v2
  for select
  to authenticated
  using (subject_user_id = auth.uid());

revoke all on public.wallet_transaction_references_v2 from public, anon, authenticated, service_role;
grant select on public.wallet_transaction_references_v2 to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Compatibility projection: legacy COP balance remains authoritative
-- ---------------------------------------------------------------------------
create view public.wallet_balance_compatibility_v2
with (security_invoker = true)
as
select
  a.id as account_id,
  a.user_id,
  w.id as legacy_wallet_id,
  w.currency,
  w.balance_cents as available_balance_cents,
  'legacy_wallets'::text as balance_authority,
  false as journal_posting_enabled,
  w.updated_at as balance_updated_at
from public.wallet_accounts_v2 a
join public.wallets w
  on w.user_id = a.user_id and w.currency = a.currency
where a.account_kind = 'user_available'
  and a.status <> 'closed';

comment on view public.wallet_balance_compatibility_v2 is
  'Transition read model for Wallet Domain V2. available_balance_cents still comes from public.wallets; journal posting is deliberately disabled.';

revoke all on public.wallet_balance_compatibility_v2 from public, anon, authenticated, service_role;
grant select on public.wallet_balance_compatibility_v2 to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Ensure future CTG users receive the V2 structural account atomically with
-- their legacy wallet. No monetary journal rows are created here.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone'
  );

  insert into public.wallets (user_id) values (new.id);

  insert into public.wallet_accounts_v2(user_id, account_code, account_kind, currency)
  values (new.id, 'COP_AVAILABLE', 'user_available', 'COP');

  return new;
end;
$$;

-- Keep the trigger function itself outside browser execution. PostgreSQL invokes
-- it as a trigger; clients never need RPC access to it.
revoke all on function public.handle_new_user() from public, anon, authenticated, service_role;
