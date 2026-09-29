-- 0149 KEV Context Assembly & governed memory recall
insert into private.kev_capabilities(capability,description,risk_tier,enabled) values
('kev:memory:read','Retrieve governed KEV cognitive memory for context assembly','read',true),
('kev:memory:write','Create and consolidate governed KEV cognitive memory','controlled-write',true),
('kev:memory:admin','Manage retention, classification and lifecycle of KEV memory','privileged',true)
on conflict(capability) do update set description=excluded.description,risk_tier=excluded.risk_tier,enabled=excluded.enabled;

create table if not exists private.kev_context_assembly_audit(
 id bigint generated always as identity primary key,
 principal_key text not null,
 query_sha256 text not null,
 scope text not null,
 max_classification text not null,
 requested_limit integer not null,
 returned_memory_ids uuid[] not null default '{}',
 occurred_at timestamptz not null default clock_timestamp()
);
alter table private.kev_context_assembly_audit enable row level security;
revoke all on private.kev_context_assembly_audit from public,anon,authenticated;
grant select,insert on private.kev_context_assembly_audit to service_role;
create index if not exists kev_context_assembly_audit_principal_idx on private.kev_context_assembly_audit(principal_key,occurred_at desc);

create or replace function private.kev_recall_authorized(
 p_principal_key text,p_query_sha256 text,p_query_embedding extensions.vector(1536),
 p_scope text default 'ctgone',p_memory_types text[] default null,p_max_classification text default 'internal',p_limit integer default 12
) returns table(memory_id uuid,memory_type text,title text,content text,subject_key text,classification text,similarity real,salience real,confidence real,metadata jsonb)
language plpgsql security invoker set search_path='pg_catalog','private','extensions' as $$
declare ids uuid[];
begin
 if not private.kev_has_capability(p_principal_key,'kev:memory:read') then
  insert into private.kev_capability_audit(principal_id,capability,action,resource,allowed,reason,metadata)
  select p.id,'kev:memory:read','recall','memory',false,'capability denied',jsonb_build_object('scope',p_scope)
  from private.kev_principals p where p.principal_key=p_principal_key;
  raise exception 'memory recall capability denied';
 end if;
 select array_agg(r.memory_id) into ids from private.kev_recall(p_query_embedding,p_scope,p_memory_types,p_max_classification,p_limit) r;
 insert into private.kev_context_assembly_audit(principal_key,query_sha256,scope,max_classification,requested_limit,returned_memory_ids)
 values(p_principal_key,p_query_sha256,p_scope,p_max_classification,greatest(1,least(coalesce(p_limit,12),50)),coalesce(ids,'{}'));
 return query select * from private.kev_recall(p_query_embedding,p_scope,p_memory_types,p_max_classification,p_limit);
end $$;
revoke all on function private.kev_recall_authorized(text,text,extensions.vector,text,text[],text,integer) from public,anon,authenticated;
grant execute on function private.kev_recall_authorized(text,text,extensions.vector,text,text[],text,integer) to service_role;

insert into private.rls_governance_registry(schema_name,table_name,classification,rationale)
values('private','kev_context_assembly_audit','service-only','Audit trail for governed memory context assembly')
on conflict(schema_name,table_name) do update set classification=excluded.classification,rationale=excluded.rationale,reviewed_at=clock_timestamp();
