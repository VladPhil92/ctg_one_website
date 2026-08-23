-- CTG Craft Beer Investment OS — RLS permission-call evaluation hoisting
--
-- Row Level Security policies that call a row-independent permission function
-- directly are re-evaluated once per candidate row. Wrapping the call as
-- `(select f())` turns it into an InitPlan that Postgres evaluates once per
-- query, which is the documented Supabase RLS pattern.
--
-- This is a pure evaluation-frequency change, not an authorization change.
-- Every one of these functions is STABLE and takes either no argument or a
-- constant permission literal — none receives row data — so hoisting the call
-- cannot alter which rows a policy admits. The policy bodies below were
-- generated mechanically from the live `pg_policies` definitions rather than
-- retyped, so the predicates are byte-identical apart from the wrapping.
--
-- Measured on 20,000 investment_orders rows (PostgreSQL 16):
--
--   participant reading rows it owns       2.46 ms -> 2.34 ms  (no change;
--     the `owner = uid OR is_admin()` short-circuit already skipped the call)
--   participant scanning rows it does not  76.48 ms -> 2.80 ms  (~27x)
--
-- The second case is the one that grows: as participants accumulate, every
-- participant's share of "rows that are not mine" approaches the whole table,
-- so the per-row call becomes the dominant cost of ordinary reads.
--
-- Scope: `investment_*` tables only. Twelve policies on the pre-existing
-- accounts/knowledge tables (profiles, wallets, transactions, kyc_*,
-- knowledge_*, admin_audit_log) have the same pattern and the same available
-- gain, but they sit outside this initiative per CLAUDE.md and need a
-- separately authorized change.

drop policy if exists investment_audit_log_select on public.investment_audit_log;
create policy investment_audit_log_select on public.investment_audit_log
  as permissive
  for select
  to public
  using (( SELECT is_investment_admin()));

drop policy if exists investment_beer_styles_public_read on public.investment_beer_styles;
create policy investment_beer_styles_public_read on public.investment_beer_styles
  as permissive
  for select
  to anon, authenticated
  using (((active = true) OR ( SELECT has_investment_permission('production.manage'::text))));

drop policy if exists investment_bottle_units_read_operator on public.investment_bottle_units;
create policy investment_bottle_units_read_operator on public.investment_bottle_units
  as permissive
  for select
  to authenticated
  using (( SELECT has_investment_permission('ops.read'::text)));

drop policy if exists investment_documents_select on public.investment_documents;
create policy investment_documents_select on public.investment_documents
  as permissive
  for select
  to public
  using ((( SELECT is_investment_admin()) OR (owner_type = 'LOT'::text) OR ((owner_type = 'PARTICIPANT'::text) AND (owner_id = ( SELECT auth.uid() AS uid)))));

drop policy if exists investment_funding_allocations_select on public.investment_funding_allocations;
create policy investment_funding_allocations_select on public.investment_funding_allocations
  as permissive
  for select
  to public
  using (((participant_user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT is_investment_admin())));

drop policy if exists investment_inventory_locations_read on public.investment_inventory_locations;
create policy investment_inventory_locations_read on public.investment_inventory_locations
  as permissive
  for select
  to authenticated
  using (( SELECT has_investment_permission('ops.read'::text)));

drop policy if exists investment_inventory_movement_units_read on public.investment_inventory_movement_units;
create policy investment_inventory_movement_units_read on public.investment_inventory_movement_units
  as permissive
  for select
  to authenticated
  using (( SELECT has_investment_permission('ops.read'::text)));

drop policy if exists investment_inventory_movements_read_operator on public.investment_inventory_movements;
create policy investment_inventory_movements_read_operator on public.investment_inventory_movements
  as permissive
  for select
  to authenticated
  using (( SELECT has_investment_permission('ops.read'::text)));

drop policy if exists investment_ledger_entries_select on public.investment_ledger_entries;
create policy investment_ledger_entries_select on public.investment_ledger_entries
  as permissive
  for select
  to public
  using (((participant_user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT is_investment_admin())));

