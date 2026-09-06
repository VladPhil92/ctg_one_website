\set ON_ERROR_STOP on

-- SECURITY DEFINER reviewed-body contract.
--
-- Supabase Security Advisor intentionally warns when authenticated users can
-- execute SECURITY DEFINER functions. CTG One has reviewed RPCs that require
-- definer rights and re-check authorization internally. The existing exposure
-- contract freezes the callable signatures. This contract additionally freezes
-- the canonical executable body and the security-relevant function configuration
-- of every authenticated-only SECURITY DEFINER RPC.
--
-- This deliberately does NOT try to parse PL/pgSQL authorization semantics.
-- PostgreSQL has a rich lexer/grammar and heuristic regexes can be bypassed by
-- valid syntax. Instead, any privileged-body change, new privileged RPC, unsafe
-- search_path change, or SQL-standard parsed body makes CI fail until explicitly
-- reviewed.
--
-- CRLF/LF is normalized before hashing because line-ending representation is
-- not executable logic and older production functions may retain CRLF bodies.

CREATE TEMP TABLE reviewed_authenticated_security_definer_bodies(
  signature text PRIMARY KEY,
  body_sha256 text NOT NULL CHECK (body_sha256 ~ '^[0-9a-f]{64}$')
);

\copy reviewed_authenticated_security_definer_bodies(signature, body_sha256) FROM 'scripts/security-definer-authenticated-body-sha256.txt' WITH (FORMAT csv, DELIMITER E'\t')

-- Phase 3 deliberately retires direct client EXECUTE grants for these legacy
-- implementations while preserving their reviewed body fingerprints as an
-- immutable historical authorization record. They may only be reached through
-- the service-role-only *_server wrappers introduced by migration 0111.
CREATE TEMP TABLE retired_authenticated_security_definer_signatures(
  signature text PRIMARY KEY
);

INSERT INTO retired_authenticated_security_definer_signatures(signature) VALUES
  ('public.verify_wallet_topup_claim(p_claim_id uuid, p_verification_notes text)'),
  ('public.reconcile_wallet_topup_claim(p_claim_id uuid, p_admin_notes text)'),
  ('public.reject_wallet_topup_claim(p_claim_id uuid, p_reason text)'),
  ('public.approve_kyc(p_submission_id uuid, p_admin_notes text)'),
  ('public.reject_kyc(p_submission_id uuid, p_reason text)');

CREATE TEMP VIEW actual_authenticated_security_definer_bodies AS
SELECT
  n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS signature,
  l.lanname AS language_name,
  encode(digest(replace(p.prosrc, E'\r\n', E'\n'), 'sha256'), 'hex') AS body_sha256,
  coalesce(p.proconfig, ARRAY[]::text[]) AS function_config,
  p.prosqlbody IS NOT NULL AS has_parsed_sql_body
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_language l ON l.oid = p.prolang
WHERE n.nspname IN ('public', 'graphql_public')
  AND p.prosecdef
  AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
  AND NOT has_function_privilege('anon', p.oid, 'EXECUTE');

-- Keep failures actionable. A successful run prints zero rows; a failed run
-- records the clean-schema hash beside the reviewed hash so drift can be
-- investigated without weakening the gate or blindly refreshing the manifest.
SELECT
  a.signature,
  a.body_sha256 AS clean_body_sha256,
  r.body_sha256 AS reviewed_body_sha256
FROM actual_authenticated_security_definer_bodies a
JOIN reviewed_authenticated_security_definer_bodies r USING (signature)
WHERE a.body_sha256 IS DISTINCT FROM r.body_sha256
ORDER BY a.signature;

-- New privileged functions must still fail closed, but print their exact clean
-- database fingerprints first so reviewers can inspect and deliberately add the
-- reviewed values to the manifest. This is diagnostic output only; it never
-- auto-updates the allowlist or body-fingerprint registry.
SELECT
  a.signature,
  a.body_sha256 AS unreviewed_body_sha256,
  a.language_name,
  a.function_config
FROM actual_authenticated_security_definer_bodies a
LEFT JOIN reviewed_authenticated_security_definer_bodies r USING (signature)
WHERE r.signature IS NULL
ORDER BY a.signature;

DO $$
DECLARE
  v_unreviewed text[];
  v_stale text[];
  v_changed text[];
  v_bad_config text[];
  v_parsed_sql text[];
  v_bad_language text[];
