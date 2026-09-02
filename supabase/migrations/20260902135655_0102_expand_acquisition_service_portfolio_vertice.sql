-- CTG One — keep the first-service analytics constraint aligned with the
-- authenticated dashboard portfolio after adding VÉRTICE OS.
--
-- Telemetry remains server-write-only; this migration only expands the
-- bounded service key allowlist used by product_analytics_events.

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
      'vertice',
      'education_jp',
      'education_learning_center',
      'education_library'
    )
  );

comment on column public.product_analytics_events.service_key is
  'Bounded first-service identifier covering investment, wallet, identity, knowledge, Nvet, Token, VÉRTICE and Education surfaces.';
