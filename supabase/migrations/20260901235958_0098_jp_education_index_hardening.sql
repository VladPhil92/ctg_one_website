-- JP Valderrama Education Index Hardening V1
--
-- Adds covering indexes for education foreign keys surfaced by the production
-- performance advisor. This is intentionally additive and does not change RLS,
-- authorization, checkout or settlement semantics.

create index if not exists education_payment_settlements_user_idx
  on public.education_payment_settlements(user_id);

create index if not exists education_payment_settlements_operator_user_idx
  on public.education_payment_settlements(operator_user_id);

create index if not exists education_order_items_offering_idx
  on public.education_order_items(offering_id);

create index if not exists education_entitlements_offering_idx
  on public.education_entitlements(offering_id);

comment on index public.education_payment_settlements_user_idx is
  'Covering index for education settlement user foreign-key lookups and deletes.';
comment on index public.education_payment_settlements_operator_user_idx is
  'Covering index for education settlement operator foreign-key lookups and deletes.';
comment on index public.education_order_items_offering_idx is
  'Covering index for education order-item offering foreign-key lookups and deletes.';
comment on index public.education_entitlements_offering_idx is
  'Covering index for education entitlement offering foreign-key lookups and deletes.';