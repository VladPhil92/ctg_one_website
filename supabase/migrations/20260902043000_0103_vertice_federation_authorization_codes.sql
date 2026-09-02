-- CTG One ↔ VÉRTICE OS federation authorization-code store.
--
-- This table is intentionally server-only. Browser sessions never receive direct
-- table access; RLS remains enabled with no user policies. Codes are random,
-- persisted only as SHA-256 hashes, expire quickly, and are consumed once.

create table public.identity_federation_authorization_codes (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider = 'vertice'),
  subject_user_id uuid not null,
  subject_email text not null,
  subject_email_verified boolean not null default false,
  code_hash text not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
  code_challenge text not null check (code_challenge ~ '^[A-Za-z0-9_-]{43}$'),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);

create index identity_federation_authorization_codes_active_idx
  on public.identity_federation_authorization_codes (provider, expires_at)
  where consumed_at is null;

alter table public.identity_federation_authorization_codes enable row level security;

revoke all on table public.identity_federation_authorization_codes from anon, authenticated;

comment on table public.identity_federation_authorization_codes is
  'Server-only, short-lived OAuth-style authorization codes used for CTG One federation. Raw codes are never persisted.';