BEGIN
  SELECT coalesce(array_agg(a.signature ORDER BY a.signature), ARRAY[]::text[])
  INTO v_unreviewed
  FROM actual_authenticated_security_definer_bodies a
  LEFT JOIN reviewed_authenticated_security_definer_bodies r USING (signature)
  WHERE r.signature IS NULL;

  SELECT coalesce(array_agg(r.signature ORDER BY r.signature), ARRAY[]::text[])
  INTO v_stale
  FROM reviewed_authenticated_security_definer_bodies r
  LEFT JOIN actual_authenticated_security_definer_bodies a USING (signature)
  LEFT JOIN retired_authenticated_security_definer_signatures retired USING (signature)
  WHERE a.signature IS NULL
    AND retired.signature IS NULL;

  SELECT coalesce(array_agg(a.signature ORDER BY a.signature), ARRAY[]::text[])
  INTO v_changed
  FROM actual_authenticated_security_definer_bodies a
  JOIN reviewed_authenticated_security_definer_bodies r USING (signature)
  WHERE a.body_sha256 IS DISTINCT FROM r.body_sha256;

  -- Freeze exact reviewed search_path values. The migration-health RPC is the
  -- only historical exception because it intentionally needs pg_catalog explicit.
  -- Wallet COP top-up administration uses an empty search_path deliberately:
  -- every application object is schema-qualified and only pg_catalog remains
  -- implicitly visible, which is stricter than the legacy public-only policy.
  SELECT coalesce(array_agg(a.signature ORDER BY a.signature), ARRAY[]::text[])
  INTO v_bad_config
  FROM actual_authenticated_security_definer_bodies a
  WHERE a.function_config IS DISTINCT FROM
    CASE
      WHEN a.signature = 'public.get_system_migration_health()'
        THEN ARRAY['search_path=public, pg_catalog']::text[]
      WHEN a.signature IN (
        'public.approve_deposit(p_transaction_id uuid, p_admin_notes text)',
        'public.reconcile_wallet_topup_claim(p_claim_id uuid, p_admin_notes text)',
        'public.reject_wallet_topup_claim(p_claim_id uuid, p_reason text)',
        'public.verify_wallet_topup_claim(p_claim_id uuid, p_verification_notes text)'
      )
        THEN ARRAY['search_path=""']::text[]
      ELSE ARRAY['search_path=public']::text[]
    END;

  -- SQL-standard BEGIN ATOMIC bodies live in prosqlbody rather than prosrc.
  -- None of the reviewed privileged surface uses that representation today;
  -- fail closed if it ever appears so a dedicated canonical fingerprint can be
  -- introduced rather than silently treating an empty prosrc as authoritative.
  SELECT coalesce(array_agg(a.signature ORDER BY a.signature), ARRAY[]::text[])
  INTO v_parsed_sql
  FROM actual_authenticated_security_definer_bodies a
  WHERE a.has_parsed_sql_body;

  SELECT coalesce(array_agg(a.signature ORDER BY a.signature), ARRAY[]::text[])
  INTO v_bad_language
  FROM actual_authenticated_security_definer_bodies a
  WHERE a.language_name NOT IN ('plpgsql', 'sql');

  IF cardinality(v_unreviewed) > 0 THEN
    RAISE EXCEPTION 'unreviewed authenticated SECURITY DEFINER function(s): %', v_unreviewed;
  END IF;

  IF cardinality(v_stale) > 0 THEN
    RAISE EXCEPTION 'stale SECURITY DEFINER body fingerprint(s): %', v_stale;
  END IF;

  IF cardinality(v_changed) > 0 THEN
    RAISE EXCEPTION 'reviewed SECURITY DEFINER body changed; review authorization before updating SHA-256: %', v_changed;
  END IF;

  IF cardinality(v_bad_config) > 0 THEN
    RAISE EXCEPTION 'reviewed SECURITY DEFINER function configuration changed: %', v_bad_config;
  END IF;

  IF cardinality(v_parsed_sql) > 0 THEN
    RAISE EXCEPTION 'reviewed SECURITY DEFINER uses unsupported parsed SQL body representation: %', v_parsed_sql;
  END IF;

  IF cardinality(v_bad_language) > 0 THEN
    RAISE EXCEPTION 'reviewed SECURITY DEFINER uses unreviewed language: %', v_bad_language;
  END IF;
END $$;

SELECT 'SECURITY DEFINER reviewed-body/config contract: PASS' AS result;
