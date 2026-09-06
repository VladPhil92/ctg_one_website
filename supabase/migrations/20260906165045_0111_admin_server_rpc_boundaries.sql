create or replace function public.verify_wallet_topup_claim_server(
  p_actor_user_id uuid,
  p_claim_id uuid,
  p_verification_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_actor_user_id is null or not exists (
    select 1 from public.profiles p
    where p.id = p_actor_user_id and p.role = 'admin'
  ) then
    raise exception 'ADMIN_ACTOR_FORBIDDEN';
  end if;

  perform set_config('request.jwt.claim.sub', p_actor_user_id::text, true);
  return public.verify_wallet_topup_claim(p_claim_id, p_verification_notes);
end;
$$;

create or replace function public.reconcile_wallet_topup_claim_server(
  p_actor_user_id uuid,
  p_claim_id uuid,
  p_admin_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_actor_user_id is null or not exists (
    select 1 from public.profiles p
    where p.id = p_actor_user_id and p.role = 'admin'
  ) then
    raise exception 'ADMIN_ACTOR_FORBIDDEN';
  end if;

  perform set_config('request.jwt.claim.sub', p_actor_user_id::text, true);
  return public.reconcile_wallet_topup_claim(p_claim_id, p_admin_notes);
end;
$$;

create or replace function public.reject_wallet_topup_claim_server(
  p_actor_user_id uuid,
  p_claim_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_actor_user_id is null or not exists (
    select 1 from public.profiles p
    where p.id = p_actor_user_id and p.role = 'admin'
  ) then
    raise exception 'ADMIN_ACTOR_FORBIDDEN';
  end if;

  perform set_config('request.jwt.claim.sub', p_actor_user_id::text, true);
  return public.reject_wallet_topup_claim(p_claim_id, p_reason);
end;
$$;

create or replace function public.approve_kyc_server(
  p_actor_user_id uuid,
  p_submission_id uuid,
  p_admin_notes text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_actor_user_id is null or not exists (
    select 1 from public.profiles p
    where p.id = p_actor_user_id and p.role = 'admin'
  ) then
    raise exception 'ADMIN_ACTOR_FORBIDDEN';
  end if;

  perform set_config('request.jwt.claim.sub', p_actor_user_id::text, true);
  perform public.approve_kyc(p_submission_id, p_admin_notes);
end;
$$;

create or replace function public.reject_kyc_server(
  p_actor_user_id uuid,
  p_submission_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_actor_user_id is null or not exists (
    select 1 from public.profiles p
    where p.id = p_actor_user_id and p.role = 'admin'
  ) then
    raise exception 'ADMIN_ACTOR_FORBIDDEN';
  end if;

  perform set_config('request.jwt.claim.sub', p_actor_user_id::text, true);
  perform public.reject_kyc(p_submission_id, p_reason);
end;
$$;

revoke all on function public.verify_wallet_topup_claim_server(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.reconcile_wallet_topup_claim_server(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.reject_wallet_topup_claim_server(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.approve_kyc_server(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.reject_kyc_server(uuid, uuid, text) from public, anon, authenticated;

grant execute on function public.verify_wallet_topup_claim_server(uuid, uuid, text) to service_role;
grant execute on function public.reconcile_wallet_topup_claim_server(uuid, uuid, text) to service_role;
grant execute on function public.reject_wallet_topup_claim_server(uuid, uuid, text) to service_role;
grant execute on function public.approve_kyc_server(uuid, uuid, text) to service_role;
grant execute on function public.reject_kyc_server(uuid, uuid, text) to service_role;

comment on function public.verify_wallet_topup_claim_server(uuid, uuid, text) is
  'Server-only admin boundary. Revalidates canonical admin actor before delegating wallet top-up verification.';
comment on function public.reconcile_wallet_topup_claim_server(uuid, uuid, text) is
  'Server-only admin boundary. Revalidates canonical admin actor before delegating independent wallet top-up reconciliation.';
comment on function public.reject_wallet_topup_claim_server(uuid, uuid, text) is
  'Server-only admin boundary. Revalidates canonical admin actor before delegating wallet top-up rejection.';
comment on function public.approve_kyc_server(uuid, uuid, text) is
  'Server-only admin boundary. Revalidates canonical admin actor before delegating KYC approval.';
comment on function public.reject_kyc_server(uuid, uuid, text) is
  'Server-only admin boundary. Revalidates canonical admin actor before delegating KYC rejection.';
