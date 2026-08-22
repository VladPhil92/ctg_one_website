-- CTG Craft Beer Investment OS — manual crypto verification
--
-- Adds a second *manual* inbound rail alongside manual Bancolombia. This is the
-- deliberate policy change that `MANUAL_BANK_VERIFICATION.md` §Future provider
-- integration reserved: it does not introduce a payment provider, custody
-- service or automated confirmation. A participant transfers on-chain, submits
-- evidence, and Finance independently confirms the movement on a public block
-- explorer before any funding fact exists.
--
-- Deliberately NOT introduced: a `PENDING_CRYPTO_VERIFICATION` order status.
-- `PENDING_BANK_VERIFICATION` is the stage "participant evidence submitted,
-- awaiting independent human Finance verification". It is rail-agnostic in
-- meaning and retained under its historical name; the rail is discriminated by
-- `investment_orders.payment_method`, which `reconcile_investment_order_payment`
-- already validates against the receipt rail. A duplicate stage status would
-- have forked the reserved-capacity state list across every availability,
-- admin, operations-intelligence and liquidity read model.

-- ---------------------------------------------------------------------------
-- Manual verification metadata: widen to a second provider
-- ---------------------------------------------------------------------------
alter table public.investment_orders
  drop constraint investment_orders_manual_verification_consistency_check;

alter table public.investment_orders
  add column crypto_network text;

alter table public.investment_orders
  add constraint investment_orders_crypto_network_check
    check (crypto_network is null or crypto_network ~ '^[A-Z0-9_-]{2,40}$'),
  add constraint investment_orders_manual_verification_consistency_check
    check (
      (bank_verified_at is null and bank_verified_by is null and bank_verified_reference is null
        and bank_verified_amount_cents is null and bank_received_at is null
        and bank_verified_provider_code is null and crypto_network is null)
      or
      (bank_verified_at is not null and bank_verified_by is not null and bank_verified_reference is not null
        and bank_verified_amount_cents is not null and bank_received_at is not null
        and (
          (bank_verified_provider_code = 'BANCOLOMBIA_MANUAL' and crypto_network is null)
          or
          (bank_verified_provider_code = 'CRYPTO_MANUAL' and crypto_network is not null)
        ))
    );

comment on column public.investment_orders.crypto_network is
  'Chain on which Finance independently observed the movement. Set only for CRYPTO_MANUAL verifications; the participant never writes it.';

-- The 0039 normalized unique index is keyed by provider code, so CRYPTO_MANUAL
-- transaction hashes get their own uniqueness namespace with no new index.
-- Uppercasing a case-sensitive (base58) signature can only merge two distinct
-- references, never split one, so the control stays fail-closed.

-- ---------------------------------------------------------------------------
-- Participant evidence submission (trusted server boundary, mirrors 0038)
-- ---------------------------------------------------------------------------
create or replace function public.submit_investment_order_crypto_proof_server(
  p_participant_user_id uuid,
  p_order_id uuid,
  p_payment_proof_storage_path text,
  p_payment_proof_sha256 text,
  p_original_name text,
  p_mime text
)
returns public.investment_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.investment_orders;
  v_path text := nullif(trim(p_payment_proof_storage_path),'');
  v_sha text := lower(nullif(trim(p_payment_proof_sha256),''));
  v_name text := nullif(trim(p_original_name),'');
  v_mime text := lower(nullif(trim(p_mime),''));
