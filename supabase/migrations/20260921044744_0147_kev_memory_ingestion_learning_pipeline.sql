-- 0147 KEV Memory Ingestion & Learning Pipeline
create table if not exists private.kev_memory_ingestion_jobs (
 id uuid primary key default gen_random_uuid(),
 source_kind text not null,
 source_ref text not null,
 memory_type text not null check(memory_type in ('semantic','episodic','entity','operational')),
 scope text not null default 'ctgone',
 classification text not null default 'internal' check(classification in ('public','internal','confidential','restricted')),
 payload jsonb not null,
 payload_sha256 text generated always as (encode(digest(payload::text,'sha256'),'hex')) stored,
 status text not null default 'pending' check(status in ('pending','processing','embedded','completed','retry','failed','discarded')),
 attempt_count integer not null default 0,
 available_at timestamptz not null default clock_timestamp(),
 lease_token uuid,
 lease_expires_at timestamptz,
 last_error text,
 memory_id uuid references private.kev_memory_items(id) on delete set null,
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 completed_at timestamptz,
 unique(source_kind,source_ref,payload_sha256)
);
alter table private.kev_memory_ingestion_jobs enable row level security;
revoke all on private.kev_memory_ingestion_jobs from public,anon,authenticated;
grant select,insert,update,delete on private.kev_memory_ingestion_jobs to service_role;
create index if not exists kev_memory_ingestion_jobs_ready_idx on private.kev_memory_ingestion_jobs(status,available_at) where status in ('pending','retry');
create index if not exists kev_memory_ingestion_jobs_lease_idx on private.kev_memory_ingestion_jobs(lease_expires_at) where status='processing';

create table if not exists private.kev_memory_retention_policies (
 memory_type text not null,
 classification text not null,
 retention_days integer,
 max_items_per_subject integer,
 enabled boolean not null default true,
 primary key(memory_type,classification),
 check(retention_days is null or retention_days>0),
 check(max_items_per_subject is null or max_items_per_subject>0)
);
alter table private.kev_memory_retention_policies enable row level security;
revoke all on private.kev_memory_retention_policies from public,anon,authenticated;
grant select,insert,update,delete on private.kev_memory_retention_policies to service_role;
insert into private.kev_memory_retention_policies values
 ('semantic','public',null,null,true),('semantic','internal',null,null,true),
 ('episodic','internal',365,500,true),('operational','internal',180,500,true),
 ('entity','internal',null,null,true)
on conflict do nothing;

create or replace function private.kev_enqueue_memory(
 p_source_kind text,p_source_ref text,p_memory_type text,p_payload jsonb,
 p_scope text default 'ctgone',p_classification text default 'internal'
) returns uuid language plpgsql security invoker set search_path='pg_catalog','private','public' as $$
declare v_id uuid;
begin
 if p_payload is null or p_payload='null'::jsonb then raise exception 'payload required'; end if;
 insert into private.kev_memory_ingestion_jobs(source_kind,source_ref,memory_type,payload,scope,classification)
 values(trim(p_source_kind),trim(p_source_ref),p_memory_type,p_payload,p_scope,p_classification)
 on conflict(source_kind,source_ref,payload_sha256) do update set updated_at=clock_timestamp()
 returning id into v_id;
 return v_id;
end $$;
revoke all on function private.kev_enqueue_memory(text,text,text,jsonb,text,text) from public,anon,authenticated;
grant execute on function private.kev_enqueue_memory(text,text,text,jsonb,text,text) to service_role;

create or replace function private.kev_claim_memory_jobs(p_limit integer default 20,p_lease_seconds integer default 120)
returns setof private.kev_memory_ingestion_jobs language plpgsql security invoker set search_path='pg_catalog','private' as $$
declare v_token uuid:=gen_random_uuid();
begin
 return query
 with picked as (
  select id from private.kev_memory_ingestion_jobs
  where status in ('pending','retry') and available_at<=clock_timestamp()
    and (lease_expires_at is null or lease_expires_at<clock_timestamp())
  order by available_at,created_at for update skip locked limit greatest(1,least(coalesce(p_limit,20),100))
 ), upd as (
  update private.kev_memory_ingestion_jobs j set status='processing',lease_token=v_token,
   lease_expires_at=clock_timestamp()+make_interval(secs=>greatest(30,least(coalesce(p_lease_seconds,120),900))),
   attempt_count=j.attempt_count+1,updated_at=clock_timestamp()
  from picked where j.id=picked.id returning j.*
 ) select * from upd;
end $$;
revoke all on function private.kev_claim_memory_jobs(integer,integer) from public,anon,authenticated;
grant execute on function private.kev_claim_memory_jobs(integer,integer) to service_role;

