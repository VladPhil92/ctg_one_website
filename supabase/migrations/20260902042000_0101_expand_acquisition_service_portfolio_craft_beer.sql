-- CTG One — keep acquisition analytics aligned with the authenticated
-- dashboard catalog after surfacing CTG Craft Beer as a first-class product.

alter table public.product_analytics_events
  drop constraint if exists product_analytics_events_service_key_check;

alter table public.product_analytics_events
  add constraint product_analytics_events_service_key_check check (
    service_key is null
    or service_key in (
      'investment',
      'craft_beer',
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
  'Bounded first-service identifier covering investment, Craft Beer, wallet, identity, knowledge, Nvet, Token and Education surfaces.';
