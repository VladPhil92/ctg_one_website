-- CTG Craft Beer Investment OS — manual Bancolombia verification
--
-- Current operating policy:
--   transfer by Bancolombia QR -> participant proof -> human bank verification
--   -> authoritative receipt -> allocation/ledger -> contract activation.
--
-- A proof image, OCR result or AI analysis is evidence only. It can never create
-- an authoritative receipt or approve an investment.

-- Fail closed while production has no monetary history. A future environment
-- with existing investment money history requires an explicit migration plan.
do $$
declare
  v_orders bigint;
  v_receipts bigint;
  v_allocations bigint;
  v_ledger bigint;
begin
  select count(*) into v_orders from public.investment_orders;
  select count(*) into v_receipts from public.investment_payment_receipts;
  select count(*) into v_allocations from public.investment_funding_allocations;
  select count(*) into v_ledger from public.investment_ledger_entries;

  if v_orders > 0 or v_receipts > 0 or v_allocations > 0 or v_ledger > 0 then
    raise exception
      'manual bank verification cutover requires explicit history migration first (orders=%, receipts=%, allocations=%, ledger=%)',
      v_orders,v_receipts,v_allocations,v_ledger;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Order evidence + human verification + contract activation metadata
-- ---------------------------------------------------------------------------
alter table public.investment_orders
  drop constraint investment_orders_status_check;

alter table public.investment_orders
  add constraint investment_orders_status_check check (status in (
    'AWAITING_PAYMENT',
    'PENDING_BANK_VERIFICATION',
    'PAYMENT_SUBMITTED', -- internal transient state used only inside verification tx
    'PAYMENT_VERIFIED',
    'ALLOCATED',
    'REJECTED',
    'CANCELLED',
    'EXPIRED'
  ));

alter table public.investment_orders
  add column payment_proof_sha256 text,
  add column payment_proof_original_name text,
  add column payment_proof_mime text,
  add column bank_verified_provider_code text,
  add column bank_verified_reference text,
  add column bank_verified_amount_cents bigint,
  add column bank_received_at timestamptz,
  add column bank_verified_at timestamptz,
  add column bank_verified_by uuid references auth.users(id) on delete restrict,
  add column contract_reference text,
  add column contract_activated_at timestamptz;

alter table public.investment_orders
  add constraint investment_orders_payment_proof_sha256_check
    check (payment_proof_sha256 is null or payment_proof_sha256 ~ '^[0-9a-f]{64}$'),
  add constraint investment_orders_bank_verified_amount_check
    check (bank_verified_amount_cents is null or bank_verified_amount_cents > 0),
  add constraint investment_orders_manual_verification_consistency_check
    check (
      (bank_verified_at is null and bank_verified_by is null and bank_verified_reference is null
        and bank_verified_amount_cents is null and bank_received_at is null and bank_verified_provider_code is null)
      or
      (bank_verified_at is not null and bank_verified_by is not null and bank_verified_reference is not null
        and bank_verified_amount_cents is not null and bank_received_at is not null
        and bank_verified_provider_code = 'BANCOLOMBIA_MANUAL')
    ),
  add constraint investment_orders_contract_activation_consistency_check
    check (
      (contract_reference is null and contract_activated_at is null)
      or
      (contract_reference is not null and contract_activated_at is not null and status = 'ALLOCATED')
    );

create unique index investment_orders_payment_proof_sha256_unique
  on public.investment_orders(payment_proof_sha256)
  where payment_proof_sha256 is not null;

create unique index investment_orders_manual_bank_reference_unique
  on public.investment_orders(bank_verified_provider_code,bank_verified_reference)
  where bank_verified_reference is not null;

create unique index investment_orders_contract_reference_unique
  on public.investment_orders(contract_reference)
  where contract_reference is not null;

create index investment_orders_bank_verified_by_idx
  on public.investment_orders(bank_verified_by);

comment on column public.investment_orders.payment_proof_sha256 is
  'Server-computed SHA-256 of the participant proof file. Exact duplicate evidence is rejected globally.';
comment on column public.investment_orders.bank_verified_reference is
  'Reference independently observed by Finance in Bancolombia. Never inferred from proof evidence alone.';
comment on column public.investment_orders.contract_activated_at is
  'Operational activation timestamp. The investment becomes active only after human bank verification and allocation.';

