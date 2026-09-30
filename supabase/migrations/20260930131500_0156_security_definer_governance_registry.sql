-- 0156: SECURITY DEFINER exposure governance.
--
-- Supabase Security Advisor deliberately warns whenever anon/authenticated can
-- execute SECURITY DEFINER functions. CTG One intentionally keeps a narrowly
-- reviewed set of such RPCs where definer rights are required and authorization
-- is revalidated inside the function body. Existing CI freezes exact signatures,
-- executable body hashes and search_path. This migration adds the missing
-- semantic classification so every exposed definer has an explicit reason.

create table if not exists private.security_definer_governance_registry (
  signature text primary key,
  classification text not null check (classification in (
    'PUBLIC_INTENTIONAL',
    'AUTHENTICATED_SELF_SERVICE',
    'PRIVILEGED_WITH_INTERNAL_GUARD',
    'SERVER_ONLY'
  )),
  rationale text not null,
  reviewed_at timestamptz not null default clock_timestamp()
);

revoke all on table private.security_definer_governance_registry from public, anon, authenticated;
grant select on table private.security_definer_governance_registry to service_role;

insert into private.security_definer_governance_registry(signature, classification, rationale)
values
  ('public.get_public_bottle_trace(p_serial_code text)', 'PUBLIC_INTENTIONAL', 'Curated public bottle trace projection. Result shape and referenced objects are frozen by CI.'),
  ('public.get_public_investment_lot_funding(p_lot_id uuid)', 'PUBLIC_INTENTIONAL', 'Curated public lot-funding aggregate. Private funding fields are prohibited by CI.'),
  ('public.get_public_investment_lot_operations(p_lot_id uuid)', 'PUBLIC_INTENTIONAL', 'Curated public operational aggregate and timeline. Private event/unit fields are prohibited by CI.'),

  ('public.accept_education_service_quote(p_quote_id uuid)', 'AUTHENTICATED_SELF_SERVICE', 'Caller-bound education quote decision using auth.uid().'),
  ('public.accept_investment_agreement()', 'AUTHENTICATED_SELF_SERVICE', 'Caller records own investment agreement acceptance using auth.uid().'),
  ('public.begin_kyc_submission()', 'AUTHENTICATED_SELF_SERVICE', 'Caller starts own KYC submission using auth.uid().'),
  ('public.cancel_reinvestment_request(p_request_id uuid)', 'AUTHENTICATED_SELF_SERVICE', 'Caller cancellation is ownership-bound to auth.uid().'),
  ('public.consume_api_rate_limit(p_scope text)', 'AUTHENTICATED_SELF_SERVICE', 'Authenticated rate-limit window is keyed to canonical auth.uid().'),
  ('public.create_investment_order(p_lot_id uuid, p_case_equivalent_units integer, p_idempotency_key text)', 'AUTHENTICATED_SELF_SERVICE', 'Participant order creation binds participant identity to auth.uid().'),
  ('public.decline_education_service_quote(p_quote_id uuid)', 'AUTHENTICATED_SELF_SERVICE', 'Caller-bound education quote decision using auth.uid().'),
  ('public.ensure_investment_participant_profile()', 'AUTHENTICATED_SELF_SERVICE', 'Ensures the canonical participant profile for auth.uid().'),
  ('public.finalize_kyc_submission(p_submission_id uuid)', 'AUTHENTICATED_SELF_SERVICE', 'KYC finalization validates caller ownership through auth.uid().'),
  ('public.get_investment_role()', 'AUTHENTICATED_SELF_SERVICE', 'Returns the canonical role for the current auth.uid().'),
  ('public.get_participant_reinvestment_context()', 'AUTHENTICATED_SELF_SERVICE', 'Returns reinvestment context for the current auth.uid().'),
  ('public.has_investment_permission(p_permission text)', 'AUTHENTICATED_SELF_SERVICE', 'Capability predicate evaluates canonical permissions for the current authenticated principal.'),
  ('public.is_admin()', 'AUTHENTICATED_SELF_SERVICE', 'Admin predicate derives status from canonical authenticated identity.'),
  ('public.is_investment_admin()', 'AUTHENTICATED_SELF_SERVICE', 'Investment-admin predicate derives status from canonical authenticated identity.'),
  ('public.is_investment_operator()', 'AUTHENTICATED_SELF_SERVICE', 'Investment-operator predicate derives status from canonical authenticated identity.'),
  ('public.is_investment_sales_operator()', 'AUTHENTICATED_SELF_SERVICE', 'Sales-operator predicate derives status from canonical authenticated identity.'),
  ('public.register_kyc_document(p_submission_id uuid, p_document_type text, p_storage_path text)', 'AUTHENTICATED_SELF_SERVICE', 'Registers a KYC document only inside the caller-owned submission context.'),
  ('public.request_reinvestment_cases(p_source_settlement_id uuid, p_target_lot_id uuid, p_case_equivalent_units integer, p_idempotency_key text)', 'AUTHENTICATED_SELF_SERVICE', 'Participant reinvestment request is bound to auth.uid() and available settlement credit.'),
  ('public.request_withdrawal(p_amount_cents bigint)', 'AUTHENTICATED_SELF_SERVICE', 'Participant withdrawal request is bound to auth.uid() and spendable balance.'),
  ('public.set_investment_payout_destination(p_destination_masked text, p_destination_fingerprint text)', 'AUTHENTICATED_SELF_SERVICE', 'Participant configures only the payout destination attached to auth.uid().'),

  ('public.approve_deposit(p_transaction_id uuid, p_admin_notes text)', 'PRIVILEGED_WITH_INTERNAL_GUARD', 'Money-moving administration requires canonical public.is_admin() before reconciliation.'),
  ('public.approve_reinvestment(p_request_id uuid, p_case_equivalent_units integer)', 'PRIVILEGED_WITH_INTERNAL_GUARD', 'Approval requires public.is_investment_admin() plus KYC, reservation and balance invariants.'),
  ('public.approve_reinvestment_request(p_request_id uuid)', 'PRIVILEGED_WITH_INTERNAL_GUARD', 'Legacy-compatible approval delegates only after public.is_investment_admin().'),
  ('public.auto_match_investment_financial_event(p_event_id uuid)', 'PRIVILEGED_WITH_INTERNAL_GUARD', 'Financial-event matching requires reviewed investment permission and canonical actor identity.'),
  ('public.create_production_lot_from_style(p_style_code text, p_destination text, p_total_cases integer, p_case_size_units integer, p_production_cost_unit_cents bigint, p_label_cost_unit_cents bigint, p_transport_cost_unit_cents bigint, p_own_point_price_unit_cents bigint, p_b2b_price_unit_cents bigint, p_inc_rate numeric, p_advertising_rate_on_pre_inc numeric, p_total_eligible_units integer)', 'PRIVILEGED_WITH_INTERNAL_GUARD', 'Production lot creation requires production.manage permission and records canonical actor identity.'),
  ('public.finalize_settlement(p_lot_id uuid)', 'PRIVILEGED_WITH_INTERNAL_GUARD', 'Settlement requires public.is_investment_admin() and full financial reconciliation invariants.'),
  ('public.get_acquisition_funnel_snapshot(p_days integer)', 'PRIVILEGED_WITH_INTERNAL_GUARD', 'Administrative analytics are guarded by public.is_admin().'),
  ('public.get_admin_command_snapshot()', 'PRIVILEGED_WITH_INTERNAL_GUARD', 'Administrative command snapshot is guarded by public.is_admin().'),
  ('public.get_finance_reinvestment_queue_snapshot(p_active_limit integer, p_history_limit integer)', 'PRIVILEGED_WITH_INTERNAL_GUARD', 'Finance queue visibility requires public.is_investment_admin().'),
  ('public.get_inventory_location_stock(p_lot_id uuid)', 'PRIVILEGED_WITH_INTERNAL_GUARD', 'Inventory visibility requires reviewed investment permission.'),
  ('public.get_inventory_reconciliation(p_lot_id uuid)', 'PRIVILEGED_WITH_INTERNAL_GUARD', 'Inventory reconciliation requires reviewed investment permission.'),
  ('public.get_investment_available_balance(p_user uuid)', 'PRIVILEGED_WITH_INTERNAL_GUARD', 'Cross-user balance access is guarded while self access remains auth.uid()-bound.'),
  ('public.get_investment_inbound_reconciliation(p_order_id uuid)', 'PRIVILEGED_WITH_INTERNAL_GUARD', 'Inbound reconciliation validates reviewed investment permission/actor context.'),
  ('public.get_investment_operational_journey(p_lot_id uuid)', 'PRIVILEGED_WITH_INTERNAL_GUARD', 'Operational journey visibility requires reviewed investment permission.'),
  ('public.get_investment_payout_reconciliation(p_withdrawal_id uuid)', 'PRIVILEGED_WITH_INTERNAL_GUARD', 'Payout reconciliation validates reviewed investment permission/actor context.'),
  ('public.get_investment_spendable_balance(p_user uuid)', 'PRIVILEGED_WITH_INTERNAL_GUARD', 'Cross-user spendable-balance access is guarded while self access remains auth.uid()-bound.'),
  ('public.get_production_lot_inventory_snapshot(p_lot_id uuid, p_unit_limit integer, p_unit_offset integer)', 'PRIVILEGED_WITH_INTERNAL_GUARD', 'Detailed production inventory requires reviewed investment permission.'),
  ('public.get_sales_return_reconciliation(p_sale_id uuid)', 'PRIVILEGED_WITH_INTERNAL_GUARD', 'Sales-return reconciliation requires reviewed investment permission.'),
  ('public.record_lot_financial_entry(p_lot_id uuid, p_entry_type text, p_amount_cents bigint, p_description text)', 'PRIVILEGED_WITH_INTERNAL_GUARD', 'Manual financial entries require public.is_investment_admin() and prohibit manual revenue/tax writes.'),
  ('public.reject_deposit(p_transaction_id uuid, p_reason text)', 'PRIVILEGED_WITH_INTERNAL_GUARD', 'Deposit rejection requires canonical public.is_admin().'),
  ('public.reject_reinvestment_request(p_request_id uuid, p_reason text)', 'PRIVILEGED_WITH_INTERNAL_GUARD', 'Reinvestment rejection requires public.is_investment_admin().')
