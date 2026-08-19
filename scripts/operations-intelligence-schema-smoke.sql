\set ON_ERROR_STOP on

-- Exercise the P2.5 snapshot under a real authenticated SUPER_ADMIN identity.
-- The transaction is rolled back so this leaves no fixture data behind.
BEGIN;

INSERT INTO auth.users(id)
VALUES ('00000000-0000-0000-0000-000000000057'::uuid);

INSERT INTO public.investment_participant_profiles(user_id, investment_role)
VALUES ('00000000-0000-0000-0000-000000000057'::uuid, 'SUPER_ADMIN');

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000057', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  v_snapshot jsonb;
BEGIN
  v_snapshot := public.get_operations_intelligence_snapshot();

  IF v_snapshot ->> 'mode' <> 'READ_ONLY' THEN
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
END $$;

ROLLBACK;
