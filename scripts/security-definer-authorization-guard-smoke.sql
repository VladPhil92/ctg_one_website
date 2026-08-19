\set ON_ERROR_STOP on

-- SECURITY DEFINER reviewed-body contract.
--
-- Supabase Security Advisor intentionally warns when authenticated users can
-- execute SECURITY DEFINER functions. CTG One has reviewed RPCs that require
-- definer rights and re-check authorization internally. The existing exposure
-- contract freezes the callable signatures and fixed search_path. This contract
-- additionally freezes the exact reviewed executable body of every
-- authenticated-only SECURITY DEFINER RPC with SHA-256.
--
-- This deliberately does NOT try to parse PL/pgSQL authorization semantics.
-- PostgreSQL has a rich lexer/grammar and heuristic regexes can be bypassed by
-- valid syntax. Instead, any privileged-body change or new privileged RPC makes
-- CI fail until the migration/function change is explicitly reviewed and the
-- fingerprint manifest is deliberately updated in the same PR.

CREATE TEMP TABLE reviewed_authenticated_security_definer_bodies(
  signature text PRIMARY KEY,
  body_sha256 text NOT NULL CHECK (body_sha256 ~ '^[0-9a-f]{64}$')
);

\copy reviewed_authenticated_security_definer_bodies(signature, body_sha256) FROM 'scripts/security-definer-authenticated-body-sha256.txt' WITH (FORMAT csv, DELIMITER E'\t')

CREATE TEMP VIEW actual_authenticated_security_definer_bodies AS
SELECT
  n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS signature,
  encode(digest(p.prosrc, 'sha256'), 'hex') AS body_sha256
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
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

DO $$
DECLARE
  v_unreviewed text[];
  v_stale text[];
  v_changed text[];
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
  WHERE a.signature IS NULL;

  SELECT coalesce(array_agg(a.signature ORDER BY a.signature), ARRAY[]::text[])
  INTO v_changed
  FROM actual_authenticated_security_definer_bodies a
  JOIN reviewed_authenticated_security_definer_bodies r USING (signature)
  WHERE a.body_sha256 IS DISTINCT FROM r.body_sha256;

  IF cardinality(v_unreviewed) > 0 THEN
    RAISE EXCEPTION 'unreviewed authenticated SECURITY DEFINER function(s): %', v_unreviewed;
  END IF;

  IF cardinality(v_stale) > 0 THEN
    RAISE EXCEPTION 'stale SECURITY DEFINER body fingerprint(s): %', v_stale;
  END IF;

  IF cardinality(v_changed) > 0 THEN
    RAISE EXCEPTION 'reviewed SECURITY DEFINER body changed; review authorization before updating SHA-256: %', v_changed;
  END IF;
END $$;

SELECT 'SECURITY DEFINER reviewed-body contract: PASS' AS result;