on conflict(signature) do update
set classification = excluded.classification,
    rationale = excluded.rationale,
    reviewed_at = clock_timestamp();

comment on table private.security_definer_governance_registry is
  'Reviewed classification of SECURITY DEFINER execution surfaces. Browser roles have no table access; CI proves exact registry parity with executable RPC grants.';

comment on function public.get_public_bottle_trace(text) is
  'PUBLIC_INTENTIONAL SECURITY DEFINER read model. Public projection, object references and result shape are frozen by CI.';
comment on function public.get_public_investment_lot_funding(uuid) is
  'PUBLIC_INTENTIONAL SECURITY DEFINER read model. Public aggregate and prohibited private fields are frozen by CI.';
comment on function public.get_public_investment_lot_operations(uuid) is
  'PUBLIC_INTENTIONAL SECURITY DEFINER read model. Public aggregate/timeline and prohibited private fields are frozen by CI.';

-- Record this server-owned governance table in the existing RLS/governance
-- inventory even though it deliberately relies on schema/grant isolation rather
-- than browser-facing RLS policies.
insert into private.rls_governance_registry(schema_name, table_name, classification, rationale)
values (
  'private',
  'security_definer_governance_registry',
  'service-only',
  'Private governance metadata; no anon/authenticated privileges and not exposed through the browser Data API.'
)
on conflict(schema_name, table_name) do update
set classification = excluded.classification,
    rationale = excluded.rationale,
    reviewed_at = clock_timestamp();
