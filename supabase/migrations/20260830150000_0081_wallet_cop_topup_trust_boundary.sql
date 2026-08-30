-- CTG One Wallet — COP top-up claim + independent reconciliation boundary
--
-- Financial safety boundary
--   * a user-submitted proof is a CLAIM, never money;
--   * browsers can no longer INSERT public.transactions directly;
--   * only the server-side service-role submission RPC can create a pending claim;
--   * an authenticated admin verifies the bank evidence;
--   * a DIFFERENT authenticated admin reconciles the verified claim;
--   * public.wallets.balance_cents remains the authoritative COP balance;
--   * Wallet V2 journal authority remains disabled. The existing shadow trigger
--     observes the final legacy balance update without becoming authoritative.

create table public.wallet_topup_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  transaction_id uuid not null unique references public.transactions(id) on delete restrict,
  rail text not null check (rail in ('bank_transfer', 'bre_b_qr')),
  amount_cents bigint not null check (amount_cents > 0),
  external_reference text not null,
  normalized_reference text not null,
  proof_storage_path text not null,
  proof_sha256 text not null check (proof_sha256 ~ '^[0-9a-f]{64}$'),
  proof_original_name text,
  proof_mime text not null check (proof_mime in ('image/jpeg','image/png','image/webp','application/pdf')),
  idempotency_key text not null unique check (idempotency_key ~ '^[0-9a-f]{64}$'),
  state text not null default 'submitted'
    check (state in ('submitted','verified','rejected','reconciled')),
  verification_notes text,
  verified_by uuid references public.profiles(id) on delete restrict,
  verified_at timestamptz,
  rejected_by uuid references public.profiles(id) on delete restrict,
  rejected_at timestamptz,
  rejection_reason text,
  reconciled_by uuid references public.profiles(id) on delete restrict,
  reconciled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wallet_topup_claims_verified_shape check (
    (state not in ('verified','reconciled'))
    or (verified_by is not null and verified_at is not null)
  ),
  constraint wallet_topup_claims_rejected_shape check (
    state <> 'rejected'
    or (rejected_by is not null and rejected_at is not null and rejection_reason is not null)
  ),
  constraint wallet_topup_claims_reconciled_shape check (
    state <> 'reconciled'
    or (reconciled_by is not null and reconciled_at is not null)
  )
);

comment on table public.wallet_topup_claims is
  'User COP top-up evidence. A row is only a claim until independent verification and reconciliation credit the authoritative legacy wallet.';

create unique index wallet_topup_claims_rail_reference_unique
  on public.wallet_topup_claims(rail, normalized_reference);
create index wallet_topup_claims_user_created_idx
  on public.wallet_topup_claims(user_id, created_at desc);
create index wallet_topup_claims_state_created_idx
  on public.wallet_topup_claims(state, created_at);

alter table public.wallet_topup_claims enable row level security;
create policy wallet_topup_claims_read_own_or_admin
  on public.wallet_topup_claims
  for select
  to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

revoke all on public.wallet_topup_claims from public, anon, authenticated, service_role;
grant select on public.wallet_topup_claims to authenticated, service_role;

-- Stop the legacy browser-authoritative request path. Reads remain unchanged.
drop policy if exists transactions_insert on public.transactions;
revoke insert on public.transactions from authenticated;

