-- 0146 KEV Cognitive Memory Layer
-- Private, service-only memory substrate. No client role receives direct access.

create table if not exists private.kev_memory_items (
 id uuid primary key default gen_random_uuid(),
 memory_type text not null check(memory_type in ('semantic','episodic','entity','operational')),
 scope text not null default 'ctgone',
 subject_key text,
 title text,
 content text not null,
 content_sha256 text generated always as (encode(digest(content,'sha256'),'hex')) stored,
 salience real not null default 0.5 check(salience between 0 and 1),
 confidence real not null default 1 check(confidence between 0 and 1),
 source_kind text not null default 'system',
 source_ref text,
 classification text not null default 'internal' check(classification in ('public','internal','confidential','restricted')),
 status text not null default 'active' check(status in ('active','superseded','expired','deleted')),
 valid_from timestamptz not null default clock_timestamp(),
 valid_until timestamptz,
 last_accessed_at timestamptz,
 access_count bigint not null default 0,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp()
);
alter table private.kev_memory_items enable row level security;
revoke all on private.kev_memory_items from public,anon,authenticated;
grant select,insert,update,delete on private.kev_memory_items to service_role;
create index if not exists kev_memory_items_retrieval_idx on private.kev_memory_items(memory_type,scope,status,classification);
create index if not exists kev_memory_items_subject_idx on private.kev_memory_items(subject_key) where subject_key is not null;
create index if not exists kev_memory_items_recent_idx on private.kev_memory_items(created_at desc);
create unique index if not exists kev_memory_items_source_unique on private.kev_memory_items(source_kind,source_ref,content_sha256) where source_ref is not null;

create table if not exists private.kev_memory_embeddings (
 memory_id uuid primary key references private.kev_memory_items(id) on delete cascade,
 embedding_model text not null,
 embedding extensions.vector(1536) not null,
 embedded_at timestamptz not null default clock_timestamp()
);
alter table private.kev_memory_embeddings enable row level security;
revoke all on private.kev_memory_embeddings from public,anon,authenticated;
grant select,insert,update,delete on private.kev_memory_embeddings to service_role;
create index if not exists kev_memory_embeddings_hnsw_cosine_idx on private.kev_memory_embeddings using hnsw (embedding extensions.vector_cosine_ops);

create table if not exists private.kev_entities (
 id uuid primary key default gen_random_uuid(),
 entity_type text not null,
 canonical_key text not null,
 display_name text not null,
 aliases text[] not null default '{}',
 classification text not null default 'internal' check(classification in ('public','internal','confidential','restricted')),
 attributes jsonb not null default '{}'::jsonb,
 active boolean not null default true,
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 unique(entity_type,canonical_key)
);
alter table private.kev_entities enable row level security;
revoke all on private.kev_entities from public,anon,authenticated;
grant select,insert,update,delete on private.kev_entities to service_role;

create table if not exists private.kev_entity_relations (
 id uuid primary key default gen_random_uuid(),
 source_entity_id uuid not null references private.kev_entities(id) on delete cascade,
 relation_type text not null,
 target_entity_id uuid not null references private.kev_entities(id) on delete cascade,
 confidence real not null default 1 check(confidence between 0 and 1),
 source_memory_id uuid references private.kev_memory_items(id) on delete set null,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default clock_timestamp(),
 unique(source_entity_id,relation_type,target_entity_id)
);
alter table private.kev_entity_relations enable row level security;
revoke all on private.kev_entity_relations from public,anon,authenticated;
grant select,insert,update,delete on private.kev_entity_relations to service_role;
create index if not exists kev_entity_relations_target_idx on private.kev_entity_relations(target_entity_id,relation_type);

create table if not exists private.kev_memory_links (
 from_memory_id uuid not null references private.kev_memory_items(id) on delete cascade,
 relation_type text not null,
 to_memory_id uuid not null references private.kev_memory_items(id) on delete cascade,
 weight real not null default 1 check(weight between 0 and 1),
 created_at timestamptz not null default clock_timestamp(),
 primary key(from_memory_id,relation_type,to_memory_id),
 check(from_memory_id<>to_memory_id)
);
alter table private.kev_memory_links enable row level security;
revoke all on private.kev_memory_links from public,anon,authenticated;
grant select,insert,update,delete on private.kev_memory_links to service_role;

create or replace function private.kev_recall(
 p_query_embedding extensions.vector(1536),
 p_scope text default 'ctgone',
 p_memory_types text[] default null,
 p_max_classification text default 'internal',
 p_limit integer default 12
) returns table(memory_id uuid,memory_type text,title text,content text,subject_key text,classification text,similarity real,salience real,confidence real,metadata jsonb)
language sql stable security invoker set search_path='pg_catalog','private','extensions' as $$
 with ranked as (
 select m.id,m.memory_type,m.title,m.content,m.subject_key,m.classification,
        (1-(e.embedding <=> p_query_embedding))::real similarity,
        m.salience,m.confidence,m.metadata
 from private.kev_memory_items m join private.kev_memory_embeddings e on e.memory_id=m.id
 where m.status='active' and m.scope=p_scope
 and (m.valid_until is null or m.valid_until>clock_timestamp())
 and (p_memory_types is null or m.memory_type=any(p_memory_types))
 and case p_max_classification
   when 'public' then m.classification='public'
   when 'internal' then m.classification in ('public','internal')
   when 'confidential' then m.classification in ('public','internal','confidential')
   when 'restricted' then true else false end
 order by e.embedding <=> p_query_embedding
 limit greatest(1,least(coalesce(p_limit,12),50))
 ) select * from ranked;
$$;
revoke all on function private.kev_recall(extensions.vector,text,text[],text,integer) from public,anon,authenticated;
grant execute on function private.kev_recall(extensions.vector,text,text[],text,integer) to service_role;

-- Existing curated Knowledge corpus gets an ANN index too.
create index if not exists knowledge_chunks_hnsw_cosine_idx on public.knowledge_chunks using hnsw (embedding extensions.vector_cosine_ops);

insert into private.rls_governance_registry(schema_name,table_name,classification,rationale)
values
 ('private','kev_memory_items','service-only','KEV cognitive memory; capability-gated backend access only'),
 ('private','kev_memory_embeddings','service-only','KEV vector memory embeddings; backend access only'),
 ('private','kev_entities','service-only','KEV entity graph; backend access only'),
 ('private','kev_entity_relations','service-only','KEV entity relations; backend access only'),
 ('private','kev_memory_links','service-only','KEV memory graph links; backend access only')
on conflict(schema_name,table_name) do update set classification=excluded.classification,rationale=excluded.rationale,reviewed_at=clock_timestamp();