-- ---------------------------------------------------------------------------
-- Participant evidence submission: bank transfer only
-- ---------------------------------------------------------------------------
create or replace function public.submit_investment_order_bank_proof(
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
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if v_path is null then raise exception 'payment proof storage path is required'; end if;
  if v_sha is null or v_sha !~ '^[0-9a-f]{64}$' then raise exception 'valid SHA-256 proof digest is required'; end if;
  if v_name is null then raise exception 'original proof file name is required'; end if;
  if v_mime not in ('image/jpeg','image/png','image/webp','application/pdf') then
    raise exception 'unsupported payment proof MIME type';
  end if;
  if split_part(v_path,'/',1) <> auth.uid()::text then
    raise exception 'payment proof path must belong to current participant';
  end if;

  select * into v_order from public.investment_orders where id=p_order_id for update;
  if v_order.id is null or v_order.participant_user_id<>auth.uid() then raise exception 'order not found'; end if;
  if v_order.status<>'AWAITING_PAYMENT' then raise exception 'order is not awaiting payment evidence'; end if;

  if exists (
    select 1 from public.investment_orders
    where payment_proof_sha256=v_sha and id<>v_order.id
  ) then
    raise exception 'payment proof file has already been used on another investment order';
  end if;

  update public.investment_orders
  set status='PENDING_BANK_VERIFICATION',
      payment_method='bank_transfer',
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
    auth.uid(),'submit_investment_order_bank_proof','investment_orders',v_order.id,
    jsonb_build_object(
      'payment_method','bank_transfer',
      'proof_sha256',v_sha,
      'proof_mime',v_mime,
      'verification_state','PENDING_BANK_VERIFICATION'
    )
  );

  return v_order;
end;
$$;

revoke all on function public.submit_investment_order_bank_proof(uuid,text,text,text,text) from public,anon;
grant execute on function public.submit_investment_order_bank_proof(uuid,text,text,text,text) to authenticated;

-- Legacy participant payment submission is fail-closed so no other rail can put
-- an order in PAYMENT_SUBMITTED and bypass human bank verification.
create or replace function public.submit_investment_order_payment(
  p_order_id uuid,
  p_payment_method text,
  p_payment_reference text default null,
  p_payment_proof_storage_path text default null
)
returns public.investment_orders
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'legacy investment payment submission disabled; use submit_investment_order_bank_proof()';
end;
$$;
revoke all on function public.submit_investment_order_payment(uuid,text,text,text) from public,anon;
grant execute on function public.submit_investment_order_payment(uuid,text,text,text) to authenticated;

-- Capacity reservations must include the human-verification queue.
create or replace function public.create_investment_order(p_lot_id uuid, p_case_equivalent_units int)
returns public.investment_orders
language plpgsql security definer set search_path = public
as $$
declare
  v_lot public.investment_production_lots;
  v_kyc text;
  v_allocated int;
  v_reserved int;
  v_capital_per_case bigint;
  v_order public.investment_orders;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_case_equivalent_units is null or p_case_equivalent_units <= 0 then
    raise exception 'case quantity must be positive';
  end if;

  select kyc_status into v_kyc
  from public.investment_participant_profiles where user_id=auth.uid();
  if v_kyc is distinct from 'VERIFIED' then raise exception 'investment KYC not verified'; end if;

  select * into v_lot from public.investment_production_lots where id=p_lot_id for update;
  if v_lot.id is null then raise exception 'lot not found'; end if;
  if v_lot.status<>'FUNDING_OPEN' then raise exception 'lot is not open for funding'; end if;

  select coalesce(sum(case_equivalent_units),0) into v_allocated
  from public.investment_funding_allocations where lot_id=p_lot_id;

  select coalesce(sum(case_equivalent_units),0) into v_reserved
  from public.investment_orders
  where lot_id=p_lot_id
    and status in ('AWAITING_PAYMENT','PENDING_BANK_VERIFICATION','PAYMENT_SUBMITTED','PAYMENT_VERIFIED');

  if v_allocated+v_reserved+p_case_equivalent_units>v_lot.total_cases then
    raise exception 'requested quantity exceeds available lot capacity';
  end if;

  v_capital_per_case := (v_lot.production_cost_unit_cents+v_lot.label_cost_unit_cents)*v_lot.case_size_units;
  if v_capital_per_case<=0 then raise exception 'lot capital requirement is not configured'; end if;

  insert into public.investment_orders(participant_user_id,lot_id,case_equivalent_units,capital_required_cents)
  values(auth.uid(),p_lot_id,p_case_equivalent_units,v_capital_per_case*p_case_equivalent_units)
  returning * into v_order;

  insert into public.investment_audit_log(actor_id,action,entity,entity_id,new_value)
  values(auth.uid(),'create_investment_order','investment_orders',v_order.id,
    jsonb_build_object('lot_id',p_lot_id,'cases',p_case_equivalent_units,'capital_required_cents',v_order.capital_required_cents));

  return v_order;
