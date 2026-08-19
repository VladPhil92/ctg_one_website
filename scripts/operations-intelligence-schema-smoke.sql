\set ON_ERROR_STOP on

-- Exercise read-only operational/admin snapshots under a real authenticated
-- SUPER_ADMIN + global admin identity. The transaction is rolled back so this
-- leaves no fixture data behind.
BEGIN;

INSERT INTO auth.users(id, email, aud, role, raw_user_meta_data)
VALUES (
  '00000000-0000-0000-0000-000000000057'::uuid,
  'operations-intelligence-smoke@ctgone.local',
  'authenticated',
  'authenticated',
  '{}'::jsonb
);

UPDATE public.profiles
SET role = 'admin'
WHERE id = '00000000-0000-0000-0000-000000000057'::uuid;

INSERT INTO public.investment_participant_profiles(user_id, investment_role)
VALUES ('00000000-0000-0000-0000-000000000057'::uuid, 'SUPER_ADMIN');

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000057', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_snapshot jsonb;
  v_admin jsonb;
  v_operations jsonb;
BEGIN
  v_snapshot := public.get_operations_intelligence_snapshot();

  IF (v_snapshot ->> 'mode') IS DISTINCT FROM 'READ_ONLY' THEN
    RAISE EXCEPTION 'operations intelligence snapshot must declare READ_ONLY mode';
  END IF;

  IF coalesce((v_snapshot #>> '{ai_contract,read_only}')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'operations intelligence AI contract must remain read-only';
  END IF;

  IF coalesce((v_snapshot #>> '{ai_contract,mutations_allowed}')::boolean, true) IS NOT FALSE THEN
    RAISE EXCEPTION 'operations intelligence AI contract must prohibit mutations';
  END IF;

  IF NOT (v_snapshot ? 'business' AND v_snapshot ? 'integrity' AND v_snapshot ? 'async_work') THEN
    RAISE EXCEPTION 'operations intelligence snapshot missing required aggregate sections';
  END IF;

  -- The read model is aggregate-only: it must not expose participant/provider
  -- identifiers or payout/payment destinations to the intelligence layer.
  IF v_snapshot::text ~* '(participant_user_id|provider_event_key|external_reference|merchant_reference|destination_account|bank_account|payment_reference|payment_proof_path)' THEN
    RAISE EXCEPTION 'operations intelligence snapshot exposed a prohibited identifier/reference field';
  END IF;

  v_admin := public.get_admin_command_snapshot();
  IF NOT (
    v_admin ? 'total_users'
    AND v_admin ? 'pending_kyc'
    AND v_admin ? 'pending_deposits'
    AND v_admin ? 'operational_wallet_balance_cents'
    AND v_admin ? 'pending_investment_orders'
  ) THEN
    RAISE EXCEPTION 'admin command snapshot missing required aggregate fields';
  END IF;

  IF v_admin::text ~* '(email|full_name|phone|external_reference|payment_proof_storage_path)' THEN
    RAISE EXCEPTION 'admin command snapshot exposed row-level PII/payment evidence';
  END IF;

  v_operations := public.get_operations_dashboard_snapshot(12);
  IF NOT (v_operations ? 'business' AND v_operations ? 'lot_performance') THEN
    RAISE EXCEPTION 'operations dashboard snapshot missing business/lot performance sections';
  END IF;

  IF jsonb_typeof(v_operations -> 'lot_performance') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'operations dashboard lot performance must be a bounded array';
  END IF;

  IF jsonb_array_length(v_operations -> 'lot_performance') > 12 THEN
    RAISE EXCEPTION 'operations dashboard exceeded requested lot bound';
  END IF;
END $$;

ROLLBACK;
