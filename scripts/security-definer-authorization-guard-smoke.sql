\set ON_ERROR_STOP on

-- Defense-in-depth for reviewed authenticated SECURITY DEFINER RPCs.
--
-- The signature allowlist proves that every exposed privileged routine was
-- reviewed. This contract separately proves that each authenticated-only
-- routine contains a recognizable *denial-form authorization guard*, rather
-- than merely mentioning auth.uid() or an RBAC helper in an audit assignment,
-- comment, string literal, inverted conditional, or unrelated identity query.
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
    -- Explicit RBAC denial: IF NOT <permission expression> THEN RAISE.
    definition ~* E'if[[:space:]]+not[[:space:]]+\\(?[\\s\\S]{0,220}public\\.(has_investment_permission|is_admin|is_investment_admin|is_investment_operator|is_investment_sales_operator)\\([\\s\\S]{0,220}then[\\s\\S]{0,120}raise[[:space:]]+exception'

    -- Ownership mismatch denial involving auth.uid().
    OR definition ~* E'if[\\s\\S]{0,180}(auth\\.uid\\(\\)[\\s\\S]{0,100}(is[[:space:]]+distinct[[:space:]]+from|<>|!=)|(is[[:space:]]+distinct[[:space:]]+from|<>|!=)[\\s\\S]{0,100}auth\\.uid\\(\\))[\\s\\S]{0,180}then[\\s\\S]{0,120}raise[[:space:]]+exception'

    -- Authentication denial: a missing caller identity raises immediately.
    OR definition ~* E'if[[:space:]]+auth\\.uid\\(\\)[[:space:]]+is[[:space:]]+null[[:space:]]+then[\\s\\S]{0,120}raise[[:space:]]+exception'

    -- Explicit role mismatch denial. String literals are stripped above, so the
    -- reviewed role literal becomes ''.
    OR definition ~* E'if[[:space:]]+public\\.get_investment_role\\(\\)[[:space:]]*(<>|!=)[[:space:]]*''''[[:space:]]+then[\\s\\S]{0,120}raise[[:space:]]+exception'

    -- Only these reviewed identity/RBAC helper functions may use an
    -- identity-scoped SQL WHERE clause as their authorization semantics.
    OR (
      signature = ANY(ARRAY[
        'public.is_admin()',
        'public.is_investment_admin()',
        'public.is_investment_operator()',
        'public.is_investment_sales_operator()',
        'public.get_investment_role()'
      ]::text[])
      AND definition ~* E'where[\\s\\S]{0,250}(id|user_id)[[:space:]]*=[[:space:]]*auth\\.uid\\(\\)'
    )

    -- Only the reviewed permission-matrix helper may delegate through a CASE
    -- over get_investment_role().
    OR (
      signature = 'public.has_investment_permission(p_permission text)'
      AND definition ~* E'select[[:space:]]+case[[:space:]]+public\\.get_investment_role\\(\\)'
    )

    -- Rate limiter snapshots auth.uid() once, then denies a null caller.
    OR (
      definition ~* E'v_user_id[[:space:]]+uuid[[:space:]]*:=[[:space:]]*auth\\.uid\\(\\)'
      AND definition ~* E'if[[:space:]]+v_user_id[[:space:]]+is[[:space:]]+null[[:space:]]+then[\\s\\S]{0,120}raise[[:space:]]+exception'
    )

    -- Bottle transition derives an RBAC boolean, then explicitly denies false.
    OR (
      definition ~* E'v_authorized[[:space:]]*:=[[:space:]]*case[\\s\\S]{0,250}public\\.has_investment_permission\\('
      AND definition ~* E'if[[:space:]]+not[[:space:]]+v_authorized[[:space:]]+then[\\s\\S]{0,120}raise[[:space:]]+exception'
    )
  ) AS has_authorization_guard
FROM exposed;

-- Negative control #1: merely mentioning auth.uid()/RBAC in executable code,
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

-- Negative control #2: inverted polarity must NOT count as authorization.
CREATE FUNCTION public.__security_definer_inverted_guard_negative_control()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() THEN
    RAISE EXCEPTION 'inverted guard';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.__security_definer_inverted_guard_negative_control() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.__security_definer_inverted_guard_negative_control() TO authenticated;

-- Negative control #3: an unrelated identity-scoped query is not an
-- authorization check for an arbitrary privileged RPC.
CREATE FUNCTION public.__security_definer_identity_query_negative_control()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM 1 FROM public.profiles WHERE id = auth.uid();
  -- A real privileged mutation could follow here without any denial guard.
  RETURN;
END;
$$;
REVOKE ALL ON FUNCTION public.__security_definer_identity_query_negative_control() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.__security_definer_identity_query_negative_control() TO authenticated;

DO $$
DECLARE
  v_unguarded text[];
BEGIN
  SELECT coalesce(array_agg(signature ORDER BY signature), ARRAY[]::text[])
  INTO v_unguarded
  FROM security_definer_authorization_guard_evaluation
  WHERE NOT has_authorization_guard;

  IF v_unguarded IS DISTINCT FROM ARRAY[
    'public.__security_definer_identity_query_negative_control()',
    'public.__security_definer_inverted_guard_negative_control()',
    'public.__security_definer_unguarded_negative_control()'
  ]::text[] THEN
    RAISE EXCEPTION
      'authorization-guard detector failed negative controls or found real unguarded RPC(s): %',
      v_unguarded;
  END IF;
END $$;

DROP FUNCTION public.__security_definer_identity_query_negative_control();
DROP FUNCTION public.__security_definer_inverted_guard_negative_control();
DROP FUNCTION public.__security_definer_unguarded_negative_control();

-- After removing the negative controls, every real authenticated-only reviewed
-- SECURITY DEFINER RPC must satisfy one of the explicit denial/identity idioms.
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
