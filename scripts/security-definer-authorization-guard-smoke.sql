\set ON_ERROR_STOP on

-- Defense-in-depth for reviewed authenticated SECURITY DEFINER RPCs.
--
-- The signature allowlist proves that every exposed privileged routine was
-- reviewed. This contract separately proves that each authenticated-only
-- routine contains a recognizable *control-flow authorization guard*, rather
-- than merely mentioning auth.uid() or an RBAC helper in an audit assignment,
-- comment, or string literal.
--
-- This is intentionally conservative: introducing a new guard idiom requires
-- updating this reviewed contract rather than silently widening acceptance.

CREATE TEMP VIEW security_definer_authorization_guard_evaluation AS
WITH exposed AS (
  SELECT
    n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS signature,
    regexp_replace(
      regexp_replace(
        regexp_replace(
          pg_get_functiondef(p.oid),
          E'--[^\\n\\r]*',
          '',
          'g'
        ),
        E'/\\*([^*]|\\*+[^*/])*\\*+/',
        '',
        'g'
      ),
      E'''([^'']|'''')*''',
      '''''',
      'g'
    ) AS definition
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname IN ('public', 'graphql_public')
    AND p.prosecdef
    AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
    AND NOT has_function_privilege('anon', p.oid, 'EXECUTE')
)
SELECT
  signature,
  (
    -- Direct PL/pgSQL denial guard, including ownership/RBAC comparisons.
    definition ~* E'if[\\s\\S]{0,250}(auth\\.uid\\(\\)|public\\.(has_investment_permission|is_admin|is_investment_admin|is_investment_operator|is_investment_sales_operator|get_investment_role)\\()[\\s\\S]{0,250}then[\\s\\S]{0,250}raise[[:space:]]+exception'

    -- SQL role helpers whose boolean/role result is scoped to auth.uid().
    OR definition ~* E'where[\\s\\S]{0,250}(id|user_id)[[:space:]]*=[[:space:]]*auth\\.uid\\(\\)'

    -- Permission matrix delegates identity resolution to get_investment_role().
    OR definition ~* E'select[[:space:]]+case[[:space:]]+public\\.get_investment_role\\(\\)'

    -- Rate limiter snapshots auth.uid() once, then denies a null caller.
    OR (
      definition ~* E'v_user_id[[:space:]]+uuid[[:space:]]*:=[[:space:]]*auth\\.uid\\(\\)'
      AND definition ~* E'if[[:space:]]+v_user_id[[:space:]]+is[[:space:]]+null[[:space:]]+then[\\s\\S]{0,120}raise[[:space:]]+exception'
    )

    -- Bottle transition derives an RBAC boolean, then denies false.
    OR (
      definition ~* E'v_authorized[[:space:]]*:=[[:space:]]*case[\\s\\S]{0,250}public\\.has_investment_permission\\('
      AND definition ~* E'if[[:space:]]+not[[:space:]]+v_authorized[[:space:]]+then[\\s\\S]{0,120}raise[[:space:]]+exception'
    )
  ) AS has_authorization_guard
FROM exposed;

-- Negative control: merely mentioning auth.uid()/RBAC in executable code,
-- comments, and text must NOT satisfy the contract. CREATE (not OR REPLACE)
-- deliberately fails if a future real routine ever collides with this test name.
CREATE FUNCTION public.__security_definer_unguarded_negative_control()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- if not public.is_admin() then raise exception 'fake comment guard'; end if;
  PERFORM auth.uid();
  PERFORM 'if not public.is_admin() then raise exception';
END;
$$;
REVOKE ALL ON FUNCTION public.__security_definer_unguarded_negative_control() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.__security_definer_unguarded_negative_control() TO authenticated;

DO $$
DECLARE
  v_unguarded text[];
BEGIN
  SELECT coalesce(array_agg(signature ORDER BY signature), ARRAY[]::text[])
  INTO v_unguarded
  FROM security_definer_authorization_guard_evaluation
  WHERE NOT has_authorization_guard;

  IF v_unguarded IS DISTINCT FROM ARRAY[
    'public.__security_definer_unguarded_negative_control()'
  ]::text[] THEN
    RAISE EXCEPTION
      'authorization-guard detector failed negative control or found real unguarded RPC(s): %',
      v_unguarded;
  END IF;
END $$;

DROP FUNCTION public.__security_definer_unguarded_negative_control();

-- After removing the negative control, every real authenticated-only reviewed
-- SECURITY DEFINER RPC must satisfy one of the explicit guard idioms above.
DO $$
DECLARE
  v_unguarded text[];
BEGIN
  SELECT coalesce(array_agg(signature ORDER BY signature), ARRAY[]::text[])
  INTO v_unguarded
  FROM security_definer_authorization_guard_evaluation
  WHERE NOT has_authorization_guard;

  IF cardinality(v_unguarded) > 0 THEN
    RAISE EXCEPTION
      'authenticated SECURITY DEFINER function(s) missing explicit authorization guard: %',
      v_unguarded;
  END IF;
END $$;

SELECT 'SECURITY DEFINER authorization guard contract: PASS' AS result;
