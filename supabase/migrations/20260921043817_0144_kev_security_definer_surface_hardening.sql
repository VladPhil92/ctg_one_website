-- KEV / CTG One security hardening phase 1.
-- Reduce default EXECUTE exposure for privileged SECURITY DEFINER RPCs while
-- preserving deliberately public read-only trace/funding endpoints and
-- explicitly user-facing authenticated workflows.

-- Finance/operations RPCs: server/admin surfaces only. Their function bodies
-- retain permission checks as defense in depth.
REVOKE EXECUTE ON FUNCTION public.auto_match_pending_investment_financial_events(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_finance_payout_queue_snapshot(integer,integer,integer,integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_investment_financial_reconciliation_inbox(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_investment_provider_reconciliation_health() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_manual_bank_verification_health() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_manual_crypto_verification_health() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_operations_dashboard_snapshot(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_operations_intelligence_snapshot() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_system_migration_health() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.list_investment_role_assignments() FROM PUBLIC, anon, authenticated;

-- Production/inventory mutation and sensitive reconciliation surfaces.
REVOKE EXECUTE ON FUNCTION public.generate_bottle_units(uuid,integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ingest_investment_financial_event(text,text,text,text,text,bigint,text,text,timestamptz,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reconcile_investment_order_payment(uuid,text,text,text,bigint,timestamptz,text,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_bottle_sale_document(uuid,text[],bigint,text,text,text,text,bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_sale_return_credit_note(uuid,text[],text,text,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reject_investment_bank_proof(uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reject_investment_order(uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.resolve_investment_financial_event(uuid,text,uuid,uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.transition_lot_status(uuid,text,text,uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_bottle_units_status(uuid,text[],text,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_investment_beer_style_economics(text,bigint,bigint,bigint,bigint,bigint,numeric,numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.upsert_inventory_location(text,text,text,text,boolean) FROM PUBLIC, anon, authenticated;

-- Explicitly grant the trusted backend role. service_role normally bypasses
-- RLS, but EXECUTE is separately privilege-gated after the revokes above.
GRANT EXECUTE ON FUNCTION public.auto_match_pending_investment_financial_events(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_finance_payout_queue_snapshot(integer,integer,integer,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_investment_financial_reconciliation_inbox(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_investment_provider_reconciliation_health() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_manual_bank_verification_health() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_manual_crypto_verification_health() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_operations_dashboard_snapshot(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_operations_intelligence_snapshot() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_system_migration_health() TO service_role;
GRANT EXECUTE ON FUNCTION public.list_investment_role_assignments() TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_bottle_units(uuid,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.ingest_investment_financial_event(text,text,text,text,text,bigint,text,text,timestamptz,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_investment_order_payment(uuid,text,text,text,bigint,timestamptz,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_bottle_sale_document(uuid,text[],bigint,text,text,text,text,bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_sale_return_credit_note(uuid,text[],text,text,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reject_investment_bank_proof(uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reject_investment_order(uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.resolve_investment_financial_event(uuid,text,uuid,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.transition_lot_status(uuid,text,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_bottle_units_status(uuid,text[],text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_investment_beer_style_economics(text,bigint,bigint,bigint,bigint,bigint,numeric,numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.upsert_inventory_location(text,text,text,text,boolean) TO service_role;
