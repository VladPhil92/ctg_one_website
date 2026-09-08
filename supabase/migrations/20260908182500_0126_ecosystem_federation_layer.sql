-- CTG One ecosystem federation layer
-- Keeps product accounts independent while recording explicit identity links.

create table if not exists public.ecosystem_apps (
  id text primary key,
  name text not null,
  origin text not null,
  dashboard_path text not null default '/dashboard',
  federation_start_path text not null,
  status text not null default 'active'
    check (status in ('active', 'maintenance', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.ecosystem_apps is
  'Registry of CTG One ecosystem products. Product dashboards and sessions remain independent.';

create table if not exists public.ecosystem_identity_links (
  id uuid primary key default gen_random_uuid(),
  ctg_user_id uuid not null references auth.users (id) on delete cascade,
  app_id text not null references public.ecosystem_apps (id) on delete cascade,
  external_user_id text not null,
  status text not null default 'linked'
    check (status in ('linked', 'suspended', 'revoked')),
  assurance_level smallint not null default 0
    check (assurance_level between 0 and 4),
  provisioning_source text not null default 'ctg_one',
  linked_at timestamptz not null default now(),
  last_login_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique (ctg_user_id, app_id),
  unique (app_id, external_user_id)
);

comment on table public.ecosystem_identity_links is
  'Explicit CTG One user ↔ product-local user links. Email similarity alone never creates a link.';

create index if not exists ecosystem_identity_links_ctg_user_idx
  on public.ecosystem_identity_links (ctg_user_id);
create index if not exists ecosystem_identity_links_app_idx
  on public.ecosystem_identity_links (app_id, status);

alter table public.ecosystem_apps enable row level security;
alter table public.ecosystem_identity_links enable row level security;

drop policy if exists ecosystem_apps_authenticated_read on public.ecosystem_apps;
create policy ecosystem_apps_authenticated_read
  on public.ecosystem_apps
  for select
  to authenticated
  using (status <> 'disabled');

drop policy if exists ecosystem_identity_links_self_read on public.ecosystem_identity_links;
create policy ecosystem_identity_links_self_read
  on public.ecosystem_identity_links
  for select
  to authenticated
  using (ctg_user_id = auth.uid());

insert into public.ecosystem_apps (
  id,
  name,
  origin,
  dashboard_path,
  federation_start_path,
  status
) values (
  'vertice',
  'VÉRTICE',
  'https://vertice.ctgone.com',
  '/dashboard',
  '/auth/ctgone/start',
  'active'
)
on conflict (id) do update set
  name = excluded.name,
  origin = excluded.origin,
  dashboard_path = excluded.dashboard_path,
  federation_start_path = excluded.federation_start_path,
  status = excluded.status,
  updated_at = now();
