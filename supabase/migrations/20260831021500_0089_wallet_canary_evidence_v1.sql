-- CTG One Wallet — Canary Evidence V1
--
-- This migration makes first-real-send evidence durable and independently
-- auditable without changing signing, broadcast, reconciliation or COP ledger
-- authority.
--
-- Boundary:
--   * the reviewed server may bind one CTG-Wallet client commit to an already
--     authorized intent before the signer is obtained;
--   * every successful non-replayed reconciliation update is copied into an
--     append-only observation log by a database trigger;
--   * neither mechanism signs, broadcasts, derives chain truth, posts financial
--     journal entries or changes wallet balances.

alter table public.wallet_intents_v2
  add column if not exists canary_client_commit_sha text,
  add column if not exists canary_client_bound_at timestamptz;

alter table public.wallet_intents_v2
  add constraint wallet_intents_v2_canary_client_commit_check check (
    canary_client_commit_sha is null
    or canary_client_commit_sha ~ '^[0-9a-f]{40}$'
  ),
  add constraint wallet_intents_v2_canary_client_binding_check check (
    (canary_client_commit_sha is null and canary_client_bound_at is null)
    or (canary_client_commit_sha is not null and canary_client_bound_at is not null)
  );

comment on column public.wallet_intents_v2.canary_client_commit_sha is
  'Reviewed CTG-Wallet source commit bound server-side to this canary intent before signer access.';
comment on column public.wallet_intents_v2.canary_client_bound_at is
  'Server timestamp when the reviewed CTG-Wallet commit was first bound to this intent.';

create table if not exists public.wallet_chain_observations_v1 (
  id bigint generated always as identity primary key,
  intent_id uuid not null references public.wallet_intents_v2(id) on delete restrict,
  subject_user_id uuid not null references public.profiles(id) on delete restrict,
  tx_hash text not null,
  observation_status text not null,
  evidence_digest_sha256 text not null,
  chain_observed boolean not null,
  block_number bigint,
  confirmations bigint,
  failure_code text,
  recorded_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint wallet_chain_observations_v1_tx_hash_check check (
    tx_hash ~ '^0x[0-9a-f]{64}$'
  ),
  constraint wallet_chain_observations_v1_status_check check (
    observation_status in ('pending_external','confirmed_external','reconciled','failed')
  ),
  constraint wallet_chain_observations_v1_digest_check check (
    evidence_digest_sha256 ~ '^[0-9a-f]{64}$'
  ),
  constraint wallet_chain_observations_v1_block_check check (
    block_number is null or block_number > 0
  ),
  constraint wallet_chain_observations_v1_confirmations_check check (
    confirmations is null or confirmations >= 0
  ),
  constraint wallet_chain_observations_v1_failure_check check (
    failure_code is null or failure_code ~ '^WALLET_CHAIN_[A-Z0-9_]{3,96}$'
  ),
  constraint wallet_chain_observations_v1_status_evidence_check check (
    case observation_status
      when 'confirmed_external' then chain_observed and block_number is not null and confirmations is not null and confirmations >= 1 and failure_code is null
      when 'reconciled' then chain_observed and block_number is not null and confirmations is not null and confirmations >= 1 and failure_code is null
      when 'failed' then failure_code is not null
      else failure_code is null
    end
  ),
  constraint wallet_chain_observations_v1_intent_digest_unique unique (intent_id, evidence_digest_sha256)
);

create index if not exists wallet_chain_observations_v1_intent_timeline_idx
  on public.wallet_chain_observations_v1(intent_id, recorded_at, id);
create index if not exists wallet_chain_observations_v1_user_timeline_idx
  on public.wallet_chain_observations_v1(subject_user_id, recorded_at desc, id desc);

comment on table public.wallet_chain_observations_v1 is
  'Append-only trusted Polygon reconciliation observations captured from successful wallet_intents_v2 lifecycle updates.';

create or replace function public.capture_wallet_chain_observation_v1_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.chain_last_checked_at is not distinct from old.chain_last_checked_at then
    return new;
  end if;

  if new.status not in ('pending_external','confirmed_external','reconciled','failed')
     or new.tx_hash is null
     or new.chain_reconciliation_digest_sha256 is null then
    return new;
  end if;

  insert into public.wallet_chain_observations_v1(
    intent_id,
    subject_user_id,
    tx_hash,
    observation_status,
    evidence_digest_sha256,
    chain_observed,
    block_number,
    confirmations,
    failure_code,
    recorded_at
  ) values (
    new.id,
    new.user_id,
    lower(new.tx_hash),
    new.status,
    lower(new.chain_reconciliation_digest_sha256),
    new.chain_observed_at is not null,
    new.chain_block_number,
    new.chain_confirmations,
    new.chain_failure_code,
    new.chain_last_checked_at
  )
  on conflict on constraint wallet_chain_observations_v1_intent_digest_unique do nothing;

  return new;
