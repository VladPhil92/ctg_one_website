-- CTG One — client table privilege hardening.
-- RLS remains the row-level authority, but anonymous clients should not retain
-- table-level DML on identity, money, investment, KYC or internal knowledge data.
-- Authenticated DML is preserved because selected flows (KYC/deposits/knowledge)
-- intentionally rely on RLS-governed direct writes.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND (
        c.relname LIKE 'investment_%'
        OR c.relname IN (
          'profiles', 'wallets', 'transactions',
          'kyc_submissions', 'kyc_documents', 'admin_audit_log',
          'knowledge_documents', 'knowledge_chunks'
        )
      )
  LOOP
    EXECUTE format(
      'REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.%I FROM anon',
      r.relname
    );
    EXECUTE format(
      'REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE public.%I FROM authenticated',
      r.relname
    );
  END LOOP;
END;
$$;

-- Future tables created by the migration owner should start from the same
-- conservative baseline. Any intentionally anonymous write surface must be
-- granted explicitly in its own migration.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM authenticated;
