-- CTG One — expand first-service analytics to the current product portfolio.
-- Keeps the server-write-only telemetry model from migration 0092 while
-- allowing the dashboard to classify Token and Education activation.

alter table public.product_analytics_events
  drop constraint if exists product_analytics_events_service_key_check;

alter table public.product_analytics_events
  add constraint product_analytics_events_service_key_check check (
    service_key is null
    or service_key in (
      'investment',
      'wallet',
      'identity',
      'knowledge',
      'nvet',
      'token',
      'education_jp',
      'education_learning_center',
      'education_library'
    )
  );

comment on column public.product_analytics_events.service_key is
  'Bounded first-service identifier covering investment, wallet, identity, knowledge, Nvet, Token and Education surfaces.';
