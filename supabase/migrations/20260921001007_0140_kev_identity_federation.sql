-- Add Kev as an explicitly allow-listed CTG One federation relying party.
-- Root authority is a server-managed attestation and is never inferred from
-- browser-supplied email/role claims.

alter table public.identity_federation_authorization_codes
  drop constraint if exists identity_federation_authorization_codes_provider_check;

alter table public.identity_federation_authorization_codes
  add constraint identity_federation_authorization_codes_provider_check
  check (provider in ('vertice', 'pisao', 'nvet', 'kev'));

comment on column public.identity_federation_authorization_codes.provider is
  'Explicitly allow-listed CTG One federation relying party: vertice, pisao, nvet, or kev.';

-- Bootstrap Kev root authority only when CTG One has exactly one server-managed
-- admin profile. On the current production dataset this resolves to the
-- authenticated CTG One superadmin; no email address is embedded here.
insert into public.identity_federation_authorities (provider, subject_user_id, authority)
select 'kev', p.id, 'root_superadmin'
from public.profiles p
where p.role = 'admin'
  and (select count(*) from public.profiles where role = 'admin') = 1
on conflict (provider, subject_user_id, authority) do update
set revoked_at = null;
