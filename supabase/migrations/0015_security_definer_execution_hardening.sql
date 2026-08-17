-- CTG One / CTG Craft Beer Investment OS
-- SECURITY DEFINER execution hardening.
-- Removes inherited PUBLIC/anon EXECUTE from privileged functions.
-- get_public_bottle_trace(text) remains intentionally public.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS fn
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.proname <> 'get_public_bottle_trace'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', r.fn);
  END LOOP;
END
$$;

-- Trigger-only/internal helpers must not be callable directly by signed-in clients either.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS fn
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND (
        p.proname LIKE '\_%' ESCAPE '\'
        OR p.proname LIKE 'guard\_%' ESCAPE '\'
        OR p.proname IN ('handle_new_user', 'handle_new_kyc_submission')
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', r.fn);
  END LOOP;
END
$$;

-- Preserve the one intentionally public privileged RPC.
REVOKE ALL ON FUNCTION public.get_public_bottle_trace(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_bottle_trace(text) TO anon, authenticated;
