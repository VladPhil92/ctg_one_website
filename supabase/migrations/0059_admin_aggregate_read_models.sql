-- CTG One OS — bounded aggregate read models for administrative dashboards.
--
-- Purpose: keep dashboard aggregation inside PostgreSQL instead of transferring
-- complete operational collections to Next.js. These functions are read-only,
-- authorized independently, and return aggregate/non-PII payloads only.

create or replace function public.get_admin_command_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_snapshot jsonb;
begin
  if not public.is_admin() then
    raise exception 'admin required';
  end if;

  select jsonb_build_object(
    'generated_at', now(),
    'total_users', (select count(*) from public.profiles),
    'pending_kyc', (
      select count(*) from public.kyc_submissions where status = 'pending'
    ),
    'pending_deposits', (
      select count(*) from public.transactions where status = 'pending' and type = 'deposit'
    ),
    'operational_wallet_balance_cents', (
      select coalesce(sum(balance_cents), 0)::bigint from public.wallets
    ),
    'total_lots', (select count(*) from public.investment_production_lots),
    -- Human Finance action is required only after a participant has supplied
    -- payment evidence. AWAITING_PAYMENT remains participant-owned work.
    'pending_investment_orders', (
      select count(*)
      from public.investment_orders
      where status = 'PENDING_BANK_VERIFICATION'
    ),
    'funding_open_lots', (
      select count(*)
      from public.investment_production_lots
      where status = 'FUNDING_OPEN'
    )
  )
  into v_snapshot;

  return v_snapshot;
end;
$$;

comment on function public.get_admin_command_snapshot() is
  'Aggregate global Admin OS command snapshot. No row collections, participant PII, payment references or mutation capability.';

revoke all on function public.get_admin_command_snapshot() from public, anon;
grant execute on function public.get_admin_command_snapshot() to authenticated;


create or replace function public.get_operations_dashboard_snapshot(p_lot_limit integer default 12)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_snapshot jsonb;
begin
  if not public.has_investment_permission('ops.read') then
    raise exception 'ops.read required';
  end if;

  if p_lot_limit is null or p_lot_limit < 1 or p_lot_limit > 50 then
    raise exception 'lot performance limit must be between 1 and 50';
  end if;

  with financial as (
    select
      coalesce(sum(amount_cents) filter (where entry_type = 'REVENUE'), 0)::bigint as revenue,
      coalesce(sum(amount_cents) filter (where entry_type = 'REVENUE_REVERSAL'), 0)::bigint as revenue_reversal,
      coalesce(sum(amount_cents) filter (where entry_type = 'TAX'), 0)::bigint as tax,
      coalesce(sum(amount_cents) filter (where entry_type = 'TAX_REVERSAL'), 0)::bigint as tax_reversal,
      coalesce(sum(amount_cents) filter (where entry_type = 'PRODUCTION_COST'), 0)::bigint as production_cost,
      coalesce(sum(amount_cents) filter (where entry_type = 'COMMERCIAL_COST'), 0)::bigint as commercial_cost,
      coalesce(sum(amount_cents) filter (where entry_type = 'ADJUSTMENT'), 0)::bigint as adjustment
    from public.investment_lot_financial_entries
  ),
  lot_summary as (
    select
      count(*)::bigint as total_lots,
      count(*) filter (where status not in ('CLOSED','CANCELLED','EXPIRED'))::bigint as active_lots,
      coalesce(sum(total_cases * case_size_units), 0)::bigint as total_capacity_units
    from public.investment_production_lots
  ),
  bottle_summary as (
    select
      count(*)::bigint as serialized_units,
      count(*) filter (where status = 'SOLD')::bigint as sold_units,
      count(*) filter (where status in ('DAMAGED','LOST','EXPIRED','RECALLED'))::bigint as physical_incidents
    from public.investment_bottle_units
  ),
  recent_lots as (
    select id, code, beer_style, status, created_at
    from public.investment_production_lots
    order by created_at desc, id desc
    limit p_lot_limit
  ),
  recent_bottles as (
    select
      b.lot_id,
      count(*)::bigint as serialized_units,
      count(*) filter (where b.status = 'SOLD')::bigint as sold_units
    from public.investment_bottle_units b
    join recent_lots l on l.id = b.lot_id
    group by b.lot_id
  ),
  recent_financial as (
    select
      f.lot_id,
      (
        coalesce(sum(f.amount_cents) filter (where f.entry_type = 'REVENUE'), 0)
        - coalesce(sum(f.amount_cents) filter (where f.entry_type = 'REVENUE_REVERSAL'), 0)
      )::bigint as net_revenue_cents
    from public.investment_lot_financial_entries f
    join recent_lots l on l.id = f.lot_id
    group by f.lot_id
  ),
  performance as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', l.id,
          'code', l.code,
          'beer_style', l.beer_style,
          'status', l.status,
          'serialized_units', coalesce(b.serialized_units, 0),
          'sold_units', coalesce(b.sold_units, 0),
          'net_revenue_cents', coalesce(f.net_revenue_cents, 0)
        )
        order by l.created_at desc, l.id desc
      ),
      '[]'::jsonb
    ) as rows
    from recent_lots l
    left join recent_bottles b on b.lot_id = l.id
    left join recent_financial f on f.lot_id = l.id
  )
  select jsonb_build_object(
    'generated_at', now(),
    'business', jsonb_build_object(
      'total_lots', l.total_lots,
      'active_lots', l.active_lots,
      'total_capacity_units', l.total_capacity_units,
      'serialized_units', b.serialized_units,
      'sold_units', b.sold_units,
      'physical_incidents', b.physical_incidents,
      'sell_through_pct', case
        when b.serialized_units = 0 then 0
        else round((b.sold_units::numeric / b.serialized_units::numeric) * 100, 2)
      end,
      'net_revenue_cents', f.revenue - f.revenue_reversal,
      'net_tax_cents', f.tax - f.tax_reversal,
      'production_cost_cents', f.production_cost,
      'commercial_cost_cents', f.commercial_cost,
      'adjustment_cents', f.adjustment,
      'recorded_result_cents',
        (f.revenue - f.revenue_reversal)
        - (f.tax - f.tax_reversal)
        - f.production_cost
        - f.commercial_cost
        - f.adjustment
    ),
    'lot_performance', p.rows
  )
  into v_snapshot
  from financial f
  cross join lot_summary l
  cross join bottle_summary b
  cross join performance p;

  return v_snapshot;
end;
$$;

comment on function public.get_operations_dashboard_snapshot(integer) is
  'Bounded aggregate Production Command View snapshot for ops.read actors. Returns totals plus at most 50 recent lot summaries; no unit-level collection is exposed.';

revoke all on function public.get_operations_dashboard_snapshot(integer) from public, anon;
grant execute on function public.get_operations_dashboard_snapshot(integer) to authenticated;
