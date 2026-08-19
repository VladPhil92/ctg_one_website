\set ON_ERROR_STOP on

-- Every SECURITY DEFINER function callable by authenticated users but not by
-- anonymous users must contain an explicit identity/RBAC authorization guard.
-- This complements the reviewed signature allowlist by preventing a future
-- privileged RPC from being allowlisted without a caller authorization check.
DO $$
DECLARE
  v_unguarded text[];
BEGIN
  SELECT coalesce(
    array_agg(
      n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
      ORDER BY n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)
    ),
    ARRAY[]::text[]
  )
  INTO v_unguarded
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname IN ('public', 'graphql_public')
    AND p.prosecdef
    AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
    AND NOT has_function_privilege('anon', p.oid, 'EXECUTE')
    AND pg_get_functiondef(p.oid) !~* E'(auth\\.uid\\(\\)|public\\.has_investment_permission\\(|public\\.is_admin\\(|public\\.is_investment_admin\\(|public\\.is_investment_operator\\(|public\\.is_investment_sales_operator\\(|public\\.get_investment_role\\(\\))';

  IF cardinality(v_unguarded) > 0 THEN
    RAISE EXCEPTION 'authenticated SECURITY DEFINER function(s) missing explicit authorization guard: %', v_unguarded;
  END IF;
END $$;

SELECT 'SECURITY DEFINER authorization guard contract: PASS' AS result;
