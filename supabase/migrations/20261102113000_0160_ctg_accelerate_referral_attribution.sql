-- CTG Accelerate — referral attribution foundation (non-monetary, fail closed).
-- Does NOT authorize compensation, crypto transfers, accelerated maturity, or ledger postings.
-- Auth insert snapshot is the ONLY capture point; later user_metadata edits cannot attribute a user.

create schema if not exists private;

create table public.ctg_accelerate_referral_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code text not null unique default ('CTG-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16))),
  created_at timestamptz not null default now(),
  constraint ctg_accelerate_code_format check (code ~ '^CTG-[A-F0-9]{16}$')
);

create table public.ctg_accelerate_referral_attributions (
  referred_user_id uuid primary key references auth.users(id) on delete cascade,
  referrer_user_id uuid not null references auth.users(id) on delete cascade,
  referral_code text not null check (referral_code ~ '^CTG-[A-F0-9]{16}$'),
  attributed_at timestamptz not null default now(),
  constraint ctg_accelerate_no_self_referral check (referrer_user_id <> referred_user_id)
);

create index ctg_accelerate_referrer_created_idx
  on public.ctg_accelerate_referral_attributions (referrer_user_id, attributed_at desc);

comment on table public.ctg_accelerate_referral_codes is
  'Invitation codes only; not evidence of an active commercial compensation program.';
comment on table public.ctg_accelerate_referral_attributions is
  'Captured once at original auth.users INSERT. Not a financial or reward ledger. No retroactive attribution.';

create or replace function private.ctg_accelerate_capture_signup()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_referral_code text;
  v_referrer uuid;
begin
  insert into public.ctg_accelerate_referral_codes (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  -- Input is untrusted, but this original INSERT-only snapshot cannot be rewritten
  -- to claim an attribution after account creation.
  v_referral_code := upper(btrim(coalesce(new.raw_user_meta_data ->> 'ctg_referral_code', '')));
  if v_referral_code !~ '^CTG-[A-F0-9]{16}$' then
    return new;
  end if;

  select user_id into v_referrer
    from public.ctg_accelerate_referral_codes
   where code = v_referral_code;

  if v_referrer is not null and v_referrer <> new.id then
    insert into public.ctg_accelerate_referral_attributions
      (referred_user_id, referrer_user_id, referral_code)
    values (new.id, v_referrer, v_referral_code)
    on conflict (referred_user_id) do nothing;
  end if;

  return new;
end;
$$;

revoke all on function private.ctg_accelerate_capture_signup()
  from public, anon, authenticated, service_role;

drop trigger if exists ctg_accelerate_auth_signup_trg on auth.users;
create trigger ctg_accelerate_auth_signup_trg
after insert on auth.users
for each row execute function private.ctg_accelerate_capture_signup();

-- Existing CTG identities receive a new invite code, but no historical referrals.
insert into public.ctg_accelerate_referral_codes (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- Server-only aggregate; eligibility requires verified investment KYC AND
-- a settled allocation recorded through the canonical Investment OS order.
-- Qualified here means eligibility candidate, never payable/vested reward.
create or replace function public.ctg_accelerate_referral_stats(p_referrer uuid)
returns table (registered_count bigint, qualified_count bigint)
language sql stable security invoker
set search_path = pg_catalog, public
as $$
  select
    count(*)::bigint as registered_count,
    count(*) filter (
      where exists (
        select 1
        from public.investment_participant_profiles ipp
        join public.investment_orders io on io.participant_user_id = ipp.user_id
        where ipp.user_id = a.referred_user_id
          and ipp.kyc_status = 'VERIFIED'
          and io.status = 'ALLOCATED'
          and io.allocation_id is not null
      )
    )::bigint as qualified_count
  from public.ctg_accelerate_referral_attributions a
  where a.referrer_user_id = p_referrer;
$$;

alter table public.ctg_accelerate_referral_codes enable row level security;
alter table public.ctg_accelerate_referral_attributions enable row level security;

revoke all on table public.ctg_accelerate_referral_codes
  from public, anon, authenticated, service_role;
revoke all on table public.ctg_accelerate_referral_attributions
  from public, anon, authenticated, service_role;

-- No browser role can read another person's referral relationship or write any row.
-- Service-role access is used only by authenticated, user-scoped server routes.
grant select on table public.ctg_accelerate_referral_codes to service_role;
grant select on table public.ctg_accelerate_referral_attributions to service_role;
revoke all on function public.ctg_accelerate_referral_stats(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.ctg_accelerate_referral_stats(uuid) to service_role;

-- No referral reward, wallet, Investment OS or CTG Rewards financial ledger
-- mutation has been introduced by this migration.
