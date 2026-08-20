-- ============================================================
-- CTG One — KYC transactional resilience
-- ============================================================
-- The participant KYC flow is now retry-safe across the Postgres/Storage
-- boundary:
--
--   DRAFT -> deterministic Storage upsert -> document registration -> PENDING
--
-- profiles.kyc_status moves to PENDING only after both required objects are
-- durably present and the DRAFT->PENDING database transition succeeds.

alter table public.kyc_submissions
  drop constraint if exists kyc_submissions_status_check;

alter table public.kyc_submissions
  add constraint kyc_submissions_status_check
  check (status in ('draft', 'pending', 'verified', 'rejected'));

alter table public.kyc_submissions
  add column if not exists client_request_id uuid,
  add column if not exists submitted_at timestamptz;

update public.kyc_submissions
set submitted_at = coalesce(submitted_at, created_at)
where status in ('pending', 'verified', 'rejected');

create unique index if not exists kyc_submissions_user_request_key
  on public.kyc_submissions (user_id, client_request_id)
  where client_request_id is not null;

create unique index if not exists kyc_submissions_one_draft_per_user
  on public.kyc_submissions (user_id)
  where status = 'draft';

create unique index if not exists kyc_documents_submission_document_type_key
  on public.kyc_documents (submission_id, document_type);

-- 0002 marked profiles pending immediately on row creation. DRAFT rows must
-- remain invisible to the review lifecycle until both document objects exist.
drop trigger if exists on_kyc_submission_created on public.kyc_submissions;
drop function if exists public.handle_new_kyc_submission();

drop policy if exists kyc_submissions_insert on public.kyc_submissions;
create policy kyc_submissions_insert on public.kyc_submissions
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'draft'
    and client_request_id is not null
  );

drop policy if exists kyc_documents_insert on public.kyc_documents;
create policy kyc_documents_insert on public.kyc_documents
  for insert to authenticated
  with check (
    document_type in ('cedula_front', 'cedula_back')
    and exists (
      select 1
      from public.kyc_submissions s
      where s.id = kyc_documents.submission_id
        and s.user_id = (select auth.uid())
        and s.status = 'draft'
    )
    and storage_path =
      (select auth.uid())::text || '/' ||
      submission_id::text || '/' ||
      document_type
    and exists (
      select 1
      from storage.objects o
      where o.bucket_id = 'kyc-documents'
        and o.name = storage_path
    )
  );

-- Authenticated users may only update the two lifecycle columns. RLS below
-- permits exactly DRAFT -> PENDING when both required registered objects exist.
revoke update on public.kyc_submissions from authenticated;
grant update (status, submitted_at) on public.kyc_submissions to authenticated;

drop policy if exists kyc_submissions_finalize_draft on public.kyc_submissions;
create policy kyc_submissions_finalize_draft on public.kyc_submissions
  for update to authenticated
  using (
    user_id = (select auth.uid())
    and status = 'draft'
  )
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
    and submitted_at is not null
    and (
      select count(distinct d.document_type)
      from public.kyc_documents d
      join storage.objects o
        on o.bucket_id = 'kyc-documents'
       and o.name = d.storage_path
      where d.submission_id = kyc_submissions.id
        and d.document_type in ('cedula_front', 'cedula_back')
    ) = 2
  );

create or replace function public.guard_kyc_draft_finalization()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if old.status = 'draft' then
    if new.status <> 'pending' then
      raise exception 'kyc draft may only transition to pending';
    end if;
    new.submitted_at := now();
  end if;
  return new;
end;
$$;

revoke all on function public.guard_kyc_draft_finalization() from public, anon, authenticated;

drop trigger if exists guard_kyc_draft_finalization on public.kyc_submissions;
create trigger guard_kyc_draft_finalization
  before update of status, submitted_at on public.kyc_submissions
  for each row
  when (old.status = 'draft')
  execute function public.guard_kyc_draft_finalization();

create or replace function public.handle_kyc_submission_finalized()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'draft' and new.status = 'pending' then
    update public.profiles
      set kyc_status = 'pending'
      where id = new.user_id
        and kyc_status <> 'verified';
  end if;
  return new;
end;
$$;

revoke all on function public.handle_kyc_submission_finalized() from public, anon, authenticated;

drop trigger if exists on_kyc_submission_finalized on public.kyc_submissions;
create trigger on_kyc_submission_finalized
  after update of status on public.kyc_submissions
  for each row
  when (old.status = 'draft' and new.status = 'pending')
  execute function public.handle_kyc_submission_finalized();

