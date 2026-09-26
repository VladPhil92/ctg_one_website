-- 0145: KEV capability + RLS governance foundation.
-- Existing no-policy RLS tables are already deny-all to anon/authenticated at
-- both RLS and GRANT layers. Record that invariant explicitly and add a
-- least-privilege capability registry for KEV/service principals.

create table if not exists private.rls_governance_registry (
  schema_name text not null,
  table_name text not null,
  classification text not null check (classification in ('service-only','user-owned','admin-only','public-read')),
  rationale text not null,
  reviewed_at timestamptz not null default clock_timestamp(),
  primary key (schema_name, table_name)
);
alter table private.rls_governance_registry enable row level security;
revoke all on table private.rls_governance_registry from public, anon, authenticated;
grant select,insert,update,delete on table private.rls_governance_registry to service_role;

insert into private.rls_governance_registry(schema_name,table_name,classification,rationale)
select n.nspname,c.relname,'service-only',
       'RLS enabled, no client policies, and no anon/authenticated table privileges at 0145 review'
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where c.relkind='r' and c.relrowsecurity and n.nspname in ('public','private')
and not exists(select 1 from pg_policies p where p.schemaname=n.nspname and p.tablename=c.relname)
and not has_table_privilege('anon',c.oid,'SELECT')
and not has_table_privilege('anon',c.oid,'INSERT')
and not has_table_privilege('authenticated',c.oid,'SELECT')
and not has_table_privilege('authenticated',c.oid,'INSERT')
and not has_table_privilege('authenticated',c.oid,'UPDATE')
and not has_table_privilege('authenticated',c.oid,'DELETE')
on conflict(schema_name,table_name) do update
set classification=excluded.classification,rationale=excluded.rationale,reviewed_at=clock_timestamp();

create table if not exists private.kev_capabilities (
  capability text primary key,
  description text not null,
  risk_tier text not null check (risk_tier in ('read','controlled-write','privileged')),
  enabled boolean not null default true,
  created_at timestamptz not null default clock_timestamp()
);
alter table private.kev_capabilities enable row level security;
revoke all on table private.kev_capabilities from public, anon, authenticated;
grant select on table private.kev_capabilities to service_role;

insert into private.kev_capabilities(capability,description,risk_tier) values
 ('kev:knowledge:read','Retrieve approved knowledge and semantic context','read'),
 ('kev:analytics:read','Read approved aggregate analytics','read'),
 ('kev:apps:observe','Observe approved application/runtime state','read'),
 ('kev:users:context','Read minimum authorized user context','read'),
 ('kev:wallet:read','Read authorized wallet state','read'),
 ('kev:apps:operate','Perform explicitly authorized application operations','controlled-write'),
 ('kev:wallet:execute','Perform explicitly authorized wallet operations','privileged'),
 ('kev:admin:diagnostics','Access privileged operational diagnostics','privileged')
on conflict(capability) do update set description=excluded.description,risk_tier=excluded.risk_tier;

create table if not exists private.kev_principals (
  principal_id uuid primary key default gen_random_uuid(),
  principal_key text not null unique,
  principal_type text not null check (principal_type in ('service','agent','user')),
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default clock_timestamp()
);
alter table private.kev_principals enable row level security;
revoke all on table private.kev_principals from public, anon, authenticated;
grant select,insert,update,delete on table private.kev_principals to service_role;

create table if not exists private.kev_principal_capabilities (
  principal_id uuid not null references private.kev_principals(principal_id) on delete cascade,
  capability text not null references private.kev_capabilities(capability) on delete cascade,
  granted_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  primary key(principal_id,capability)
);
alter table private.kev_principal_capabilities enable row level security;
revoke all on table private.kev_principal_capabilities from public, anon, authenticated;
grant select,insert,update,delete on table private.kev_principal_capabilities to service_role;

create table if not exists private.kev_capability_audit (
  id bigint generated always as identity primary key,
  principal_id uuid references private.kev_principals(principal_id) on delete set null,
  capability text,
  action text not null,
  resource text,
  allowed boolean not null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default clock_timestamp()
);
alter table private.kev_capability_audit enable row level security;
revoke all on table private.kev_capability_audit from public, anon, authenticated;
grant select,insert on table private.kev_capability_audit to service_role;

create index if not exists kev_capability_audit_principal_occurred_idx
on private.kev_capability_audit(principal_id,occurred_at desc);

create or replace function private.kev_has_capability(p_principal_key text,p_capability text)
returns boolean language sql stable security invoker set search_path='pg_catalog','private' as $$
 select exists(
   select 1 from private.kev_principals p
   join private.kev_principal_capabilities pc on pc.principal_id=p.principal_id
   join private.kev_capabilities c on c.capability=pc.capability
   where p.principal_key=p_principal_key and p.active
     and c.capability=p_capability and c.enabled
     and (pc.expires_at is null or pc.expires_at>clock_timestamp())
 );
$$;
revoke all on function private.kev_has_capability(text,text) from public,anon,authenticated;
grant execute on function private.kev_has_capability(text,text) to service_role;

-- Public read-only RPCs intentionally remain callable by anon. Harden their
-- search path against object shadowing; they expose only curated projections.
alter function public.get_public_bottle_trace(text) set search_path='pg_catalog','public';
alter function public.get_public_investment_lot_funding(uuid) set search_path='pg_catalog','public';
alter function public.get_public_investment_lot_operations(uuid) set search_path='pg_catalog','public';
