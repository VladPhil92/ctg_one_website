-- Server-managed authorities exported through CTG One federation.
-- No client role can read or mutate this table; service_role is used only by
-- the server-side federation exchange endpoint.

create table if not exists public.identity_federation_authorities (
  provider text not null,
  subject_user_id uuid not null references auth.users(id) on delete cascade,
  authority text not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz null,
  primary key (provider, subject_user_id, authority)
);

alter table public.identity_federation_authorities enable row level security;
revoke all on table public.identity_federation_authorities from anon, authenticated;
grant select on table public.identity_federation_authorities to service_role;

create index if not exists idx_identity_federation_authorities_active
  on public.identity_federation_authorities(provider, authority, subject_user_id)
  where revoked_at is null;

-- Bootstrap only when CTG One has exactly one server-managed admin profile.
-- No identifier is embedded in source control. On empty/dev databases this
-- inserts nothing; on the current production dataset it identifies the sole
-- administrative identity deterministically.
insert into public.identity_federation_authorities (provider, subject_user_id, authority)
select 'vertice', p.id, 'bootstrap_superadmin'
from public.profiles p
where p.role = 'admin'
  and (select count(*) from public.profiles where role = 'admin') = 1
on conflict (provider, subject_user_id, authority) do update
set revoked_at = null;
