-- CTG Craft Beer Investment OS — payment proof trusted server boundary
--
-- 0037 introduced the manual Bancolombia model. This follow-up ensures the
-- participant cannot call the proof-persistence RPC directly with a fabricated
-- SHA-256. The browser session authorizes the HTTP request, but only the trusted
-- Next.js server computes the file digest and persists it through service_role.

revoke all on function public.submit_investment_order_bank_proof(uuid,text,text,text,text)
  from public,anon,authenticated;

create or replace function public.submit_investment_order_bank_proof_server(
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
    p_participant_user_id,
    'submit_investment_order_bank_proof_server',
    'investment_orders',
    v_order.id,
    jsonb_build_object(
      'payment_method','bank_transfer',
      'proof_sha256',v_sha,
      'proof_mime',v_mime,
      'verification_state','PENDING_BANK_VERIFICATION',
      'trust_boundary','SERVER_COMPUTED_SHA256'
    )
  );

  return v_order;
end;
$$;

revoke all on function public.submit_investment_order_bank_proof_server(uuid,uuid,text,text,text,text)
  from public,anon,authenticated;
grant execute on function public.submit_investment_order_bank_proof_server(uuid,uuid,text,text,text,text)
  to service_role;
