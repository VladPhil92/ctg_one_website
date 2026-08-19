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

-- Strip non-code lexical regions before scanning guard shapes. PostgreSQL block
-- comments may nest, so a regex-only sanitizer is insufficient. This small
-- lexer handles line comments, nested block comments, single-quoted strings,
-- and tagged/untagged dollar-quoted strings. Literals become a neutral token so
-- role-comparison guard structure remains inspectable without trusting content.
CREATE OR REPLACE FUNCTION pg_temp.strip_sql_noncode(p_source text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
STRICT
AS $lexer$
DECLARE
  v_out text := '';
  v_i integer := 1;
  v_len integer := char_length(p_source);
  v_ch text;
  v_pair text;
  v_depth integer;
  v_closed boolean;
  v_rest text;
  v_tag text;
  v_close_rel integer;
BEGIN
  WHILE v_i <= v_len LOOP
    v_ch := substr(p_source, v_i, 1);
    v_pair := substr(p_source, v_i, 2);

    IF v_pair = '--' THEN
      v_i := v_i + 2;
      WHILE v_i <= v_len AND substr(p_source, v_i, 1) NOT IN (E'\n', E'\r') LOOP
        v_i := v_i + 1;
      END LOOP;
      v_out := v_out || ' ';

    ELSIF v_pair = '/*' THEN
      v_depth := 1;
      v_i := v_i + 2;
      WHILE v_i <= v_len AND v_depth > 0 LOOP
        v_pair := substr(p_source, v_i, 2);
        IF v_pair = '/*' THEN
          v_depth := v_depth + 1;
          v_i := v_i + 2;
        ELSIF v_pair = '*/' THEN
          v_depth := v_depth - 1;
          v_i := v_i + 2;
        ELSE
          v_i := v_i + 1;
        END IF;
      END LOOP;
      IF v_depth <> 0 THEN
        RAISE EXCEPTION 'unterminated block comment in function source';
      END IF;
      v_out := v_out || ' ';

    ELSIF v_ch = '''' THEN
      v_closed := false;
      v_i := v_i + 1;
      WHILE v_i <= v_len LOOP
        IF substr(p_source, v_i, 1) = '''' THEN
          IF v_i < v_len AND substr(p_source, v_i + 1, 1) = '''' THEN
            v_i := v_i + 2;
          ELSE
            v_i := v_i + 1;
            v_closed := true;
            EXIT;
          END IF;
        ELSE
          v_i := v_i + 1;
        END IF;
      END LOOP;
      IF NOT v_closed THEN
        RAISE EXCEPTION 'unterminated single-quoted string in function source';
      END IF;
      v_out := v_out || ' __literal__ ';

    ELSIF v_ch = '$' THEN
      v_rest := substr(p_source, v_i);
      v_tag := substring(v_rest FROM '^\$[A-Za-z_][A-Za-z0-9_]*\$');
      IF v_tag IS NULL AND substr(p_source, v_i, 2) = '$$' THEN
        v_tag := '$$';
      END IF;

      IF v_tag IS NOT NULL THEN
        v_close_rel := strpos(substr(p_source, v_i + char_length(v_tag)), v_tag);
        IF v_close_rel = 0 THEN
          RAISE EXCEPTION 'unterminated dollar-quoted string in function source';
        END IF;
        v_i := v_i + char_length(v_tag) + v_close_rel - 1 + char_length(v_tag);
        v_out := v_out || ' __literal__ ';
      ELSE
        v_out := v_out || v_ch;
        v_i := v_i + 1;
      END IF;

    ELSE
      v_out := v_out || v_ch;
      v_i := v_i + 1;
    END IF;
  END LOOP;

  RETURN v_out;
END;
$lexer$;

CREATE TEMP VIEW security_definer_authorization_guard_evaluation AS
WITH exposed AS (
  SELECT
    n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS signature,
    pg_temp.strip_sql_noncode(p.prosrc) AS definition
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

    -- Explicit role mismatch denial. Literal contents are replaced by the
    -- neutral __literal__ token before guard matching.
    OR definition ~* E'if[[:space:]]+public\\.get_investment_role\\(\\)[[:space:]]*(<>|!=)[[:space:]]*__literal__[[:space:]]+then[\\s\\S]{0,120}raise[[:space:]]+exception'

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

-- Negative control #1: mentions/lookalikes in comments and literal forms must
-- not satisfy the guard detector, including nested block comments.
CREATE FUNCTION public.__security_definer_unguarded_negative_control()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- if not public.is_admin() then raise exception 'fake line-comment guard'; end if;
  /* outer
    /* nested */
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'fake nested-comment guard';
    END IF;
  */
  PERFORM auth.uid();
  PERFORM 'if not public.is_admin() then raise exception';
  PERFORM $msg$if not public.is_admin() then raise exception$msg$;
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
