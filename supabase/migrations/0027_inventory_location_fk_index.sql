-- CTG Craft Beer Investment OS — Inventory location FK performance hardening
-- Covers the only new unindexed foreign key reported after the 0025/0026 cutover.

create index if not exists investment_inventory_locations_created_by_idx
  on public.investment_inventory_locations(created_by)
  where created_by is not null;
