\set ON_ERROR_STOP on

-- CTG One — RLS permission-call hoisting contract (whole `public` schema)
--
-- Migrations 0070 (investment tables) and 0071 (accounts and knowledge tables)
-- hoisted every row-independent permission call in the RLS policies into a
-- `(select ...)` InitPlan, so Postgres evaluates it once per query instead of
-- once per candidate row.
--
-- Two things must stay true, and they pull against each other:
--   1. no policy may go back to calling a permission function per row
--      (the performance regression), and
--   2. no policy may lose its permission check while being rewritten
--      (the security regression).
-- Asserting only the first would let a "fix" that deletes the check pass.

do $$
declare v_unhoisted text[];
begin
  select coalesce(array_agg(tablename||'.'||policyname order by tablename,policyname),array[]::text[])
  into v_unhoisted
  from pg_policies
  where schemaname='public'
    and (coalesce(qual,'')||coalesce(with_check,'')) ~ '(has_investment_permission|is_investment_admin|is_admin|is_investment_operator|is_investment_sales_operator)\('
    and (coalesce(qual,'')||coalesce(with_check,'')) !~ 'SELECT (has_investment_permission|is_investment_admin|is_admin|is_investment_operator|is_investment_sales_operator)';

  if array_length(v_unhoisted,1) > 0 then
    raise exception 'RLS policies re-evaluate a permission function per row: %', v_unhoisted;
  end if;
end $$;

do $$
declare
  v_expected text[] := array[
    'admin_audit_log.admin_audit_log_select',
    'investment_audit_log.investment_audit_log_select',
    'investment_beer_styles.investment_beer_styles_public_read',
    'investment_bottle_units.investment_bottle_units_read_operator',
    'investment_documents.investment_documents_select',
    'investment_financial_event_matches.investment_financial_event_matches_read_finance',
    'investment_financial_provider_events.investment_financial_provider_events_read_finance',
    'investment_funding_allocations.investment_funding_allocations_select',
    'investment_inventory_locations.investment_inventory_locations_read',
    'investment_inventory_movement_units.investment_inventory_movement_units_read',
    'investment_inventory_movements.investment_inventory_movements_read_operator',
    'investment_ledger_entries.investment_ledger_entries_select',
    'investment_lot_financial_entries.investment_lot_financial_entries_select',
    'investment_orders.investment_orders_select_own_or_admin',
    'investment_participant_profiles.investment_participant_profiles_select',
    'investment_payment_receipts.investment_payment_receipts_read_authorized',
    'investment_payout_events.investment_payout_events_read_authorized',
    'investment_payouts.investment_payouts_read_authorized',
    'investment_production_events.investment_production_events_ops_select',
    'investment_production_lots.investment_production_lots_ops_select',
    'investment_reinvestment_requests.investment_reinvestment_requests_select',
    'investment_sale_items.investment_sale_items_read_authorized',
    'investment_sales.investment_sales_read_authorized',
    'investment_sales_channels.investment_sales_channels_read',
    'investment_sales_credit_note_items.investment_sales_credit_note_items_read_authorized',
    'investment_sales_credit_notes.investment_sales_credit_notes_read_authorized',
    'investment_settlements.investment_settlements_select',
    'investment_withdrawal_requests.investment_withdrawal_requests_select',
    'knowledge_chunks.knowledge_chunks_admin_delete',
    'knowledge_chunks.knowledge_chunks_admin_insert',
    'knowledge_chunks.knowledge_chunks_admin_update',
    'knowledge_documents.knowledge_documents_admin_delete',
    'knowledge_documents.knowledge_documents_admin_insert',
    'knowledge_documents.knowledge_documents_admin_update',
    'kyc_documents.kyc_documents_select',
    'kyc_submissions.kyc_submissions_select',
    'profiles.profiles_select',
    'transactions.transactions_select',
    'wallets.wallets_select'
  ];
  v_actual text[];
  v_lost text[];
  v_added text[];
begin
  select coalesce(array_agg(tablename||'.'||policyname order by tablename||'.'||policyname),array[]::text[])
  into v_actual
  from pg_policies
  where schemaname='public'
    and (coalesce(qual,'')||coalesce(with_check,'')) ~ '(has_investment_permission|is_investment_admin|is_admin|is_investment_operator|is_investment_sales_operator)\(';

  select coalesce(array_agg(e),array[]::text[]) into v_lost
  from unnest(v_expected) e where e <> all(v_actual);

  select coalesce(array_agg(a),array[]::text[]) into v_added
  from unnest(v_actual) a where a <> all(v_expected);

  if array_length(v_lost,1) > 0 then
    raise exception 'RLS policies lost their permission check: %', v_lost;
  end if;
  if array_length(v_added,1) > 0 then
    raise exception 'unreviewed RLS policies now gate on a permission function: %', v_added;
  end if;
end $$;

select 'RLS permission-hoisting contract: PASS' as result;
