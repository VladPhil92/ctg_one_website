create or replace function public._assert_investment_server_actor(
  p_actor_user_id uuid,
  p_required_permission text default null,
  p_require_investment_admin boolean default false,
  p_require_super_admin boolean default false
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_actor_user_id is null or not exists (
    select 1 from public.profiles p where p.id = p_actor_user_id
  ) then
    raise exception 'INVESTMENT_ACTOR_FORBIDDEN';
  end if;

  perform set_config('request.jwt.claim.sub', p_actor_user_id::text, true);

  if p_require_super_admin and public.get_investment_role() <> 'SUPER_ADMIN' then
    raise exception 'INVESTMENT_SUPER_ADMIN_REQUIRED';
  end if;

  if p_require_investment_admin and not public.is_investment_admin() then
    raise exception 'INVESTMENT_ADMIN_REQUIRED';
  end if;

  if p_required_permission is not null and not public.has_investment_permission(p_required_permission) then
    raise exception 'INVESTMENT_PERMISSION_REQUIRED:%', p_required_permission;
  end if;
end;
$$;

revoke all on function public._assert_investment_server_actor(uuid, text, boolean, boolean)
  from public, anon, authenticated, service_role;

create or replace function public.approve_withdrawal_server(
  p_actor_user_id uuid,
  p_request_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public._assert_investment_server_actor(p_actor_user_id, null, true, false);
  perform public.approve_withdrawal(p_request_id);
end;
$$;

create or replace function public.reject_withdrawal_server(
  p_actor_user_id uuid,
  p_request_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public._assert_investment_server_actor(p_actor_user_id, null, true, false);
  perform public.reject_withdrawal(p_request_id, p_reason);
end;
$$;

create or replace function public.set_investment_user_role_server(
  p_actor_user_id uuid,
  p_user_id uuid,
  p_role text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public._assert_investment_server_actor(p_actor_user_id, null, false, true);
  return public.set_investment_user_role(p_user_id, p_role);
end;
$$;

create or replace function public.verify_investment_bancolombia_transfer_server(
  p_actor_user_id uuid,
  p_order_id uuid,
  p_bank_reference text,
  p_received_amount_cents bigint,
  p_bank_received_at timestamptz,
  p_notes text default null
)
returns public.investment_orders
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public._assert_investment_server_actor(p_actor_user_id, 'finance.manage', false, false);
  return public.verify_investment_bancolombia_transfer(
    p_order_id,
    p_bank_reference,
    p_received_amount_cents,
    p_bank_received_at,
    p_notes
  );
end;
$$;

create or replace function public.verify_investment_crypto_transfer_server(
  p_actor_user_id uuid,
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
set search_path = ''
as $$
begin
  perform public._assert_investment_server_actor(p_actor_user_id, 'finance.manage', false, false);
  return public.verify_investment_crypto_transfer(
    p_order_id,
    p_transaction_hash,
    p_network,
    p_received_amount_cents,
    p_received_at,
    p_notes
  );
end;
$$;

create or replace function public.initiate_investment_payout_server(
  p_actor_user_id uuid,
  p_request_id uuid,
  p_payout_rail text,
  p_provider_code text,
  p_destination_masked text,
  p_destination_fingerprint text,
  p_idempotency_key text,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public._assert_investment_server_actor(p_actor_user_id, 'finance.manage', false, false);
  return public.initiate_investment_payout(
    p_request_id,
    p_payout_rail,
    p_provider_code,
    p_destination_masked,
    p_destination_fingerprint,
    p_idempotency_key,
    p_notes
  );
end;
$$;

create or replace function public.confirm_investment_payout_server(
  p_actor_user_id uuid,
  p_payout_id uuid,
  p_external_reference text,
  p_paid_at timestamptz,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public._assert_investment_server_actor(p_actor_user_id, 'finance.manage', false, false);
  perform public.confirm_investment_payout(
    p_payout_id,
    p_external_reference,
    p_paid_at,
    p_notes
  );
end;
$$;

create or replace function public.fail_investment_payout_server(
  p_actor_user_id uuid,
  p_payout_id uuid,
  p_reason text,
  p_external_reference text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public._assert_investment_server_actor(p_actor_user_id, 'finance.manage', false, false);
  perform public.fail_investment_payout(
    p_payout_id,
    p_reason,
    p_external_reference
  );
end;
$$;

revoke all on function public.approve_withdrawal_server(uuid, uuid) from public, anon, authenticated;
revoke all on function public.reject_withdrawal_server(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.set_investment_user_role_server(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.verify_investment_bancolombia_transfer_server(uuid, uuid, text, bigint, timestamptz, text) from public, anon, authenticated;
revoke all on function public.verify_investment_crypto_transfer_server(uuid, uuid, text, text, bigint, timestamptz, text) from public, anon, authenticated;
revoke all on function public.initiate_investment_payout_server(uuid, uuid, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.confirm_investment_payout_server(uuid, uuid, text, timestamptz, text) from public, anon, authenticated;
revoke all on function public.fail_investment_payout_server(uuid, uuid, text, text) from public, anon, authenticated;

grant execute on function public.approve_withdrawal_server(uuid, uuid) to service_role;
grant execute on function public.reject_withdrawal_server(uuid, uuid, text) to service_role;
grant execute on function public.set_investment_user_role_server(uuid, uuid, text) to service_role;
grant execute on function public.verify_investment_bancolombia_transfer_server(uuid, uuid, text, bigint, timestamptz, text) to service_role;
grant execute on function public.verify_investment_crypto_transfer_server(uuid, uuid, text, text, bigint, timestamptz, text) to service_role;
grant execute on function public.initiate_investment_payout_server(uuid, uuid, text, text, text, text, text, text) to service_role;
grant execute on function public.confirm_investment_payout_server(uuid, uuid, text, timestamptz, text) to service_role;
grant execute on function public.fail_investment_payout_server(uuid, uuid, text, text) to service_role;

comment on function public.approve_withdrawal_server(uuid, uuid) is
  'Server-only investment admin boundary for withdrawal approval. Revalidates the canonical investment actor before delegation.';
comment on function public.reject_withdrawal_server(uuid, uuid, text) is
  'Server-only investment admin boundary for withdrawal rejection. Revalidates the canonical investment actor before delegation.';
comment on function public.set_investment_user_role_server(uuid, uuid, text) is
  'Server-only SUPER_ADMIN boundary for investment role assignment.';
comment on function public.verify_investment_bancolombia_transfer_server(uuid, uuid, text, bigint, timestamptz, text) is
  'Server-only finance.manage boundary for authoritative Bancolombia verification.';
comment on function public.verify_investment_crypto_transfer_server(uuid, uuid, text, text, bigint, timestamptz, text) is
  'Server-only finance.manage boundary for authoritative crypto verification.';
comment on function public.initiate_investment_payout_server(uuid, uuid, text, text, text, text, text, text) is
  'Server-only finance.manage boundary for payout initiation.';
comment on function public.confirm_investment_payout_server(uuid, uuid, text, timestamptz, text) is
  'Server-only finance.manage boundary for payout confirmation.';
comment on function public.fail_investment_payout_server(uuid, uuid, text, text) is
  'Server-only finance.manage boundary for payout failure handling.';
