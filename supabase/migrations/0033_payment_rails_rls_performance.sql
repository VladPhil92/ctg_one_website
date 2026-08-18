-- CTG Craft Beer Investment OS — Payment Rails RLS performance
-- Resolve Supabase auth_rls_initplan warnings introduced by 0031 by evaluating
-- auth/RBAC context once per statement instead of once per candidate row.

alter policy investment_payment_receipts_read_authorized
  on public.investment_payment_receipts
  using (
    participant_user_id = (select auth.uid())
    or (select public.has_investment_permission('finance.read'))
    or (select public.has_investment_permission('funding.manage'))
    or (select public.has_investment_permission('audit.read'))
  );

alter policy investment_payouts_read_authorized
  on public.investment_payouts
  using (
    participant_user_id = (select auth.uid())
    or (select public.has_investment_permission('finance.read'))
    or (select public.has_investment_permission('finance.manage'))
    or (select public.has_investment_permission('audit.read'))
  );

alter policy investment_payout_events_read_authorized
  on public.investment_payout_events
  using (
    exists (
      select 1
      from public.investment_payouts p
      where p.id = investment_payout_events.payout_id
        and (
          p.participant_user_id = (select auth.uid())
          or (select public.has_investment_permission('finance.read'))
          or (select public.has_investment_permission('finance.manage'))
          or (select public.has_investment_permission('audit.read'))
        )
    )
  );

comment on table public.investment_payment_receipts is
  'Immutable authoritative inbound cash receipt. Read policy evaluates auth/RBAC context once per statement.';
comment on table public.investment_payouts is
  'Immutable outbound payout instruction/document. Read policy evaluates auth/RBAC context once per statement.';
comment on table public.investment_payout_events is
  'Append-only payout provider lifecycle. Read policy evaluates auth/RBAC context once per statement.';
