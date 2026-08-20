\set ON_ERROR_STOP on

-- P3.1 KYC intake must expose the explicit resumable protocol and remove
-- direct browser inserts that could leave cross-resource partial state.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'kyc_submissions' and column_name = 'intake_state'
  ) then
    raise exception 'kyc_submissions.intake_state missing';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'kyc_submissions' and column_name = 'submitted_at'
  ) then
    raise exception 'kyc_submissions.submitted_at missing';
  end if;

  if to_regprocedure('public.begin_kyc_submission()') is null then
    raise exception 'begin_kyc_submission() missing';
  end if;
  if to_regprocedure('public.register_kyc_document(uuid,text,text)') is null then
    raise exception 'register_kyc_document(uuid,text,text) missing';
  end if;
  if to_regprocedure('public.finalize_kyc_submission(uuid)') is null then
    raise exception 'finalize_kyc_submission(uuid) missing';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'kyc_submissions' and policyname = 'kyc_submissions_insert'
  ) then
    raise exception 'legacy direct kyc_submissions insert policy still exists';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'kyc_documents' and policyname = 'kyc_documents_insert'
  ) then
    raise exception 'legacy direct kyc_documents insert policy still exists';
  end if;

  if exists (
    select 1 from pg_trigger
    where tgrelid = 'public.kyc_submissions'::regclass
      and tgname = 'on_kyc_submission_created'
      and not tgisinternal
  ) then
    raise exception 'legacy pre-finalize KYC pending trigger still exists';
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'kyc_submissions'
      and indexname = 'kyc_submissions_one_uploading_per_user'
      and indexdef ilike '%unique index%'
      and indexdef ilike '%where (intake_state = ''uploading''::text)%'
  ) then
    raise exception 'one-uploading-intake-per-user concurrency index missing';
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'kyc_documents'
      and indexname = 'kyc_documents_submission_type_key'
  ) then
    raise exception 'idempotent document unique index missing';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'kyc_documents_storage_delete_incomplete'
  ) then
    raise exception 'incomplete-intake Storage compensation policy missing';
  end if;
end;
$$;

-- Authenticated clients need SELECT so RLS can expose only their permitted
-- rows. Direct KYC row writes remain forbidden and must go through reviewed RPCs.
do $$
begin
  if not has_table_privilege('authenticated', 'public.profiles', 'SELECT') then
    raise exception 'authenticated cannot read RLS-protected own profile';
  end if;
  if not has_table_privilege('authenticated', 'public.kyc_submissions', 'SELECT') then
    raise exception 'authenticated cannot read RLS-protected KYC submissions';
  end if;
  if not has_table_privilege('authenticated', 'public.kyc_documents', 'SELECT') then
    raise exception 'authenticated cannot read RLS-protected KYC documents';
  end if;
  if has_table_privilege('authenticated', 'public.kyc_submissions', 'INSERT') then
    raise exception 'authenticated unexpectedly has direct kyc_submissions INSERT';
  end if;
  if has_table_privilege('authenticated', 'public.kyc_documents', 'INSERT') then
    raise exception 'authenticated unexpectedly has direct kyc_documents INSERT';
  end if;
end;
$$;

-- Browser roles may execute only the participant-safe intake functions.
do $$
begin
  if not has_function_privilege('authenticated', 'public.begin_kyc_submission()', 'EXECUTE') then
    raise exception 'authenticated cannot begin KYC submission';
  end if;
  if not has_function_privilege('authenticated', 'public.register_kyc_document(uuid,text,text)', 'EXECUTE') then
    raise exception 'authenticated cannot register KYC document';
  end if;
  if not has_function_privilege('authenticated', 'public.finalize_kyc_submission(uuid)', 'EXECUTE') then
    raise exception 'authenticated cannot finalize KYC submission';
  end if;
  if has_function_privilege('anon', 'public.begin_kyc_submission()', 'EXECUTE') then
    raise exception 'anon unexpectedly can begin KYC submission';
  end if;
end;
$$;
