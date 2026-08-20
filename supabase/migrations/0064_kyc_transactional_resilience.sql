-- ============================================================
-- P3.1 — KYC Transactional Resilience
-- ============================================================
-- Replaces the browser-managed create/upload/insert sequence with an
-- explicit intake protocol:
--   begin -> deterministic uploads -> idempotent document registration
--   -> atomic finalize.
--
-- A submission is invisible to the review queue until finalize succeeds.
-- Finalization verifies both durable document rows and the corresponding
-- private Storage objects in the same database transaction before moving
-- the participant profile to pending KYC review.

alter table public.kyc_submissions
  add column if not exists intake_state text not null default 'submitted'
    check (intake_state in ('uploading', 'submitted')),
  add column if not exists submitted_at timestamptz;

update public.kyc_submissions
set submitted_at = coalesce(submitted_at, created_at)
where intake_state = 'submitted' and submitted_at is null;

-- Exactly one resumable intake may exist per participant. The partial unique
-- index is the database-level concurrency guard: two simultaneous browser
-- attempts cannot manufacture duplicate unfinished submissions.
create unique index if not exists kyc_submissions_one_uploading_per_user
  on public.kyc_submissions (user_id)
  where intake_state = 'uploading';

create unique index if not exists kyc_documents_submission_type_key
  on public.kyc_documents (submission_id, document_type);

-- Browser clients must no longer create KYC rows/documents directly.
drop policy if exists kyc_submissions_insert on public.kyc_submissions;
drop policy if exists kyc_documents_insert on public.kyc_documents;

create or replace function public.begin_kyc_submission()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_submission_id uuid;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  select id
    into v_submission_id
    from public.kyc_submissions
   where user_id = v_user_id
     and intake_state = 'uploading'
   order by created_at desc
   limit 1
   for update;

  if v_submission_id is not null then
    return v_submission_id;
  end if;

  if exists (
    select 1
      from public.kyc_submissions
     where user_id = v_user_id
       and intake_state = 'submitted'
       and status = 'pending'
  ) then
    raise exception 'kyc submission already pending';
  end if;

  begin
    insert into public.kyc_submissions (user_id, status, intake_state, submitted_at)
    values (v_user_id, 'pending', 'uploading', null)
    returning id into v_submission_id;
  exception
    when unique_violation then
      select id
        into v_submission_id
        from public.kyc_submissions
       where user_id = v_user_id
         and intake_state = 'uploading'
       order by created_at desc
       limit 1
       for update;
  end;

  if v_submission_id is null then
    raise exception 'unable to initialize kyc intake';
  end if;

  return v_submission_id;
end;
$$;

create or replace function public.register_kyc_document(
  p_submission_id uuid,
  p_document_type text,
  p_storage_path text
)
returns void
language plpgsql
security definer
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
    raise exception 'unsupported document type';
  end if;

  if not exists (
    select 1
      from public.kyc_submissions
     where id = p_submission_id
       and user_id = v_user_id
       and intake_state = 'uploading'
  ) then
    raise exception 'kyc intake not available';
  end if;

  v_expected_path := v_user_id::text || '/' || p_submission_id::text || '/' || p_document_type;
  if p_storage_path <> v_expected_path then
    raise exception 'invalid storage path';
  end if;

  if not exists (
    select 1
      from storage.objects
     where bucket_id = 'kyc-documents'
       and name = p_storage_path
  ) then
    raise exception 'storage object not found';
  end if;

  insert into public.kyc_documents (submission_id, document_type, storage_path)
  values (p_submission_id, p_document_type, p_storage_path)
  on conflict (submission_id, document_type)
  do update set storage_path = excluded.storage_path;
end;
$$;

create or replace function public.finalize_kyc_submission(p_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_submission public.kyc_submissions%rowtype;
  v_complete_count integer;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  select *
    into v_submission
    from public.kyc_submissions
   where id = p_submission_id
     and user_id = v_user_id
   for update;

  if v_submission.id is null then
    raise exception 'kyc submission not found';
  end if;

  if v_submission.intake_state = 'submitted' then
    return;
  end if;

  select count(*)::integer
    into v_complete_count
    from public.kyc_documents d
   where d.submission_id = p_submission_id
     and d.document_type in ('cedula_front', 'cedula_back')
     and exists (
       select 1
         from storage.objects o
        where o.bucket_id = 'kyc-documents'
          and o.name = d.storage_path
     );

  if v_complete_count <> 2 then
    raise exception 'kyc documents incomplete';
  end if;

  update public.kyc_submissions
     set intake_state = 'submitted',
         submitted_at = now()
   where id = p_submission_id;

  update public.profiles
     set kyc_status = 'pending'
   where id = v_user_id;
end;
$$;

-- Allow compensation only while the intake is unfinished. This lets a retry
-- remove an incomplete upload without permitting deletion after review begins.
drop policy if exists kyc_documents_storage_delete_incomplete on storage.objects;
create policy kyc_documents_storage_delete_incomplete on storage.objects
  for delete using (
    bucket_id = 'kyc-documents'
    and (select auth.uid())::text = (storage.foldername(name))[1]
    and exists (
      select 1
        from public.kyc_submissions s
       where s.user_id = (select auth.uid())
         and s.intake_state = 'uploading'
         and split_part(name, '/', 2) = s.id::text
    )
  );

-- Keep the reviewed approve_kyc/reject_kyc privileged bodies unchanged. A
-- table-level guard blocks any terminal review transition until intake has
-- been finalized, so all existing admin RPC hashes remain stable.
create or replace function public.guard_kyc_review_intake()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status = 'pending'
     and new.status in ('verified', 'rejected')
     and old.intake_state <> 'submitted' then
    raise exception 'submission intake incomplete';
  end if;
  return new;
end;
$$;

drop trigger if exists kyc_review_requires_submitted_intake on public.kyc_submissions;
create trigger kyc_review_requires_submitted_intake
  before update of status on public.kyc_submissions
  for each row execute function public.guard_kyc_review_intake();

revoke all on function public.begin_kyc_submission() from public;
revoke all on function public.register_kyc_document(uuid, text, text) from public;
revoke all on function public.finalize_kyc_submission(uuid) from public;
grant execute on function public.begin_kyc_submission() to authenticated;
grant execute on function public.register_kyc_document(uuid, text, text) to authenticated;
grant execute on function public.finalize_kyc_submission(uuid) to authenticated;