create or replace function private.kev_complete_memory_job(
 p_job_id uuid,p_lease_token uuid,p_content text,p_title text default null,p_subject_key text default null,
 p_salience real default 0.5,p_confidence real default 1,p_metadata jsonb default '{}'::jsonb
) returns uuid language plpgsql security invoker set search_path='pg_catalog','private' as $$
declare j private.kev_memory_ingestion_jobs%rowtype; mid uuid;
begin
 select * into j from private.kev_memory_ingestion_jobs where id=p_job_id for update;
 if j.id is null or j.status<>'processing' or j.lease_token is distinct from p_lease_token then raise exception 'invalid or expired job lease'; end if;
 if j.lease_expires_at<clock_timestamp() then raise exception 'job lease expired'; end if;
 insert into private.kev_memory_items(memory_type,scope,subject_key,title,content,salience,confidence,source_kind,source_ref,classification,metadata)
 values(j.memory_type,j.scope,p_subject_key,p_title,p_content,greatest(0,least(coalesce(p_salience,.5),1)),greatest(0,least(coalesce(p_confidence,1),1)),j.source_kind,j.source_ref,j.classification,coalesce(p_metadata,'{}'::jsonb))
 on conflict(source_kind,source_ref,content_sha256) where source_ref is not null
 do update set title=excluded.title,subject_key=excluded.subject_key,salience=excluded.salience,confidence=excluded.confidence,metadata=excluded.metadata,updated_at=clock_timestamp()
 returning id into mid;
 update private.kev_memory_ingestion_jobs set status='embedded',memory_id=mid,lease_expires_at=null,updated_at=clock_timestamp() where id=p_job_id;
 return mid;
end $$;
revoke all on function private.kev_complete_memory_job(uuid,uuid,text,text,text,real,real,jsonb) from public,anon,authenticated;
grant execute on function private.kev_complete_memory_job(uuid,uuid,text,text,text,real,real,jsonb) to service_role;

create or replace function private.kev_store_memory_embedding(p_job_id uuid,p_memory_id uuid,p_model text,p_embedding extensions.vector(1536))
returns void language plpgsql security invoker set search_path='pg_catalog','private','extensions' as $$
begin
 insert into private.kev_memory_embeddings(memory_id,embedding_model,embedding) values(p_memory_id,p_model,p_embedding)
 on conflict(memory_id) do update set embedding_model=excluded.embedding_model,embedding=excluded.embedding,embedded_at=clock_timestamp();
 update private.kev_memory_ingestion_jobs set status='completed',completed_at=clock_timestamp(),updated_at=clock_timestamp()
 where id=p_job_id and memory_id=p_memory_id and status='embedded';
end $$;
revoke all on function private.kev_store_memory_embedding(uuid,uuid,text,extensions.vector) from public,anon,authenticated;
grant execute on function private.kev_store_memory_embedding(uuid,uuid,text,extensions.vector) to service_role;

create or replace function private.kev_fail_memory_job(p_job_id uuid,p_lease_token uuid,p_error text)
returns void language plpgsql security invoker set search_path='pg_catalog','private' as $$
begin
 update private.kev_memory_ingestion_jobs set
 status=case when attempt_count>=5 then 'failed' else 'retry' end,
 available_at=case when attempt_count>=5 then available_at else clock_timestamp()+make_interval(secs=>least(3600,30*power(2,greatest(attempt_count-1,0))::integer)) end,
 last_error=left(p_error,2000),lease_token=null,lease_expires_at=null,updated_at=clock_timestamp()
 where id=p_job_id and status='processing' and lease_token=p_lease_token;
end $$;
revoke all on function private.kev_fail_memory_job(uuid,uuid,text) from public,anon,authenticated;
grant execute on function private.kev_fail_memory_job(uuid,uuid,text) to service_role;

-- Curated knowledge can be explicitly queued; no trigger copies confidential content implicitly.
create or replace function private.kev_enqueue_approved_knowledge(p_document_id uuid)
returns integer language plpgsql security invoker set search_path='pg_catalog','private','public' as $$
declare d public.knowledge_documents%rowtype; c record; n integer:=0;
begin
 select * into d from public.knowledge_documents where id=p_document_id;
 if d.id is null or d.status not in ('ACTIVE','PUBLISHED','APPROVED','active','published','approved') then raise exception 'knowledge document is not approved/active'; end if;
 for c in select * from public.knowledge_chunks where document_id=d.id order by chunk_index loop
  perform private.kev_enqueue_memory('knowledge_chunk',c.id::text,'semantic',
   jsonb_build_object('content',c.content,'document_id',d.id,'chunk_index',c.chunk_index,'title',d.title,'business_unit',d.business_unit),
   d.business_unit,case when d.classification in ('public','internal','confidential','restricted') then d.classification else 'internal' end);
  n:=n+1;
 end loop;
 return n;
end $$;
revoke all on function private.kev_enqueue_approved_knowledge(uuid) from public,anon,authenticated;
grant execute on function private.kev_enqueue_approved_knowledge(uuid) to service_role;

insert into private.rls_governance_registry(schema_name,table_name,classification,rationale) values
('private','kev_memory_ingestion_jobs','service-only','Asynchronous KEV memory ingestion queue; backend only'),
('private','kev_memory_retention_policies','service-only','KEV memory lifecycle governance; backend only')
on conflict(schema_name,table_name) do update set classification=excluded.classification,rationale=excluded.rationale,reviewed_at=clock_timestamp();
