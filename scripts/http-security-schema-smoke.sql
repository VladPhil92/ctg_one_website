\set ON_ERROR_STOP on

DO $$
BEGIN
  IF to_regclass('public.api_rate_limit_windows') IS NULL THEN
    RAISE EXCEPTION 'api_rate_limit_windows table missing';
  END IF;

  IF to_regprocedure('public.consume_api_rate_limit(text)') IS NULL THEN
    RAISE EXCEPTION 'consume_api_rate_limit(text) function missing';
  END IF;

  IF has_table_privilege('authenticated', 'public.api_rate_limit_windows', 'SELECT')
     OR has_table_privilege('authenticated', 'public.api_rate_limit_windows', 'INSERT')
     OR has_table_privilege('authenticated', 'public.api_rate_limit_windows', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.api_rate_limit_windows', 'DELETE') THEN
    RAISE EXCEPTION 'authenticated must not have direct api_rate_limit_windows privileges';
  END IF;

  IF has_table_privilege('anon', 'public.api_rate_limit_windows', 'SELECT')
     OR has_table_privilege('anon', 'public.api_rate_limit_windows', 'INSERT')
     OR has_table_privilege('anon', 'public.api_rate_limit_windows', 'UPDATE')
     OR has_table_privilege('anon', 'public.api_rate_limit_windows', 'DELETE') THEN
    RAISE EXCEPTION 'anon must not have direct api_rate_limit_windows privileges';
  END IF;

  IF NOT has_function_privilege('authenticated', 'public.consume_api_rate_limit(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated must be able to execute consume_api_rate_limit(text)';
  END IF;

  IF has_function_privilege('anon', 'public.consume_api_rate_limit(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon must not execute consume_api_rate_limit(text)';
  END IF;
END
$$;

SELECT 'HTTP security PostgreSQL contract: PASS' AS result;