end;
$$;

-- ---------------------------------------------------------------------------
-- Receipt guard: only a human Bancolombia verification may create funding facts
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
    raise exception 'authoritative receipt requires current Finance actor human bank verification';
  end if;
  if v_order.bank_verified_provider_code<>'BANCOLOMBIA_MANUAL' then
    raise exception 'current inbound policy requires manual Bancolombia verification';
  end if;
  if new.payment_rail<>'bank_transfer' or new.provider_code<>'BANCOLOMBIA_MANUAL' then
    raise exception 'current inbound policy accepts only manual Bancolombia bank-transfer receipts';
  end if;
  if new.external_reference is distinct from v_order.bank_verified_reference
     or new.amount_cents is distinct from v_order.bank_verified_amount_cents
     or new.settled_at is distinct from v_order.bank_received_at then
    raise exception 'authoritative receipt does not match independently verified Bancolombia movement';
  end if;
  if new.participant_user_id<>v_order.participant_user_id then raise exception 'receipt participant does not match order'; end if;
  if new.amount_cents<>v_order.capital_required_cents then raise exception 'receipt must equal exact order capital requirement'; end if;
  if new.reconciled_by<>auth.uid() then raise exception 'reconciled_by must be current Finance actor'; end if;

  return new;
end;
$$;
revoke all on function public.guard_investment_payment_receipt() from public,anon,authenticated;

-- ---------------------------------------------------------------------------
-- Human Bancolombia confirmation: the only current investment approval command
-- ---------------------------------------------------------------------------
create or replace function public.verify_investment_bancolombia_transfer(
  p_order_id uuid,
  p_bank_reference text,
  p_received_amount_cents bigint,
  p_bank_received_at timestamptz,
  p_notes text default null
)
returns public.investment_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.investment_orders;
  v_reference text := nullif(trim(p_bank_reference),'');
  v_result record;
  v_contract_reference text;
begin
  if not public.has_investment_permission('finance.manage') then
    raise exception 'finance.manage required';
  end if;
  if v_reference is null or length(v_reference)<3 then raise exception 'Bancolombia reference is required'; end if;
  if p_received_amount_cents is null or p_received_amount_cents<=0 then raise exception 'received amount must be positive'; end if;
  if p_bank_received_at is null then raise exception 'bank received timestamp is required'; end if;
  if p_bank_received_at>now()+interval '10 minutes' then raise exception 'bank received timestamp cannot be in the future'; end if;

  select * into v_order from public.investment_orders where id=p_order_id for update;
  if v_order.id is null then raise exception 'investment order not found'; end if;
  if v_order.status<>'PENDING_BANK_VERIFICATION' then raise exception 'order is not pending human bank verification'; end if;
  if v_order.payment_method<>'bank_transfer' then raise exception 'order is not a Bancolombia bank-transfer claim'; end if;
  if v_order.payment_proof_storage_path is null or v_order.payment_proof_sha256 is null then
    raise exception 'payment proof is missing';
  end if;
  if p_received_amount_cents<>v_order.capital_required_cents then
    raise exception 'Bancolombia movement amount must equal exact order capital requirement';
  end if;

  if exists (
    select 1 from public.investment_orders
    where bank_verified_provider_code='BANCOLOMBIA_MANUAL'
      and bank_verified_reference=v_reference
      and id<>v_order.id
  ) then
    raise exception 'Bancolombia reference has already been used';
  end if;

  -- PAYMENT_SUBMITTED exists only as an internal transient state. The receipt
  -- guard below requires the same human actor and independently entered bank data.
  update public.investment_orders
  set status='PAYMENT_SUBMITTED',
      bank_verified_provider_code='BANCOLOMBIA_MANUAL',
      bank_verified_reference=v_reference,
      bank_verified_amount_cents=p_received_amount_cents,
      bank_received_at=p_bank_received_at,
      bank_verified_at=now(),
      bank_verified_by=auth.uid(),
      updated_at=now()
  where id=v_order.id;

  select * into v_result
  from public.reconcile_investment_order_payment(
    v_order.id,
    'bank_transfer',
    'BANCOLOMBIA_MANUAL',
    v_reference,
    p_received_amount_cents,
    p_bank_received_at,
    'BANKVER:'||v_order.id::text,
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
    auth.uid(),'verify_investment_bancolombia_transfer','investment_orders',v_order.id,
    jsonb_build_object(
      'bank_provider','BANCOLOMBIA_MANUAL',
      'bank_reference',v_reference,
      'received_amount_cents',p_received_amount_cents,
      'bank_received_at',p_bank_received_at,
      'receipt_id',v_result.receipt_id,
      'allocation_id',v_result.allocation_id,
      'contract_reference',v_contract_reference
    )
  );

  return v_order;
