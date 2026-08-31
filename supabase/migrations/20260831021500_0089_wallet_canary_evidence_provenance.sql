-- CTG One Wallet — Canary evidence provenance V1
--
-- Adds an append-only server observation journal for Polygon reconciliation.
-- This migration is observational only: it does not authorize, sign, broadcast,
-- post COP journal entries, mutate balances or alter transaction amounts.

create table if not exists public.wallet_chain_reconciliation_observations_v1 (
  id bigint generated always as identity primary key,
  intent_id uuid not null references public.wallet_intents_v2(id) on delete restrict,
  tx_hash text not null,
  observation_status text not null,
  evidence_digest_sha256 text not null,
  chain_observed boolean not null,
  block_number bigint,
  confirmations bigint,
  failure_code text,
  checked_at timestamptz not null,
  captured_at timestamptz not null default clock_timestamp(),
  constraint wallet_chain_reconciliation_observations_v1_tx_hash_check
    check (tx_hash ~ '^0x[0-9a-f]{64}$'),
  constraint wallet_chain_reconciliation_observations_v1_status_check
    check (observation_status in ('pending_external','confirmed_external','reconciled','failed')),
  constraint wallet_chain_reconciliation_observations_v1_digest_check
    check (evidence_digest_sha256 ~ '^[0-9a-f]{64}$'),
  constraint wallet_chain_reconciliation_observations_v1_block_check
    check (block_number is null or block_number > 0),
  constraint wallet_chain_reconciliation_observations_v1_confirmations_check
    check (confirmations is null or confirmations >= 0),
  constraint wallet_chain_reconciliation_observations_v1_failure_check
    check (failure_code is null or failure_code ~ '^WALLET_CHAIN_[A-Z0-9_]{3,96}$'),
  constraint wallet_chain_reconciliation_observations_v1_confirmed_shape_check
    check (
      observation_status not in ('confirmed_external','reconciled')
      or (
        chain_observed = true
        and block_number is not null
        and confirmations is not null
        and confirmations >= 1
        and failure_code is null
      )
    ),
  constraint wallet_chain_reconciliation_observations_v1_failed_shape_check
    check (observation_status <> 'failed' or failure_code is not null)
);

create index if not exists wallet_chain_reconciliation_observations_v1_intent_sequence_idx
  on public.wallet_chain_reconciliation_observations_v1(intent_id, id);

alter table public.wallet_chain_reconciliation_observations_v1 enable row level security;

revoke all on table public.wallet_chain_reconciliation_observations_v1
  from public, anon, authenticated;
revoke all on sequence public.wallet_chain_reconciliation_observations_v1_id_seq
  from public, anon, authenticated;

-- The server evidence route reads through the service role. Reconciliation
-- insertion itself is performed by the trigger while the existing reviewed
-- server-only reconciliation RPC updates wallet_intents_v2.
grant select on table public.wallet_chain_reconciliation_observations_v1 to service_role;
revoke insert, update, delete, truncate on table public.wallet_chain_reconciliation_observations_v1
  from service_role;

comment on table public.wallet_chain_reconciliation_observations_v1 is
  'Append-only trusted Polygon reconciliation observations used to prove canary progression. Never a balance or settlement authority.';
comment on column public.wallet_chain_reconciliation_observations_v1.evidence_digest_sha256 is
  'Server-generated SHA-256 digest from the trusted Polygon reconciliation adapter for this specific observation.';

create or replace function public.capture_wallet_chain_reconciliation_observation_v1()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.chain_last_checked_at is distinct from old.chain_last_checked_at
     and new.chain_last_checked_at is not null
     and new.tx_hash is not null
     and new.chain_reconciliation_digest_sha256 is not null
     and new.status in ('pending_external','confirmed_external','reconciled','failed') then
    insert into public.wallet_chain_reconciliation_observations_v1(
      intent_id,
      tx_hash,
      observation_status,
      evidence_digest_sha256,
      chain_observed,
      block_number,
      confirmations,
      failure_code,
      checked_at
    ) values (
      new.id,
      lower(new.tx_hash),
      new.status,
      lower(new.chain_reconciliation_digest_sha256),
      new.chain_observed_at is not null,
      new.chain_block_number,
      new.chain_confirmations,
      new.chain_failure_code,
      new.chain_last_checked_at
    );
  end if;

  return new;
end;
$$;

revoke all on function public.capture_wallet_chain_reconciliation_observation_v1()
  from public, anon, authenticated;

drop trigger if exists wallet_intents_v2_capture_chain_observation_v1
  on public.wallet_intents_v2;
create trigger wallet_intents_v2_capture_chain_observation_v1
after update of
  status,
  chain_last_checked_at,
  chain_observed_at,
  chain_confirmed_at,
  chain_block_number,
  chain_confirmations,
  chain_reconciliation_digest_sha256,
  chain_failure_code
on public.wallet_intents_v2
for each row
when (new.chain_last_checked_at is distinct from old.chain_last_checked_at)
execute function public.capture_wallet_chain_reconciliation_observation_v1();

-- Immutable through application/service roles. PostgreSQL ownership remains the
-- emergency administrative boundary; ordinary server paths can only append via
-- the existing reconciliation RPC -> trigger path and read the resulting journal.
