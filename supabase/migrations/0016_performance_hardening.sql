-- CTG One performance hardening
-- Adds covering indexes for foreign keys reported by Supabase advisors
-- and optimizes auth.uid() usage in hot RLS policies.

create index if not exists admin_audit_log_admin_id_idx on public.admin_audit_log(admin_id);
create index if not exists investment_audit_log_actor_id_idx on public.investment_audit_log(actor_id);
create index if not exists investment_bottle_units_last_actor_id_idx on public.investment_bottle_units(last_actor_id);
create index if not exists investment_documents_uploaded_by_idx on public.investment_documents(uploaded_by);
create index if not exists investment_funding_allocations_formula_version_id_idx on public.investment_funding_allocations(formula_version_id);
create index if not exists investment_inventory_movements_actor_id_idx on public.investment_inventory_movements(actor_id);
create index if not exists investment_ledger_entries_actor_id_idx on public.investment_ledger_entries(actor_id);
create index if not exists investment_ledger_entries_allocation_id_idx on public.investment_ledger_entries(allocation_id);
create index if not exists investment_ledger_entries_lot_id_idx on public.investment_ledger_entries(lot_id);
create index if not exists investment_lot_financial_entries_actor_id_idx on public.investment_lot_financial_entries(actor_id);
create index if not exists investment_orders_allocation_id_idx on public.investment_orders(allocation_id);
create index if not exists investment_orders_reviewed_by_idx on public.investment_orders(reviewed_by);
create index if not exists investment_production_events_actor_id_idx on public.investment_production_events(actor_id);
create index if not exists investment_production_events_evidence_document_id_idx on public.investment_production_events(evidence_document_id);
create index if not exists investment_production_events_lot_id_idx on public.investment_production_events(lot_id);
create index if not exists investment_production_lots_created_by_idx on public.investment_production_lots(created_by);
create index if not exists investment_reinvestment_requests_participant_user_id_idx on public.investment_reinvestment_requests(participant_user_id);
create index if not exists investment_reinvestment_requests_reviewed_by_idx on public.investment_reinvestment_requests(reviewed_by);
create index if not exists investment_reinvestment_requests_source_settlement_id_idx on public.investment_reinvestment_requests(source_settlement_id);
create index if not exists investment_reinvestment_requests_target_lot_id_idx on public.investment_reinvestment_requests(target_lot_id);
create index if not exists investment_sales_created_by_idx on public.investment_sales(created_by);
create index if not exists investment_settlements_finalized_by_idx on public.investment_settlements(finalized_by);
create index if not exists investment_settlements_formula_version_id_idx on public.investment_settlements(formula_version_id);
create index if not exists investment_withdrawal_requests_participant_user_id_idx on public.investment_withdrawal_requests(participant_user_id);
create index if not exists investment_withdrawal_requests_reviewed_by_idx on public.investment_withdrawal_requests(reviewed_by);
create index if not exists knowledge_documents_created_by_idx on public.knowledge_documents(created_by);
create index if not exists kyc_documents_submission_id_idx on public.kyc_documents(submission_id);
create index if not exists kyc_submissions_reviewed_by_idx on public.kyc_submissions(reviewed_by);
create index if not exists transactions_reviewed_by_idx on public.transactions(reviewed_by);

drop policy if exists investment_orders_select_own_or_admin on public.investment_orders;
create policy investment_orders_select_own_or_admin
  on public.investment_orders for select to authenticated
  using (participant_user_id = (select auth.uid()) or public.is_investment_admin());

drop policy if exists investment_bottle_units_read_operator on public.investment_bottle_units;
create policy investment_bottle_units_read_operator
  on public.investment_bottle_units for select to authenticated
  using (
    public.is_investment_operator()
    or public.is_investment_admin()
    or exists (
      select 1 from public.investment_participant_profiles p
      where p.user_id = (select auth.uid())
        and p.investment_role in ('SALES_MANAGER','AUDITOR')
    )
  );

drop policy if exists knowledge_documents_admin_insert on public.knowledge_documents;
create policy knowledge_documents_admin_insert
  on public.knowledge_documents for insert to authenticated
  with check (public.is_admin() and created_by = (select auth.uid()));