end;
$$;

revoke all on function public.capture_wallet_chain_observation_v1_trigger()
  from public, anon, authenticated, service_role;

drop trigger if exists wallet_intents_v2_capture_chain_observation_v1 on public.wallet_intents_v2;
create trigger wallet_intents_v2_capture_chain_observation_v1
after update of chain_last_checked_at, chain_reconciliation_digest_sha256
on public.wallet_intents_v2
for each row
execute function public.capture_wallet_chain_observation_v1_trigger();

create or replace function public.bind_wallet_canary_client_v1_server(
  p_user_id uuid,
  p_intent_id uuid,
  p_client_commit_sha text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_commit text := lower(trim(coalesce(p_client_commit_sha, '')));
  v_intent public.wallet_intents_v2;
  v_now timestamptz := clock_timestamp();
  v_replayed boolean := false;
begin
  if p_user_id is null or not exists (
    select 1 from public.profiles p where p.id = p_user_id
  ) then
    raise exception 'WALLET_CANARY_CLIENT_USER_INVALID';
  end if;
  if p_intent_id is null then
    raise exception 'WALLET_CANARY_CLIENT_INTENT_ID_INVALID';
  end if;
  if v_commit !~ '^[0-9a-f]{40}$' then
    raise exception 'WALLET_CANARY_CLIENT_COMMIT_INVALID';
  end if;

  select * into v_intent
  from public.wallet_intents_v2
  where id = p_intent_id
  for update;

  if v_intent.id is null or v_intent.user_id is distinct from p_user_id then
    raise exception 'WALLET_CANARY_CLIENT_INTENT_NOT_FOUND';
  end if;
  if v_intent.status <> 'authorized'
     or v_intent.intent_type is distinct from 'crypto_send'
     or v_intent.rail is distinct from 'polygon'
     or v_intent.chain_id is distinct from 137
     or v_intent.authorized_at is null
     or v_intent.authorized_wallet_address is null
     or v_intent.simulation_digest_sha256 is null
     or v_intent.tx_hash is not null
     or v_intent.submitted_at is not null
     or v_intent.settled_at is not null then
    raise exception 'WALLET_CANARY_CLIENT_INTENT_NOT_BINDABLE';
  end if;

  if v_intent.canary_client_commit_sha is null then
    update public.wallet_intents_v2
    set canary_client_commit_sha = v_commit,
        canary_client_bound_at = v_now,
        updated_at = v_now,
        metadata = metadata || jsonb_build_object(
          'canaryClientProvenanceVersion', 'ctg-wallet-canary-client-v1'
        )
    where id = v_intent.id
    returning * into v_intent;
  elsif v_intent.canary_client_commit_sha = v_commit
        and v_intent.canary_client_bound_at is not null then
    v_replayed := true;
  else
    raise exception 'WALLET_CANARY_CLIENT_COMMIT_CONFLICT';
  end if;

  return jsonb_build_object(
    'version', 'ctg-wallet-canary-client-v1',
    'replayed', v_replayed,
    'intentId', v_intent.id,
    'clientCommitSha', v_intent.canary_client_commit_sha,
    'boundAt', v_intent.canary_client_bound_at
  );
end;
$$;

revoke all on function public.bind_wallet_canary_client_v1_server(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.bind_wallet_canary_client_v1_server(uuid, uuid, text)
  to service_role;

alter table public.wallet_chain_observations_v1 enable row level security;
revoke all on table public.wallet_chain_observations_v1
  from public, anon, authenticated;
revoke insert, update, delete on table public.wallet_chain_observations_v1
  from service_role;
grant select on table public.wallet_chain_observations_v1 to service_role;

-- Direct authoritative intent mutation remains blocked. The new provenance RPC
-- is service-role only and can bind metadata only while the intent is still
-- authorized and has no external transaction state.
revoke insert, update, delete on public.wallet_intents_v2
  from public, anon, authenticated, service_role;
