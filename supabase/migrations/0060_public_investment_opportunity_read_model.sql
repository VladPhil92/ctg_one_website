-- CTG Craft Beer Investment — public opportunity publication boundary.
--
-- Correctness/security goals:
--   1. DRAFT production lots are internal working data and must not be readable
--      by anonymous/ordinary participant Data API clients.
--   2. Public funding progress must be computed from all authoritative
--      allocations without exposing participant identities or allocation rows.
--   3. The public read model is aggregate-only and bounded to published lots.

-- Replace the historical unconditional SELECT policy. Published/non-draft lots
-- remain readable by visitors and participants; ops.read actors retain full
-- visibility, including DRAFT, through a separate authenticated policy.
drop policy if exists investment_production_lots_select on public.investment_production_lots;
drop policy if exists investment_production_lots_public_select on public.investment_production_lots;
drop policy if exists investment_production_lots_ops_select on public.investment_production_lots;

create policy investment_production_lots_public_select
on public.investment_production_lots
for select
to anon, authenticated
using (status <> 'DRAFT');

create policy investment_production_lots_ops_select
on public.investment_production_lots
for select
to authenticated
using ((select public.has_investment_permission('ops.read')));


create or replace function public.get_public_investment_lot_funding(p_lot_id uuid default null)
returns table(
  lot_id uuid,
  total_cases integer,
  allocated_cases integer,
  funded_percent integer,
  available_cases_equivalent integer
)
language sql
stable
security definer
set search_path = public
as $$
  with allocation_totals as (
    select
      a.lot_id,
      coalesce(sum(a.case_equivalent_units), 0)::integer as allocated_cases_raw
    from public.investment_funding_allocations a
    group by a.lot_id
  ),
  published as (
    select
      l.id,
      l.total_eligible_units::integer as total_cases,
      least(
        greatest(coalesce(a.allocated_cases_raw, 0), 0),
        greatest(l.total_eligible_units, 0)
      )::integer as allocated_cases
    from public.investment_production_lots l
    left join allocation_totals a on a.lot_id = l.id
    where l.status <> 'DRAFT'
      and (p_lot_id is null or l.id = p_lot_id)
  )
  select
    p.id as lot_id,
    p.total_cases,
    p.allocated_cases,
    case
      when p.total_cases <= 0 then 0
      else round((p.allocated_cases::numeric / p.total_cases::numeric) * 100)::integer
    end as funded_percent,
    greatest(p.total_cases - p.allocated_cases, 0)::integer as available_cases_equivalent
  from published p
  order by p.id;
$$;

comment on function public.get_public_investment_lot_funding(uuid) is
  'Aggregate public funding progress for published investment lots. Exposes no participant, payment, allocation-row, KYC or bank identifiers.';

revoke all on function public.get_public_investment_lot_funding(uuid) from public;
grant execute on function public.get_public_investment_lot_funding(uuid) to anon, authenticated;