end;
$$;

revoke all on function public.verify_investment_bancolombia_transfer(uuid,text,bigint,timestamptz,text) from public,anon;
grant execute on function public.verify_investment_bancolombia_transfer(uuid,text,bigint,timestamptz,text) to authenticated;

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
  if v_order.status<>'PENDING_BANK_VERIFICATION' then raise exception 'order is not pending bank verification'; end if;

  update public.investment_orders
  set status='REJECTED',reviewed_by=auth.uid(),admin_notes=v_reason,updated_at=now()
  where id=v_order.id returning * into v_order;

  insert into public.investment_audit_log(actor_id,action,entity,entity_id,new_value)
  values(auth.uid(),'reject_investment_bank_proof','investment_orders',v_order.id,
    jsonb_build_object('reason',v_reason,'proof_sha256',v_order.payment_proof_sha256));

  return v_order;
end;
$$;

revoke all on function public.reject_investment_bank_proof(uuid,text) from public,anon;
grant execute on function public.reject_investment_bank_proof(uuid,text) to authenticated;

-- Generic order rejection can still release unpaid orders, but not a submitted
-- proof. A proof requires the explicit Finance decision above.
create or replace function public.reject_investment_order(p_order_id uuid,p_admin_notes text)
returns public.investment_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.investment_orders;
  v_reason text := nullif(trim(p_admin_notes),'');
begin
  if not public.has_investment_permission('funding.manage')
     and not public.has_investment_permission('finance.manage') then
    raise exception 'funding.manage or finance.manage required';
  end if;
  if v_reason is null then raise exception 'rejection reason is required'; end if;

  select * into v_order from public.investment_orders where id=p_order_id for update;
  if v_order.id is null then raise exception 'order not found'; end if;
  if v_order.status<>'AWAITING_PAYMENT' then
    raise exception 'submitted payment evidence must be decided through bank verification workflow';
  end if;

  update public.investment_orders
  set status='REJECTED',reviewed_by=auth.uid(),admin_notes=v_reason,updated_at=now()
  where id=v_order.id returning * into v_order;

  return v_order;
end;
$$;

-- Operational health: an allocated investment must always have manual bank
-- verification, authoritative receipt and activated contract reference.
create or replace function public.get_manual_bank_verification_health()
returns table(
  pending_bank_verification bigint,
  allocated_without_human_verification bigint,
  allocated_without_receipt bigint,
  allocated_without_contract_activation bigint,
  duplicated_proof_hashes bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.investment_orders where status='PENDING_BANK_VERIFICATION'),
    (select count(*) from public.investment_orders where status='ALLOCATED' and bank_verified_at is null),
    (select count(*) from public.investment_orders o where o.status='ALLOCATED' and not exists (
      select 1 from public.investment_payment_receipts r where r.order_id=o.id
    )),
    (select count(*) from public.investment_orders where status='ALLOCATED' and contract_activated_at is null),
    (select count(*) from (
      select payment_proof_sha256 from public.investment_orders
      where payment_proof_sha256 is not null group by payment_proof_sha256 having count(*)>1
    ) d);
$$;
revoke all on function public.get_manual_bank_verification_health() from public,anon;
grant execute on function public.get_manual_bank_verification_health() to authenticated;