create or replace function public.normalize_wallet_topup_reference(p_reference text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(upper(btrim(coalesce(p_reference, ''))), '[^A-Z0-9]', '', 'g');
$$;

revoke all on function public.normalize_wallet_topup_reference(text)
  from public, anon, authenticated, service_role;

-- Server-only submission. The caller supplies a canonical authenticated user id
-- after the Route Handler independently authenticated the browser session.
create or replace function public.submit_wallet_topup_claim_server(
  p_user_id uuid,
  p_rail text,
  p_amount_cents bigint,
  p_external_reference text,
  p_proof_storage_path text,
  p_proof_sha256 text,
  p_original_name text,
  p_mime text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype;
  v_normalized_reference text;
  v_existing public.wallet_topup_claims%rowtype;
  v_transaction_id uuid;
  v_claim_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'WALLET_TOPUP_SERVER_ROLE_REQUIRED';
  end if;

  if p_user_id is null then raise exception 'WALLET_TOPUP_USER_REQUIRED'; end if;
  if p_rail not in ('bank_transfer','bre_b_qr') then raise exception 'WALLET_TOPUP_RAIL_INVALID'; end if;
  if p_amount_cents is null or p_amount_cents <= 0 then raise exception 'WALLET_TOPUP_AMOUNT_INVALID'; end if;
  if p_mime not in ('image/jpeg','image/png','image/webp','application/pdf') then raise exception 'WALLET_TOPUP_MIME_INVALID'; end if;
  if coalesce(p_proof_sha256, '') !~ '^[0-9a-f]{64}$' then raise exception 'WALLET_TOPUP_PROOF_HASH_INVALID'; end if;
  if coalesce(p_idempotency_key, '') !~ '^[0-9a-f]{64}$' then raise exception 'WALLET_TOPUP_IDEMPOTENCY_INVALID'; end if;
  if p_proof_storage_path is null
     or left(p_proof_storage_path, length(p_user_id::text || '/wallet-topups/')) <> p_user_id::text || '/wallet-topups/' then
    raise exception 'WALLET_TOPUP_STORAGE_PATH_INVALID';
  end if;

  v_normalized_reference := public.normalize_wallet_topup_reference(p_external_reference);
  if length(v_normalized_reference) < 4 then
    raise exception 'WALLET_TOPUP_REFERENCE_INVALID';
  end if;

  -- Serialize exact retries before checking idempotency so concurrent requests
  -- cannot create an orphan pending transaction.
  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key, 0));

  select c.* into v_existing
  from public.wallet_topup_claims c
  where c.idempotency_key = p_idempotency_key;

  if v_existing.id is not null then
    if v_existing.user_id <> p_user_id
       or v_existing.rail <> p_rail
       or v_existing.amount_cents <> p_amount_cents
       or v_existing.normalized_reference <> v_normalized_reference
       or v_existing.proof_sha256 <> p_proof_sha256 then
      raise exception 'WALLET_TOPUP_IDEMPOTENCY_CONFLICT';
    end if;

    return jsonb_build_object(
      'claimId', v_existing.id,
      'transactionId', v_existing.transaction_id,
      'state', v_existing.state,
      'idempotentReplay', true
    );
  end if;

  select p.* into v_profile
  from public.profiles p
  where p.id = p_user_id;

  if v_profile.id is null then raise exception 'WALLET_TOPUP_USER_NOT_FOUND'; end if;
  if v_profile.kyc_status <> 'verified' then raise exception 'WALLET_TOPUP_KYC_REQUIRED'; end if;

  insert into public.transactions(
    user_id,
    type,
    method,
    amount_cents,
    status,
    proof_storage_path,
    external_reference
  ) values (
    p_user_id,
    'deposit',
    p_rail,
    p_amount_cents,
    'pending',
    p_proof_storage_path,
    v_normalized_reference
  ) returning id into v_transaction_id;

  insert into public.wallet_topup_claims(
    user_id,
    transaction_id,
    rail,
    amount_cents,
    external_reference,
    normalized_reference,
    proof_storage_path,
    proof_sha256,
    proof_original_name,
    proof_mime,
    idempotency_key
  ) values (
    p_user_id,
    v_transaction_id,
    p_rail,
    p_amount_cents,
    btrim(p_external_reference),
    v_normalized_reference,
    p_proof_storage_path,
    p_proof_sha256,
    nullif(left(btrim(coalesce(p_original_name, '')), 180), ''),
    p_mime,
    p_idempotency_key
  ) returning id into v_claim_id;

  return jsonb_build_object(
    'claimId', v_claim_id,
    'transactionId', v_transaction_id,
    'state', 'submitted',
    'idempotentReplay', false
  );
end;
$$;

revoke all on function public.submit_wallet_topup_claim_server(uuid,text,bigint,text,text,text,text,text,text)
  from public, anon, authenticated, service_role;
grant execute on function public.submit_wallet_topup_claim_server(uuid,text,bigint,text,text,text,text,text,text)
  to service_role;

