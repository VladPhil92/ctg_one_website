-- ============================================================
-- CTG Knowledge v0.1 — permission-aware RAG storage
-- ============================================================
-- Scope: low-risk internal knowledge shared with authenticated CTG One users.
-- Admins curate/publish documents; users can retrieve only published content.
-- No financial/KYC tables or policies are modified by this migration.

create extension if not exists vector with schema extensions;

create table public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 240),
  source_uri text,
  business_unit text not null default 'ctg_one',
  classification text not null default 'internal'
    check (classification in ('internal')),
  status text not null default 'published'
    check (status in ('draft', 'published', 'archived')),
  content_sha256 text not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index knowledge_documents_content_sha256_key
  on public.knowledge_documents(content_sha256);
create index knowledge_documents_status_idx
  on public.knowledge_documents(status, business_unit);

create table public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  content text not null check (char_length(content) > 0),
  token_estimate integer not null default 0 check (token_estimate >= 0),
  embedding_model text not null,
  embedding extensions.vector(1536) not null,
  created_at timestamptz not null default now(),
  unique(document_id, chunk_index)
);

create index knowledge_chunks_document_id_idx
  on public.knowledge_chunks(document_id);

alter table public.knowledge_documents enable row level security;
alter table public.knowledge_chunks enable row level security;

create policy knowledge_documents_authenticated_read
  on public.knowledge_documents
  for select
  to authenticated
  using (status = 'published');

create policy knowledge_documents_admin_insert
  on public.knowledge_documents
  for insert
  to authenticated
  with check (public.is_admin() and created_by = auth.uid());

create policy knowledge_documents_admin_update
  on public.knowledge_documents
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy knowledge_documents_admin_delete
  on public.knowledge_documents
  for delete
  to authenticated
  using (public.is_admin());

create policy knowledge_chunks_authenticated_read
  on public.knowledge_chunks
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.knowledge_documents d
      where d.id = knowledge_chunks.document_id
        and d.status = 'published'
    )
  );

create policy knowledge_chunks_admin_insert
  on public.knowledge_chunks
  for insert
  to authenticated
  with check (
    public.is_admin()
    and exists (
      select 1 from public.knowledge_documents d
      where d.id = knowledge_chunks.document_id
    )
  );

create policy knowledge_chunks_admin_update
  on public.knowledge_chunks
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy knowledge_chunks_admin_delete
  on public.knowledge_chunks
  for delete
  to authenticated
  using (public.is_admin());

-- PostgREST does not expose pgvector distance operators directly, so retrieval
-- is wrapped in a SECURITY INVOKER RPC. RLS remains authoritative for the
-- authenticated caller.
create or replace function public.match_knowledge_chunks(
  query_embedding extensions.vector(1536),
  match_threshold double precision default 0.55,
  match_count integer default 6,
  filter_business_unit text default null
)
returns table (
  chunk_id uuid,
  document_id uuid,
  document_title text,
  source_uri text,
  business_unit text,
  chunk_index integer,
  content text,
  similarity double precision
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    c.id as chunk_id,
    d.id as document_id,
    d.title as document_title,
    d.source_uri,
    d.business_unit,
    c.chunk_index,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.knowledge_chunks c
  join public.knowledge_documents d on d.id = c.document_id
  where d.status = 'published'
    and (filter_business_unit is null or d.business_unit = filter_business_unit)
    and 1 - (c.embedding <=> query_embedding) >= match_threshold
  order by c.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 12);
$$;

grant execute on function public.match_knowledge_chunks(
  extensions.vector, double precision, integer, text
) to authenticated;

comment on table public.knowledge_documents is
  'CTG Knowledge v0.1 curated internal corpus. v0.1 deliberately supports only low-risk internal documents visible to authenticated CTG One users.';
comment on table public.knowledge_chunks is
  'Chunked CTG Knowledge content with text-embedding-3-small-compatible 1536-dimensional vectors.';
