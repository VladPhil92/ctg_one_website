-- Extend the server-only CTG One federation authorization-code store to PISÁO.
-- Keep an explicit allow-list so arbitrary provider identifiers remain rejected.

alter table public.identity_federation_authorization_codes
  drop constraint if exists identity_federation_authorization_codes_provider_check;

alter table public.identity_federation_authorization_codes
  add constraint identity_federation_authorization_codes_provider_check
  check (provider in ('vertice', 'pisao'));

comment on column public.identity_federation_authorization_codes.provider is
  'Explicitly allow-listed CTG One federation relying party: vertice or pisao.';