-- First human control: verify the bank/Bre-B evidence without crediting money.
create or replace function public.verify_wallet_topup_claim(
  p_claim_id uuid,
  p_verification_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_claim public.wallet_topup_claims%rowtype;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;

  select c.* into v_claim
  from public.wallet_topup_claims c
  where c.id = p_claim_id
  for update;

  if v_claim.id is null then raise exception 'WALLET_TOPUP_CLAIM_NOT_FOUND'; end if;
  if v_claim.state = 'verified' then
    return jsonb_build_object('claimId', v_claim.id, 'state', v_claim.state, 'idempotentReplay', true);
  end if;
  if v_claim.state <> 'submitted' then
    raise exception 'WALLET_TOPUP_CLAIM_STATE_%', upper(v_claim.state);
  end if;

  update public.wallet_topup_claims
  set state = 'verified',
      verification_notes = nullif(btrim(coalesce(p_verification_notes, '')), ''),
      verified_by = auth.uid(),
      verified_at = now(),
      updated_at = now()
  where id = p_claim_id;

  insert into public.admin_audit_log(admin_id, action, target_table, target_id, details)
  values (
    auth.uid(),
    'verify_wallet_topup_claim',
    'wallet_topup_claims',
    p_claim_id,
    jsonb_build_object(
      'transaction_id', v_claim.transaction_id,
      'amount_cents', v_claim.amount_cents,
      'rail', v_claim.rail,
      'normalized_reference', v_claim.normalized_reference
    )
  );

  return jsonb_build_object('claimId', p_claim_id, 'state', 'verified', 'idempotentReplay', false);
end;
$$;

-- Second human control: a different admin reconciles and only then credits COP.
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
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;

  select c.* into v_claim
  from public.wallet_topup_claims c
  where c.id = p_claim_id
  for update;

  if v_claim.id is null then raise exception 'WALLET_TOPUP_CLAIM_NOT_FOUND'; end if;
  if v_claim.state = 'reconciled' then
    return jsonb_build_object('claimId', v_claim.id, 'transactionId', v_claim.transaction_id, 'state', v_claim.state, 'idempotentReplay', true);
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

  update public.transactions
  set status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      admin_notes = coalesce(nullif(btrim(coalesce(p_admin_notes, '')), ''), admin_notes)
  where id = v_tx.id;

  update public.wallets
  set balance_cents = balance_cents + v_claim.amount_cents,
      updated_at = now()
  where id = v_wallet.id;

  update public.wallet_topup_claims
  set state = 'reconciled',
      reconciled_by = auth.uid(),
      reconciled_at = now(),
      updated_at = now()
  where id = p_claim_id;

  insert into public.admin_audit_log(admin_id, action, target_table, target_id, details)
  values (
    auth.uid(),
    'reconcile_wallet_topup_claim',
    'wallet_topup_claims',
    p_claim_id,
    jsonb_build_object(
      'transaction_id', v_tx.id,
      'wallet_id', v_wallet.id,
      'amount_cents', v_claim.amount_cents,
      'rail', v_claim.rail,
      'normalized_reference', v_claim.normalized_reference,
      'verified_by', v_claim.verified_by
    )
  );

  return jsonb_build_object(
    'claimId', p_claim_id,
    'transactionId', v_tx.id,
    'state', 'reconciled',
    'creditedCents', v_claim.amount_cents,
    'idempotentReplay', false
  );
end;
$$;

create or replace function public.reject_wallet_topup_claim(
  p_claim_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_claim public.wallet_topup_claims%rowtype;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  if length(btrim(coalesce(p_reason, ''))) < 3 then raise exception 'rejection reason required'; end if;

  select c.* into v_claim
  from public.wallet_topup_claims c
  where c.id = p_claim_id
  for update;

  if v_claim.id is null then raise exception 'WALLET_TOPUP_CLAIM_NOT_FOUND'; end if;
  if v_claim.state = 'rejected' then
    return jsonb_build_object('claimId', v_claim.id, 'state', v_claim.state, 'idempotentReplay', true);
  end if;
  if v_claim.state = 'reconciled' then raise exception 'WALLET_TOPUP_ALREADY_RECONCILED'; end if;

  update public.wallet_topup_claims
  set state = 'rejected',
      rejected_by = auth.uid(),
      rejected_at = now(),
      rejection_reason = btrim(p_reason),
      updated_at = now()
  where id = p_claim_id;

  update public.transactions
  set status = 'rejected',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      admin_notes = coalesce(admin_notes, btrim(p_reason))
  where id = v_claim.transaction_id and status = 'pending';

  insert into public.admin_audit_log(admin_id, action, target_table, target_id, details)
  values (
    auth.uid(),
    'reject_wallet_topup_claim',
    'wallet_topup_claims',
    p_claim_id,
    jsonb_build_object('transaction_id', v_claim.transaction_id, 'reason', btrim(p_reason))
  );

  return jsonb_build_object('claimId', p_claim_id, 'state', 'rejected', 'idempotentReplay', false);
end;
$$;

revoke all on function public.verify_wallet_topup_claim(uuid,text) from public, anon, authenticated, service_role;
revoke all on function public.reconcile_wallet_topup_claim(uuid,text) from public, anon, authenticated, service_role;
revoke all on function public.reject_wallet_topup_claim(uuid,text) from public, anon, authenticated, service_role;
grant execute on function public.verify_wallet_topup_claim(uuid,text) to authenticated;
grant execute on function public.reconcile_wallet_topup_claim(uuid,text) to authenticated;
grant execute on function public.reject_wallet_topup_claim(uuid,text) to authenticated;

-- Preserve the legacy RPC signature used by existing admin surfaces, but remove
-- its historical ability to credit an arbitrary pending transaction. It now
-- delegates to the independently verified claim reconciliation gate.
create or replace function public.approve_deposit(p_transaction_id uuid, p_admin_notes text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_claim_id uuid;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;

  select c.id into v_claim_id
  from public.wallet_topup_claims c
  where c.transaction_id = p_transaction_id;

  if v_claim_id is null then
    raise exception 'WALLET_TOPUP_CLAIM_REQUIRED';
  end if;

  perform public.reconcile_wallet_topup_claim(v_claim_id, p_admin_notes);
end;
$$;

revoke all on function public.approve_deposit(uuid,text) from public, anon, authenticated, service_role;
grant execute on function public.approve_deposit(uuid,text) to authenticated;

comment on function public.approve_deposit(uuid,text) is
  'Compatibility wrapper only. A pending transaction cannot credit COP unless its wallet_topup_claim was independently verified first.';