begin
  if p_participant_user_id is null then raise exception 'participant user is required'; end if;
  if v_path is null then raise exception 'payment proof storage path is required'; end if;
  if v_sha is null or v_sha !~ '^[0-9a-f]{64}$' then raise exception 'valid SHA-256 proof digest is required'; end if;
  if v_name is null or length(v_name)>180 then raise exception 'valid original proof file name is required'; end if;
  if v_mime not in ('image/jpeg','image/png','image/webp','application/pdf') then
    raise exception 'unsupported payment proof MIME type';
  end if;
  if split_part(v_path,'/',1)<>p_participant_user_id::text then
    raise exception 'payment proof path does not match participant';
  end if;

  select * into v_order from public.investment_orders where id=p_order_id for update;
  if v_order.id is null or v_order.participant_user_id<>p_participant_user_id then
    raise exception 'order not found for participant';
  end if;
  if v_order.status<>'AWAITING_PAYMENT' then raise exception 'order is not awaiting payment evidence'; end if;

  if exists (
    select 1 from public.investment_orders
    where payment_proof_sha256=v_sha and id<>v_order.id
  ) then
    raise exception 'payment proof file has already been used on another investment order';
  end if;

  update public.investment_orders
  set status='PENDING_BANK_VERIFICATION',
      payment_method='crypto',
      payment_reference=null,
      payment_proof_storage_path=v_path,
      payment_proof_sha256=v_sha,
      payment_proof_original_name=v_name,
      payment_proof_mime=v_mime,
      payment_submitted_at=now(),
      updated_at=now()
  where id=v_order.id
  returning * into v_order;

  insert into public.investment_audit_log(actor_id,action,entity,entity_id,new_value)
  values (
    p_participant_user_id,
    'submit_investment_order_crypto_proof_server',
    'investment_orders',
    v_order.id,
    jsonb_build_object(
      'payment_method','crypto',
      'proof_sha256',v_sha,
      'proof_mime',v_mime,
      'verification_state','PENDING_BANK_VERIFICATION',
      'trust_boundary','SERVER_COMPUTED_SHA256'
    )
  );

  return v_order;
end;
$$;

revoke all on function public.submit_investment_order_crypto_proof_server(uuid,uuid,text,text,text,text)
  from public,anon,authenticated;
grant execute on function public.submit_investment_order_crypto_proof_server(uuid,uuid,text,text,text,text)
  to service_role;

-- ---------------------------------------------------------------------------
-- Receipt guard: accept manual Bancolombia OR manual crypto, nothing else
-- ---------------------------------------------------------------------------
create or replace function public.guard_investment_payment_receipt()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.investment_orders;
begin
  if not public.has_investment_permission('finance.manage') then
    raise exception 'finance.manage required for authoritative investment receipt';
  end if;

  select * into v_order from public.investment_orders where id=new.order_id;
  if v_order.id is null then raise exception 'investment order not found'; end if;
  if v_order.status<>'PAYMENT_SUBMITTED' then raise exception 'authoritative receipt requires internal PAYMENT_SUBMITTED state'; end if;
  if v_order.payment_proof_storage_path is null or v_order.payment_proof_sha256 is null then
    raise exception 'authoritative receipt requires participant payment proof';
  end if;
  if v_order.bank_verified_by is distinct from auth.uid() or v_order.bank_verified_at is null then
    raise exception 'authoritative receipt requires current Finance actor human verification';
  end if;

  if v_order.bank_verified_provider_code='BANCOLOMBIA_MANUAL' then
    if new.payment_rail<>'bank_transfer' or new.provider_code<>'BANCOLOMBIA_MANUAL' then
      raise exception 'manual Bancolombia verification accepts only bank_transfer/BANCOLOMBIA_MANUAL receipts';
    end if;
  elsif v_order.bank_verified_provider_code='CRYPTO_MANUAL' then
    if new.payment_rail<>'crypto' or new.provider_code<>'CRYPTO_MANUAL' then
      raise exception 'manual crypto verification accepts only crypto/CRYPTO_MANUAL receipts';
    end if;
    if v_order.crypto_network is null then
      raise exception 'manual crypto verification requires the independently observed network';
    end if;
  else
    raise exception 'current inbound policy requires manual Bancolombia or manual crypto verification';
  end if;

  if new.external_reference is distinct from v_order.bank_verified_reference
     or new.amount_cents is distinct from v_order.bank_verified_amount_cents
     or new.settled_at is distinct from v_order.bank_received_at then
    raise exception 'authoritative receipt does not match the independently verified movement';
  end if;
  if new.participant_user_id<>v_order.participant_user_id then raise exception 'receipt participant does not match order'; end if;
  if new.amount_cents<>v_order.capital_required_cents then raise exception 'receipt must equal exact order capital requirement'; end if;
  if new.reconciled_by<>auth.uid() then raise exception 'reconciled_by must be current Finance actor'; end if;

  return new;
