-- CTG One — Crowdfunding FK index hardening
-- Covers the three foreign keys surfaced by the production Supabase advisor
-- after migrations 0126/0127. This migration is additive and changes no trust
-- boundary, settlement state or browser privilege.

create index if not exists federated_crowdfunding_campaigns_subject_idx
  on public.federated_crowdfunding_campaigns(subject_user_id);

create index if not exists federated_crowdfunding_wallet_intent_idx
  on public.federated_crowdfunding_contributions(wallet_intent_id)
  where wallet_intent_id is not null;

create index if not exists federated_crowdfunding_settlement_contribution_idx
  on public.federated_crowdfunding_settlements(contribution_id);