drop policy if exists investment_lot_financial_entries_select on public.investment_lot_financial_entries;
create policy investment_lot_financial_entries_select on public.investment_lot_financial_entries
  as permissive
  for select
  to public
  using (( SELECT is_investment_admin()));

drop policy if exists investment_orders_select_own_or_admin on public.investment_orders;
create policy investment_orders_select_own_or_admin on public.investment_orders
  as permissive
  for select
  to authenticated
  using (((participant_user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT is_investment_admin())));

drop policy if exists investment_participant_profiles_select on public.investment_participant_profiles;
create policy investment_participant_profiles_select on public.investment_participant_profiles
  as permissive
  for select
  to public
  using (((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT is_investment_admin())));

drop policy if exists investment_reinvestment_requests_select on public.investment_reinvestment_requests;
create policy investment_reinvestment_requests_select on public.investment_reinvestment_requests
  as permissive
  for select
  to public
  using (((participant_user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT is_investment_admin())));

drop policy if exists investment_sale_items_read_authorized on public.investment_sale_items;
create policy investment_sale_items_read_authorized on public.investment_sale_items
  as permissive
  for select
  to authenticated
  using ((( SELECT has_investment_permission('sales.manage'::text)) OR ( SELECT has_investment_permission('finance.read'::text)) OR ( SELECT has_investment_permission('audit.read'::text))));

drop policy if exists investment_sales_read_authorized on public.investment_sales;
create policy investment_sales_read_authorized on public.investment_sales
  as permissive
  for select
  to authenticated
  using ((( SELECT has_investment_permission('sales.manage'::text)) OR ( SELECT has_investment_permission('finance.read'::text)) OR ( SELECT has_investment_permission('audit.read'::text))));

drop policy if exists investment_sales_channels_read on public.investment_sales_channels;
create policy investment_sales_channels_read on public.investment_sales_channels
  as permissive
  for select
  to authenticated
  using (((active = true) OR ( SELECT has_investment_permission('sales.manage'::text))));

drop policy if exists investment_sales_credit_note_items_read_authorized on public.investment_sales_credit_note_items;
create policy investment_sales_credit_note_items_read_authorized on public.investment_sales_credit_note_items
  as permissive
  for select
  to authenticated
  using ((( SELECT has_investment_permission('sales.manage'::text)) OR ( SELECT has_investment_permission('finance.read'::text)) OR ( SELECT has_investment_permission('audit.read'::text))));

drop policy if exists investment_sales_credit_notes_read_authorized on public.investment_sales_credit_notes;
create policy investment_sales_credit_notes_read_authorized on public.investment_sales_credit_notes
  as permissive
  for select
  to authenticated
  using ((( SELECT has_investment_permission('sales.manage'::text)) OR ( SELECT has_investment_permission('finance.read'::text)) OR ( SELECT has_investment_permission('audit.read'::text))));

drop policy if exists investment_settlements_select on public.investment_settlements;
create policy investment_settlements_select on public.investment_settlements
  as permissive
  for select
  to public
  using (( SELECT is_investment_admin()));

drop policy if exists investment_withdrawal_requests_select on public.investment_withdrawal_requests;
create policy investment_withdrawal_requests_select on public.investment_withdrawal_requests
  as permissive
  for select
  to public
  using (((participant_user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT is_investment_admin())));


-- Fail closed: no investment policy may leave a permission call unhoisted.
do $$
declare v_remaining text[];
begin
  select coalesce(array_agg(tablename||'.'||policyname order by tablename,policyname),array[]::text[])
  into v_remaining
  from pg_policies
  where schemaname='public'
    and tablename like 'investment%'
    and (coalesce(qual,'')||coalesce(with_check,'')) ~ '(has_investment_permission|is_investment_admin|is_admin|is_investment_operator|is_investment_sales_operator)\('
    and (coalesce(qual,'')||coalesce(with_check,'')) !~ 'SELECT (has_investment_permission|is_investment_admin|is_admin|is_investment_operator|is_investment_sales_operator)';

  if array_length(v_remaining,1) > 0 then
    raise exception 'investment RLS policies still re-evaluate a permission function per row: %', v_remaining;
  end if;
end $$;