end;
$$;
revoke all on function public.guard_investment_payment_receipt() from public,anon,authenticated;

-- ---------------------------------------------------------------------------
-- Human on-chain confirmation, mirroring verify_investment_bancolombia_transfer
-- ---------------------------------------------------------------------------
create or replace function public.verify_investment_crypto_transfer(
  p_order_id uuid,
  p_transaction_hash text,
  p_network text,
  p_received_amount_cents bigint,
  p_received_at timestamptz,
  p_notes text default null
)
returns public.investment_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.investment_orders;
  v_reference text := upper(regexp_replace(coalesce(p_transaction_hash,''), '[^A-Za-z0-9]', '', 'g'));
  v_network text := upper(regexp_replace(coalesce(p_network,''), '[^A-Za-z0-9_-]', '', 'g'));
  v_result record;
  v_contract_reference text;
begin
  if not public.has_investment_permission('finance.manage') then
    raise exception 'finance.manage required';
  end if;
  if length(v_reference)<16 then raise exception 'valid on-chain transaction hash is required'; end if;
  if v_network !~ '^[A-Z0-9_-]{2,40}$' then raise exception 'independently observed network is required'; end if;
  if p_received_amount_cents is null or p_received_amount_cents<=0 then raise exception 'received amount must be positive'; end if;
  if p_received_at is null then raise exception 'on-chain confirmation timestamp is required'; end if;
  if p_received_at>now()+interval '10 minutes' then raise exception 'on-chain confirmation timestamp cannot be in the future'; end if;

  select * into v_order from public.investment_orders where id=p_order_id for update;
  if v_order.id is null then raise exception 'investment order not found'; end if;
  if v_order.status<>'PENDING_BANK_VERIFICATION' then raise exception 'order is not pending human verification'; end if;
  if v_order.payment_method<>'crypto' then raise exception 'order is not a crypto payment claim'; end if;
  if v_order.payment_proof_storage_path is null or v_order.payment_proof_sha256 is null then
    raise exception 'payment proof is missing';
  end if;
  if p_received_amount_cents<>v_order.capital_required_cents then
    raise exception 'on-chain movement amount must equal exact order capital requirement';
  end if;

  if exists (
    select 1 from public.investment_orders
    where bank_verified_provider_code='CRYPTO_MANUAL'
      and upper(regexp_replace(bank_verified_reference, '[^A-Za-z0-9]', '', 'g'))=v_reference
      and id<>v_order.id
  ) then
    raise exception 'transaction hash has already been used';
  end if;

  update public.investment_orders
  set status='PAYMENT_SUBMITTED',
      bank_verified_provider_code='CRYPTO_MANUAL',
      bank_verified_reference=v_reference,
      bank_verified_amount_cents=p_received_amount_cents,
      bank_received_at=p_received_at,
      bank_verified_at=now(),
      bank_verified_by=auth.uid(),
      crypto_network=v_network,
      updated_at=now()
  where id=v_order.id;

  select * into v_result
  from public.reconcile_investment_order_payment(
    v_order.id,
    'crypto',
    'CRYPTO_MANUAL',
    v_reference,
    p_received_amount_cents,
    p_received_at,
    'CRYPTOVER:'||v_order.id::text,
    nullif(trim(p_notes),'')
  );

  v_contract_reference := 'CTG-INV-'||upper(replace(v_order.id::text,'-',''));

  update public.investment_orders
  set contract_reference=v_contract_reference,
      contract_activated_at=now(),
      updated_at=now()
  where id=v_order.id
  returning * into v_order;

  insert into public.investment_audit_log(actor_id,action,entity,entity_id,new_value)
  values (
    auth.uid(),'verify_investment_crypto_transfer','investment_orders',v_order.id,
    jsonb_build_object(
      'provider','CRYPTO_MANUAL',
      'transaction_hash',v_reference,
      'transaction_hash_as_entered',nullif(trim(p_transaction_hash),''),
      'network',v_network,
      'received_amount_cents',p_received_amount_cents,
      'received_at',p_received_at,
      'receipt_id',v_result.receipt_id,
      'allocation_id',v_result.allocation_id,
      'contract_reference',v_contract_reference,
      'reference_normalization','UPPER_ALPHANUMERIC'
    )
  );

  return v_order;
