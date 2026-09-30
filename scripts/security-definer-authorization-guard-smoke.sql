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

-- Direct authenticated execution of these implementations has been deliberately
-- retired. Their reviewed body fingerprints remain as immutable historical
-- authorization evidence. Runtime access is now mediated through service-role-
-- only server boundaries, which independently revalidate the actor in PostgreSQL.
CREATE TEMP TABLE retired_authenticated_security_definer_signatures(
  signature text PRIMARY KEY
);

INSERT INTO retired_authenticated_security_definer_signatures(signature) VALUES
  ('public.verify_wallet_topup_claim(p_claim_id uuid, p_verification_notes text)'),
  ('public.reconcile_wallet_topup_claim(p_claim_id uuid, p_admin_notes text)'),
  ('public.reject_wallet_topup_claim(p_claim_id uuid, p_reason text)'),
  ('public.approve_kyc(p_submission_id uuid, p_admin_notes text)'),
  ('public.reject_kyc(p_submission_id uuid, p_reason text)'),
  ('public.approve_withdrawal(p_request_id uuid)'),
  ('public.reject_withdrawal(p_request_id uuid, p_reason text)'),
  ('public.set_investment_user_role(p_user_id uuid, p_role text)'),
  ('public.verify_investment_bancolombia_transfer(p_order_id uuid, p_bank_reference text, p_received_amount_cents bigint, p_bank_received_at timestamp with time zone, p_notes text)'),
  ('public.verify_investment_crypto_transfer(p_order_id uuid, p_transaction_hash text, p_network text, p_received_amount_cents bigint, p_received_at timestamp with time zone, p_notes text)'),
  ('public.initiate_investment_payout(p_request_id uuid, p_payout_rail text, p_provider_code text, p_destination_masked text, p_destination_fingerprint text, p_idempotency_key text, p_notes text)'),
  ('public.confirm_investment_payout(p_payout_id uuid, p_external_reference text, p_paid_at timestamp with time zone, p_notes text)'),
  ('public.fail_investment_payout(p_payout_id uuid, p_reason text, p_external_reference text)'),
  -- Migration 0144 moves the following Finance/Production/Operations surface
  -- from direct authenticated execution to explicit service_role execution.
  ('public.auto_match_pending_investment_financial_events(p_limit integer)'),
  ('public.get_finance_payout_queue_snapshot(p_active_limit integer, p_active_offset integer, p_paid_limit integer, p_paid_offset integer)'),
  ('public.get_investment_financial_reconciliation_inbox(p_limit integer)'),
  ('public.get_investment_provider_reconciliation_health()'),
  ('public.get_manual_bank_verification_health()'),
  ('public.get_manual_crypto_verification_health()'),
  ('public.get_operations_dashboard_snapshot(p_lot_limit integer)'),
  ('public.get_operations_intelligence_snapshot()'),
  ('public.get_system_migration_health()'),
  ('public.list_investment_role_assignments()'),
  ('public.generate_bottle_units(p_lot_id uuid, p_quantity integer)'),
  ('public.ingest_investment_financial_event(p_provider_code text, p_provider_event_key text, p_direction text, p_event_type text, p_payment_rail text, p_amount_cents bigint, p_external_reference text, p_merchant_reference text, p_occurred_at timestamp with time zone, p_payload_sha256 text)'),
  ('public.reconcile_investment_order_payment(p_order_id uuid, p_payment_rail text, p_provider_code text, p_external_reference text, p_amount_cents bigint, p_settled_at timestamp with time zone, p_idempotency_key text, p_notes text)'),
  ('public.record_bottle_sale_document(p_lot_id uuid, p_serial_codes text[], p_unit_price_cents bigint, p_channel_code text, p_idempotency_key text, p_sale_reference text, p_location text, p_tax_cents bigint)'),
  ('public.record_sale_return_credit_note(p_sale_id uuid, p_serial_codes text[], p_return_location text, p_reason_code text, p_idempotency_key text, p_credit_reference text, p_notes text)'),
  ('public.reject_investment_bank_proof(p_order_id uuid, p_reason text)'),
  ('public.reject_investment_order(p_order_id uuid, p_admin_notes text)'),
  ('public.resolve_investment_financial_event(p_event_id uuid, p_action text, p_order_id uuid, p_payout_id uuid, p_notes text)'),
  ('public.transition_lot_status(p_lot_id uuid, p_new_status text, p_notes text, p_evidence_document_id uuid)'),
  ('public.update_bottle_units_status(p_lot_id uuid, p_serial_codes text[], p_new_status text, p_location text)'),
  ('public.update_investment_beer_style_economics(p_style_code text, p_production_cost_unit_cents bigint, p_label_cost_unit_cents bigint, p_transport_cost_unit_cents bigint, p_own_point_price_unit_cents bigint, p_b2b_price_unit_cents bigint, p_inc_rate numeric, p_advertising_rate_on_pre_inc numeric)'),
  ('public.upsert_inventory_location(p_code text, p_name text, p_location_type text, p_address text, p_active boolean)');

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

  -- Freeze exact reviewed search_path values. Education quote decision RPCs
  -- intentionally pin pg_catalog before public. Wallet COP top-up administration
  -- and the authenticated API rate limiter intentionally use an empty
  -- search_path: every application object is schema-qualified and only
  -- pg_catalog remains implicitly visible.
  SELECT coalesce(array_agg(a.signature ORDER BY a.signature), ARRAY[]::text[])
  INTO v_bad_config
  FROM actual_authenticated_security_definer_bodies a
  WHERE a.function_config IS DISTINCT FROM
    CASE
      WHEN a.signature IN (
        'public.accept_education_service_quote(p_quote_id uuid)',
        'public.decline_education_service_quote(p_quote_id uuid)'
      )
        THEN ARRAY['search_path=pg_catalog, public']::text[]
      WHEN a.signature IN (
        'public.approve_deposit(p_transaction_id uuid, p_admin_notes text)',
        'public.consume_api_rate_limit(p_scope text)',
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
