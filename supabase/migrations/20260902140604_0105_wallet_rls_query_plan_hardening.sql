-- CTG One — Wallet RLS Query-Plan Hardening
--
-- Preserve the existing authenticated read boundaries while allowing PostgreSQL
-- to evaluate auth.uid() once per statement instead of once per row. Add
-- covering indexes for foreign keys flagged by the production database advisor.

alter policy wallet_accounts_v2_read_own
  on public.wallet_accounts_v2
  using (user_id = (select auth.uid()));

alter policy wallet_external_accounts_read_own
  on public.wallet_external_accounts
  using (user_id = (select auth.uid()));

alter policy wallet_identity_audit_log_read_own_or_admin
  on public.wallet_identity_audit_log
  using ((actor_user_id = (select auth.uid())) or (select is_admin()));

alter policy wallet_identity_links_read_own
  on public.wallet_identity_links
  using (user_id = (select auth.uid()));

alter policy wallet_intents_v2_read_own
  on public.wallet_intents_v2
  using (user_id = (select auth.uid()));

alter policy wallet_journal_entries_v2_read_own
  on public.wallet_journal_entries_v2
  using (subject_user_id = (select auth.uid()));

alter policy wallet_journal_postings_v2_read_own
  on public.wallet_journal_postings_v2
  using (
    exists (
      select 1
      from public.wallet_journal_entries_v2 e
      where e.id = wallet_journal_postings_v2.entry_id
        and e.subject_user_id = (select auth.uid())
    )
  );

alter policy wallet_transaction_references_v2_read_own
  on public.wallet_transaction_references_v2
  using (subject_user_id = (select auth.uid()));

create index if not exists wallet_chain_operational_alerts_v1_correlation_idx
  on public.wallet_chain_operational_alerts_v1 (operational_correlation_id);

create index if not exists wallet_external_accounts_identity_link_user_idx
  on public.wallet_external_accounts (identity_link_id, user_id);

create index if not exists wallet_identity_audit_log_external_account_idx
  on public.wallet_identity_audit_log (external_account_id);

create index if not exists wallet_shadow_opening_snapshots_v2_journal_entry_idx
  on public.wallet_shadow_opening_snapshots_v2 (journal_entry_id);

create index if not exists wallet_topup_claims_reconciled_by_idx
  on public.wallet_topup_claims (reconciled_by);

create index if not exists wallet_topup_claims_rejected_by_idx
  on public.wallet_topup_claims (rejected_by);

create index if not exists wallet_topup_claims_verified_by_idx
  on public.wallet_topup_claims (verified_by);

create index if not exists wallet_transaction_references_v2_intent_idx
  on public.wallet_transaction_references_v2 (intent_id);

create index if not exists wallet_transaction_references_v2_journal_entry_idx
  on public.wallet_transaction_references_v2 (journal_entry_id);
