-- Sovereign, server-only authority attestation for downstream federated services.
-- This table is intentionally inaccessible to anon/authenticated roles: only the
-- service-role federation boundary may evaluate or administer these attestations.

create table if not exists public.vertice_federation_authorities (
  subject_user_id uuid primary key references auth.users(id) on delete restrict,
  authority text not null check (authority in ('bootstrap_superadmin')),
  is_active boolean not null default true,
  granted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.vertice_federation_authorities enable row level security;
revoke all on table public.vertice_federation_authorities from anon, authenticated;

comment on table public.vertice_federation_authorities is
  'Server-only CTG One authority attestations consumed by trusted downstream federation.';

-- Bootstrap deterministically from the sole current CTG One administrator.
-- No personal UUID or email is committed to source control.
insert into public.vertice_federation_authorities (subject_user_id, authority)
select p.id, 'bootstrap_superadmin'
from public.profiles p
where p.role = 'admin'
  and 1 = (
    select count(*)
    from public.profiles admins
    where admins.role = 'admin'
  )
on conflict (subject_user_id) do nothing;
