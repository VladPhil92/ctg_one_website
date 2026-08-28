-- CTG Craft Beer Inversion — unify KYC identity source of truth
--
-- public.profiles.kyc_status is the authoritative CTG One identity decision.
-- investment_participant_profiles remains the investment-domain profile, but
-- its kyc_status is now a synchronized projection for backwards compatibility.
--
-- This migration is additive/idempotent in behavior: it does not remove KYC
-- history, documents, participant profiles, orders, allocations, or ledger data.

create or replace function public._investment_kyc_from_profile_status(p_status text)
returns text
language sql
immutable
set search_path = public
as $$
  select case p_status
    when 'verified' then 'VERIFIED'
    when 'pending' then 'PENDING'
    when 'rejected' then 'REJECTED'
    else 'NOT_STARTED'
  end;
$$;

revoke all on function public._investment_kyc_from_profile_status(text)
  from public, anon, authenticated;

-- Synchronize already-created investment profiles whenever the authoritative
-- CTG One KYC decision changes. Lazy participant creation is preserved: this
-- trigger never creates an investment profile for users who have not entered
-- the investment product.
create or replace function public.sync_investment_kyc_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous text;
  v_target text;
  v_participant_id uuid;
begin
  if new.kyc_status is not distinct from old.kyc_status then
    return new;
  end if;

  v_target := public._investment_kyc_from_profile_status(new.kyc_status);

  select id, kyc_status
    into v_participant_id, v_previous
    from public.investment_participant_profiles
   where user_id = new.id
   for update;

  if v_participant_id is null or v_previous is not distinct from v_target then
    return new;
  end if;

  update public.investment_participant_profiles
     set kyc_status = v_target
   where id = v_participant_id;

  insert into public.investment_audit_log(
    actor_id, action, entity, entity_id, previous_value, new_value, reason
  ) values (
    auth.uid(),
    'sync_investment_kyc',
    'investment_participant_profiles',
    v_participant_id,
    jsonb_build_object('kyc_status', v_previous),
    jsonb_build_object('kyc_status', v_target),
    'Synchronized from authoritative profiles.kyc_status'
  );

  return new;
end;
$$;

revoke all on function public.sync_investment_kyc_from_profile()
  from public, anon, authenticated;

drop trigger if exists sync_investment_kyc_after_profile_change on public.profiles;
create trigger sync_investment_kyc_after_profile_change
  after update of kyc_status on public.profiles
  for each row
  when (old.kyc_status is distinct from new.kyc_status)
  execute function public.sync_investment_kyc_from_profile();

-- Backfill legacy mismatches. Existing VERIFIED investment decisions are never
-- downgraded by this historical repair; verified CTG One users are always
-- promoted to VERIFIED in the investment projection.
insert into public.investment_audit_log(
  actor_id, action, entity, entity_id, previous_value, new_value, reason
)
select
  null,
  'backfill_investment_kyc',
  'investment_participant_profiles',
  ipp.id,
  jsonb_build_object('kyc_status', ipp.kyc_status),
  jsonb_build_object(
    'kyc_status',
    case
      when ipp.kyc_status = 'VERIFIED' then 'VERIFIED'
      else public._investment_kyc_from_profile_status(p.kyc_status)
    end
  ),
  '0072 KYC source-of-truth backfill'
from public.investment_participant_profiles ipp
join public.profiles p on p.id = ipp.user_id
where ipp.kyc_status is distinct from (
  case
    when ipp.kyc_status = 'VERIFIED' then 'VERIFIED'
    else public._investment_kyc_from_profile_status(p.kyc_status)
  end
);

update public.investment_participant_profiles ipp
   set kyc_status = case
     when ipp.kyc_status = 'VERIFIED' then 'VERIFIED'
     else public._investment_kyc_from_profile_status(p.kyc_status)
   end
  from public.profiles p
 where p.id = ipp.user_id
   and ipp.kyc_status is distinct from (
     case
       when ipp.kyc_status = 'VERIFIED' then 'VERIFIED'
       else public._investment_kyc_from_profile_status(p.kyc_status)
     end
   );

-- Lazy creation now derives investment KYC from the CTG One profile rather
-- than defaulting every new participant to NOT_STARTED. The same RPC also
-- self-heals a stale projection on every investment-app entry.
create or replace function public.ensure_investment_participant_profile()
returns public.investment_participant_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.investment_participant_profiles;
  v_profile_status text;
  v_target_status text;
  v_previous_status text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select kyc_status
    into v_profile_status
    from public.profiles
   where id = auth.uid();

  if v_profile_status is null then
    raise exception 'CTG One profile not found';
  end if;

  v_target_status := public._investment_kyc_from_profile_status(v_profile_status);

  select *
    into v_row
    from public.investment_participant_profiles
   where user_id = auth.uid()
   for update;

  if v_row.id is null then
    insert into public.investment_participant_profiles (user_id, kyc_status)
    values (auth.uid(), v_target_status)
    returning * into v_row;

    insert into public.investment_audit_log(actor_id, action, entity, entity_id, new_value, reason)
    values (
      auth.uid(),
      'create_investment_participant_profile',
      'investment_participant_profiles',
      v_row.id,
      jsonb_build_object('kyc_status', v_row.kyc_status),
      'Lazy investment onboarding using CTG One KYC source of truth'
    );
  elsif v_row.kyc_status is distinct from v_target_status then
    v_previous_status := v_row.kyc_status;

    update public.investment_participant_profiles
       set kyc_status = v_target_status
     where id = v_row.id
     returning * into v_row;

    insert into public.investment_audit_log(
      actor_id, action, entity, entity_id, previous_value, new_value, reason
    ) values (
      auth.uid(),
      'sync_investment_kyc',
      'investment_participant_profiles',
      v_row.id,
      jsonb_build_object('kyc_status', v_previous_status),
      jsonb_build_object('kyc_status', v_row.kyc_status),
      'Self-healed from authoritative profiles.kyc_status during participant onboarding'
    );
  end if;

  return v_row;
end;
$$;

revoke all on function public.ensure_investment_participant_profile()
  from public, anon;
grant execute on function public.ensure_investment_participant_profile()
  to authenticated;

comment on column public.investment_participant_profiles.kyc_status is
  'Synchronized investment-domain projection of authoritative public.profiles.kyc_status. Do not treat as an independent identity-verification decision.';