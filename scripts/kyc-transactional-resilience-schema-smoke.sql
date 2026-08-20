\set ON_ERROR_STOP on

-- P3.1 KYC transactional-resilience database contract.
-- This runs on a fresh migrated database and on production-derived recovery
-- restores. It verifies schema shape, privilege boundaries and the durable
-- DRAFT -> PENDING gate without creating hosted user data.

DO $$
DECLARE
  v_constraint text;
  v_proc oid;
  v_proc_name text;
BEGIN
  SELECT pg_get_constraintdef(c.oid)
    INTO v_constraint
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'kyc_submissions'
      AND c.conname = 'kyc_submissions_status_check';

  IF v_constraint IS NULL OR position('draft' in lower(v_constraint)) = 0 THEN
    RAISE EXCEPTION 'kyc_submissions status contract does not include draft';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'kyc_submissions'
      AND column_name = 'client_request_id'
      AND data_type = 'uuid'
  ) THEN
    RAISE EXCEPTION 'kyc_submissions.client_request_id is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'kyc_submissions'
      AND column_name = 'submitted_at'
  ) THEN
    RAISE EXCEPTION 'kyc_submissions.submitted_at is missing';
  END IF;

  IF to_regclass('public.kyc_submissions_user_request_key') IS NULL THEN
    RAISE EXCEPTION 'KYC request idempotency index is missing';
  END IF;

  IF to_regclass('public.kyc_submissions_one_draft_per_user') IS NULL THEN
    RAISE EXCEPTION 'one-draft-per-user KYC index is missing';
  END IF;

  IF to_regclass('public.kyc_documents_submission_document_type_key') IS NULL THEN
    RAISE EXCEPTION 'KYC document idempotency index is missing';
  END IF;

  FOREACH v_proc_name IN ARRAY ARRAY[
    'public.begin_kyc_submission(uuid)',
    'public.register_kyc_document(uuid,text,text)',
    'public.finalize_kyc_submission(uuid)'
  ] LOOP
    v_proc := to_regprocedure(v_proc_name);
    IF v_proc IS NULL THEN
      RAISE EXCEPTION 'required KYC RPC missing: %', v_proc_name;
    END IF;

    IF (SELECT prosecdef FROM pg_proc WHERE oid = v_proc) THEN
      RAISE EXCEPTION 'participant KYC RPC must remain SECURITY INVOKER: %', v_proc_name;
    END IF;

    IF NOT has_function_privilege('authenticated', v_proc, 'EXECUTE') THEN
      RAISE EXCEPTION 'authenticated must execute KYC RPC: %', v_proc_name;
    END IF;

    IF has_function_privilege('anon', v_proc, 'EXECUTE') THEN
      RAISE EXCEPTION 'anon must not execute KYC RPC: %', v_proc_name;
    END IF;
  END LOOP;

  v_proc := to_regprocedure('public.handle_kyc_submission_finalized()');
  IF v_proc IS NULL OR NOT (SELECT prosecdef FROM pg_proc WHERE oid = v_proc) THEN
    RAISE EXCEPTION 'KYC finalization profile trigger must retain reviewed definer rights';
  END IF;
  IF has_function_privilege('authenticated', v_proc, 'EXECUTE')
     OR has_function_privilege('anon', v_proc, 'EXECUTE') THEN
    RAISE EXCEPTION 'KYC finalization trigger function must not be browser-callable';
  END IF;

  IF NOT has_column_privilege('authenticated', 'public.kyc_submissions', 'status', 'UPDATE')
     OR NOT has_column_privilege('authenticated', 'public.kyc_submissions', 'submitted_at', 'UPDATE') THEN
    RAISE EXCEPTION 'authenticated KYC finalization column privileges are missing';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.column_privileges
    WHERE grantee = 'authenticated'
      AND table_schema = 'public'
      AND table_name = 'kyc_submissions'
      AND privilege_type = 'UPDATE'
      AND column_name NOT IN ('status', 'submitted_at')
  ) THEN
    RAISE EXCEPTION 'authenticated has unexpected KYC submission UPDATE column privilege';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'kyc_submissions'
      AND policyname = 'kyc_submissions_finalize_draft'
      AND cmd = 'UPDATE'
  ) THEN
    RAISE EXCEPTION 'KYC DRAFT -> PENDING RLS policy is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'kyc_documents_storage_update'
      AND cmd = 'UPDATE'
  ) THEN
    RAISE EXCEPTION 'KYC Storage retry UPDATE policy is missing';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.kyc_status = 'pending'
      AND NOT EXISTS (
        SELECT 1
        FROM public.kyc_submissions s
        WHERE s.user_id = p.id
          AND s.status = 'pending'
      )
  ) THEN
    RAISE EXCEPTION 'pending profile exists without pending KYC submission';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.kyc_submissions s
    WHERE s.status = 'pending'
      AND (
        SELECT count(distinct d.document_type)
        FROM public.kyc_documents d
        JOIN storage.objects o
          ON o.bucket_id = 'kyc-documents'
         AND o.name = d.storage_path
        WHERE d.submission_id = s.id
          AND d.document_type IN ('cedula_front', 'cedula_back')
      ) <> 2
  ) THEN
    RAISE EXCEPTION 'pending KYC submission exists without two durable required documents';
  END IF;
END $$;

SELECT 'KYC transactional resilience schema contract: PASS' AS result;
