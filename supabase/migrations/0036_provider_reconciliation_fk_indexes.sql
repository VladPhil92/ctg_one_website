-- CTG Craft Beer Investment OS — Provider Reconciliation FK indexes
-- Cover the three actor/receipt foreign keys reported by Supabase Performance Advisor.

create index investment_financial_provider_events_ingested_by_idx
  on public.investment_financial_provider_events(ingested_by);

create index investment_financial_event_matches_actor_id_idx
  on public.investment_financial_event_matches(actor_id);

create index investment_financial_event_matches_receipt_id_idx
  on public.investment_financial_event_matches(receipt_id);