create or replace function public.begin_kyc_submission(p_request_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_submission public.kyc_submissions%rowtype;
  v_profile_status text;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;
  if p_request_id is null then
    raise exception 'request id required';
  end if;

  select kyc_status
    into v_profile_status
    from public.profiles
    where id = v_user_id;

  if v_profile_status is null then
    raise exception 'profile not found';
  end if;

  select *
    into v_submission
    from public.kyc_submissions
    where user_id = v_user_id
      and client_request_id = p_request_id
    order by created_at desc
    limit 1;

  if v_submission.id is not null then
    return jsonb_build_object('id', v_submission.id, 'status', v_submission.status);
  end if;

  if v_profile_status = 'verified' then
    raise exception 'kyc already verified';
  end if;

  if v_profile_status = 'pending' then
    select *
      into v_submission
      from public.kyc_submissions
      where user_id = v_user_id
        and status = 'pending'
      order by created_at desc
      limit 1;

    if v_submission.id is null then
      raise exception 'kyc profile is pending without a pending submission';
    end if;

    return jsonb_build_object('id', v_submission.id, 'status', v_submission.status);
  end if;

  select *
    into v_submission
    from public.kyc_submissions
    where user_id = v_user_id
      and status = 'draft'
    order by created_at desc
    limit 1;

  if v_submission.id is not null then
    return jsonb_build_object('id', v_submission.id, 'status', v_submission.status);
  end if;

  begin
    insert into public.kyc_submissions (user_id, status, client_request_id)
    values (v_user_id, 'draft', p_request_id)
    returning * into v_submission;
  exception
    when unique_violation then
      select *
        into v_submission
        from public.kyc_submissions
        where user_id = v_user_id
          and status = 'draft'
        order by created_at desc
        limit 1;
  end;

  if v_submission.id is null then
    raise exception 'unable to initialize kyc draft';
  end if;

  return jsonb_build_object('id', v_submission.id, 'status', v_submission.status);
end;
$$;

create or replace function public.register_kyc_document(
  p_submission_id uuid,
  p_document_type text,
  p_storage_path text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_expected_path text;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;
  if p_document_type not in ('cedula_front', 'cedula_back') then
    raise exception 'unsupported kyc document type';
  end if;

  v_expected_path :=
    v_user_id::text || '/' ||
    p_submission_id::text || '/' ||
    p_document_type;

  if p_storage_path <> v_expected_path then
    raise exception 'invalid kyc storage path';
  end if;

  if not exists (
    select 1
    from public.kyc_submissions s
    where s.id = p_submission_id
      and s.user_id = v_user_id
      and s.status = 'draft'
  ) then
    raise exception 'editable kyc draft not found';
  end if;

  if not exists (
    select 1
    from storage.objects o
    where o.bucket_id = 'kyc-documents'
      and o.name = p_storage_path
  ) then
    raise exception 'kyc storage object not found';
  end if;

  insert into public.kyc_documents (submission_id, document_type, storage_path)
  values (p_submission_id, p_document_type, p_storage_path)
  on conflict (submission_id, document_type) do nothing;
end;
$$;

create or replace function public.finalize_kyc_submission(p_submission_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_status text;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  select status
    into v_status
    from public.kyc_submissions
    where id = p_submission_id
      and user_id = v_user_id;

  if v_status is null then
    raise exception 'submission not found';
  end if;

  if v_status = 'pending' then
    return;
  end if;

  if v_status <> 'draft' then
    raise exception 'submission cannot be finalized from status %', v_status;
  end if;

  update public.kyc_submissions
    set status = 'pending',
        submitted_at = now()
    where id = p_submission_id
      and user_id = v_user_id
      and status = 'draft';

  if not found then
    raise exception 'kyc finalization failed';
  end if;
end;
$$;

revoke all on function public.begin_kyc_submission(uuid) from public, anon;
revoke all on function public.register_kyc_document(uuid, text, text) from public, anon;
revoke all on function public.finalize_kyc_submission(uuid) from public, anon;
grant execute on function public.begin_kyc_submission(uuid) to authenticated;
grant execute on function public.register_kyc_document(uuid, text, text) to authenticated;
grant execute on function public.finalize_kyc_submission(uuid) to authenticated;

-- Supabase Storage upsert requires SELECT + INSERT + UPDATE policies. SELECT
-- already exists from 0001. INSERT is narrowed to DRAFT submissions and UPDATE
-- is added with the same ownership/state guard.
drop policy if exists kyc_documents_storage_insert on storage.objects;
create policy kyc_documents_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'kyc-documents'
    and split_part(name, '/', 1) = (select auth.uid())::text
    and array_length(string_to_array(name, '/'), 1) = 3
    and split_part(name, '/', 3) in ('cedula_front', 'cedula_back')
    and exists (
      select 1
      from public.kyc_submissions s
      where s.id::text = split_part(name, '/', 2)
        and s.user_id = (select auth.uid())
        and s.status = 'draft'
    )
  );

drop policy if exists kyc_documents_storage_update on storage.objects;
create policy kyc_documents_storage_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'kyc-documents'
    and split_part(name, '/', 1) = (select auth.uid())::text
    and exists (
      select 1
      from public.kyc_submissions s
      where s.id::text = split_part(name, '/', 2)
        and s.user_id = (select auth.uid())
        and s.status = 'draft'
    )
  )
  with check (
    bucket_id = 'kyc-documents'
    and split_part(name, '/', 1) = (select auth.uid())::text
    and array_length(string_to_array(name, '/'), 1) = 3
    and split_part(name, '/', 3) in ('cedula_front', 'cedula_back')
    and exists (
      select 1
      from public.kyc_submissions s
      where s.id::text = split_part(name, '/', 2)
        and s.user_id = (select auth.uid())
        and s.status = 'draft'
    )
  );

comment on function public.begin_kyc_submission(uuid) is
  'Idempotently creates/reuses an authenticated user KYC draft without marking the profile pending.';
comment on function public.register_kyc_document(uuid, text, text) is
  'Registers a required KYC document only after its deterministic private Storage object exists.';
comment on function public.finalize_kyc_submission(uuid) is
  'Transitions a complete authenticated-user KYC draft to pending; RLS verifies both durable documents and an after-trigger updates the profile in the same transaction.';
