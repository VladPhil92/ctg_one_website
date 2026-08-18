-- CTG Craft Beer Investment OS — manual bank reference normalization
--
-- 0037 introduced a unique reference constraint, but textual bank references
-- must be compared canonically. Finance input is normalized to uppercase
-- alphanumerics before storage so case/spacing/punctuation variants cannot be
-- reused to fund multiple orders from the same observed bank movement.

-- Replace the case-sensitive index with a normalized expression index.
drop index if exists public.investment_orders_manual_bank_reference_unique;

create unique index investment_orders_manual_bank_reference_unique
  on public.investment_orders (
    bank_verified_provider_code,
    upper(regexp_replace(bank_verified_reference, '[^A-Za-z0-9]', '', 'g'))
  )
  where bank_verified_reference is not null;

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
  v_reference text := upper(regexp_replace(coalesce(p_bank_reference,''), '[^A-Za-z0-9]', '', 'g'));
  v_result record;
  v_contract_reference text;
begin
  if not public.has_investment_permission('finance.manage') then
    raise exception 'finance.manage required';
  end if;
  if length(v_reference)<3 then raise exception 'valid Bancolombia reference is required'; end if;
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
      and upper(regexp_replace(bank_verified_reference, '[^A-Za-z0-9]', '', 'g'))=v_reference
      and id<>v_order.id
  ) then
    raise exception 'Bancolombia reference has already been used';
  end if;

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
      'contract_reference',v_contract_reference,
      'reference_normalization','UPPER_ALPHANUMERIC'
    )
  );

  return v_order;
end;
$$;

revoke all on function public.verify_investment_bancolombia_transfer(uuid,text,bigint,timestamptz,text) from public,anon;
grant execute on function public.verify_investment_bancolombia_transfer(uuid,text,bigint,timestamptz,text) to authenticated;