end;
$$;

revoke all on function public.verify_investment_crypto_transfer(uuid,text,text,bigint,timestamptz,text) from public,anon;
grant execute on function public.verify_investment_crypto_transfer(uuid,text,text,bigint,timestamptz,text) to authenticated;

-- ---------------------------------------------------------------------------
-- Shared proof rejection: record which rail the rejected claim belonged to
-- ---------------------------------------------------------------------------
create or replace function public.reject_investment_bank_proof(
  p_order_id uuid,
  p_reason text
)
returns public.investment_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.investment_orders;
  v_reason text := nullif(trim(p_reason),'');
begin
  if not public.has_investment_permission('finance.manage') then raise exception 'finance.manage required'; end if;
  if v_reason is null then raise exception 'rejection reason is required'; end if;

  select * into v_order from public.investment_orders where id=p_order_id for update;
  if v_order.id is null then raise exception 'investment order not found'; end if;
  if v_order.status<>'PENDING_BANK_VERIFICATION' then raise exception 'order is not pending verification'; end if;

  update public.investment_orders
  set status='REJECTED',reviewed_by=auth.uid(),admin_notes=v_reason,updated_at=now()
  where id=v_order.id returning * into v_order;

  insert into public.investment_audit_log(actor_id,action,entity,entity_id,new_value)
  values(auth.uid(),'reject_investment_bank_proof','investment_orders',v_order.id,
    jsonb_build_object(
      'reason',v_reason,
      'proof_sha256',v_order.payment_proof_sha256,
      'payment_method',v_order.payment_method
    ));

  return v_order;
end;
$$;

revoke all on function public.reject_investment_bank_proof(uuid,text) from public,anon;
grant execute on function public.reject_investment_bank_proof(uuid,text) to authenticated;

-- ---------------------------------------------------------------------------
-- Operational health for the crypto rail, mirroring the Bancolombia check
-- ---------------------------------------------------------------------------
create or replace function public.get_manual_crypto_verification_health()
returns table(
  pending_crypto_verification bigint,
  allocated_without_human_verification bigint,
  allocated_without_receipt bigint,
  allocated_without_network bigint,
  duplicated_transaction_hashes bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.investment_orders
      where status='PENDING_BANK_VERIFICATION' and payment_method='crypto'),
    (select count(*) from public.investment_orders
      where status='ALLOCATED' and payment_method='crypto' and bank_verified_at is null),
    (select count(*) from public.investment_orders o
      where o.status='ALLOCATED' and o.payment_method='crypto' and not exists (
        select 1 from public.investment_payment_receipts r where r.order_id=o.id
      )),
    (select count(*) from public.investment_orders
      where status='ALLOCATED' and payment_method='crypto' and crypto_network is null),
    (select count(*) from (
      select upper(regexp_replace(bank_verified_reference,'[^A-Za-z0-9]','','g')) as normalized
      from public.investment_orders
      where bank_verified_provider_code='CRYPTO_MANUAL' and bank_verified_reference is not null
      group by 1 having count(*)>1
    ) d);
$$;
revoke all on function public.get_manual_crypto_verification_health() from public,anon;
grant execute on function public.get_manual_crypto_verification_health() to authenticated;
