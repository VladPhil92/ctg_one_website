-- CTG One Wallet — canonical identity bridge foundation
--
-- This migration does NOT create or replace blockchain wallets and does not
-- enable money movement. It establishes the database contract needed to link
-- the canonical CTG identity (profiles.id / auth.users.id) to an external wallet
-- provider identity and its blockchain accounts without making either writable
-- by an authenticated browser client.

-- ---------------------------------------------------------------------------
-- External wallet-provider identities
-- ---------------------------------------------------------------------------
create table public.wallet_identity_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('privy')),
  provider_user_id text not null check (length(trim(provider_user_id)) between 3 and 255),
  status text not null default 'pending'
    check (status in ('pending','verified','revoked')),
  link_mode text not null default 'new'
    check (link_mode in ('new','legacy_preserve')),
  linked_at timestamptz,
  verified_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wallet_identity_links_user_provider_unique unique (user_id, provider),
  constraint wallet_identity_links_provider_user_unique unique (provider, provider_user_id),
  constraint wallet_identity_links_status_timestamps_check check (
    (status = 'pending' and verified_at is null and revoked_at is null)
    or (status = 'verified' and verified_at is not null and revoked_at is null)
    or (status = 'revoked' and revoked_at is not null)
  )
);

comment on table public.wallet_identity_links is
  'Trusted mapping from canonical CTG user identity to an external wallet-provider identity. Browser clients may read their own row but cannot create, verify, replace or revoke links directly.';
comment on column public.wallet_identity_links.user_id is
  'Canonical CTG identity. This remains profiles.id/auth.users.id; provider identities never replace it.';
comment on column public.wallet_identity_links.link_mode is
  'legacy_preserve means an existing provider identity/wallet must be preserved during migration rather than silently replaced.';

create index wallet_identity_links_user_status_idx
  on public.wallet_identity_links(user_id, status);

alter table public.wallet_identity_links enable row level security;

create policy wallet_identity_links_read_own
  on public.wallet_identity_links
  for select
  to authenticated
  using (user_id = auth.uid());

revoke all on public.wallet_identity_links from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.wallet_identity_links from authenticated;
grant select on public.wallet_identity_links to authenticated;

-- ---------------------------------------------------------------------------
-- Blockchain accounts attached to the canonical CTG identity
-- ---------------------------------------------------------------------------
create table public.wallet_external_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  identity_link_id uuid references public.wallet_identity_links(id) on delete restrict,
  provider text not null check (provider in ('privy','external')),
  chain_family text not null check (chain_family in ('evm','bitcoin')),
  account_kind text not null check (account_kind in ('embedded','external','watch_only')),
  address text not null check (length(trim(address)) between 3 and 128),
  address_normalized text generated always as (
    case
      when chain_family = 'evm' then lower(trim(address))
      else trim(address)
    end
  ) stored,
  status text not null default 'pending'
    check (status in ('pending','verified','revoked')),
  is_primary boolean not null default false,
  legacy_preserved boolean not null default false,
  verified_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wallet_external_accounts_evm_address_check check (
    chain_family <> 'evm' or trim(address) ~* '^0x[0-9a-f]{40}$'
  ),
  constraint wallet_external_accounts_provider_link_check check (
    provider <> 'privy' or identity_link_id is not null
  ),
  constraint wallet_external_accounts_embedded_provider_check check (
    account_kind <> 'embedded' or provider = 'privy'
  ),
  constraint wallet_external_accounts_status_timestamps_check check (
    (status = 'pending' and verified_at is null and revoked_at is null)
    or (status = 'verified' and verified_at is not null and revoked_at is null)
    or (status = 'revoked' and revoked_at is not null)
  ),
  constraint wallet_external_accounts_chain_address_unique
    unique (chain_family, address_normalized)
);

comment on table public.wallet_external_accounts is
  'Blockchain account registry attached to the canonical CTG user. Chain state remains authoritative for crypto balances; this table records verified ownership/association and migration provenance.';
comment on column public.wallet_external_accounts.address_normalized is
  'EVM addresses normalize to lowercase for uniqueness; non-EVM addresses retain case because some formats are case-sensitive.';
comment on column public.wallet_external_accounts.legacy_preserved is
  'True only when the account address existed before CTG One Wallet unification and was explicitly preserved during the legacy migration.';

create index wallet_external_accounts_user_status_idx
  on public.wallet_external_accounts(user_id, status);
create index wallet_external_accounts_identity_link_idx
  on public.wallet_external_accounts(identity_link_id)
  where identity_link_id is not null;
create unique index wallet_external_accounts_one_primary_per_family
  on public.wallet_external_accounts(user_id, chain_family)
  where is_primary is true and status <> 'revoked';

alter table public.wallet_external_accounts enable row level security;

create policy wallet_external_accounts_read_own
  on public.wallet_external_accounts
  for select
  to authenticated
  using (user_id = auth.uid());

revoke all on public.wallet_external_accounts from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.wallet_external_accounts from authenticated;
grant select on public.wallet_external_accounts to authenticated;

-- No SECURITY DEFINER linking function is introduced here intentionally.
-- The next phase must verify both the Supabase session and the external provider
-- identity at a trusted server boundary before the service role writes either
-- table. Until then this schema remains read-only to authenticated users.
