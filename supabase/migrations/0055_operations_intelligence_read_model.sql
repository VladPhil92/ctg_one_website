-- CTG One OS — Operations Intelligence read-only snapshot
--
-- Provides a deterministic, aggregate operational read model for authorized
-- finance/audit operators. It contains no participant PII, provider secrets,
-- payout destinations, payment references, mutation capability or AI action
-- execution. Source domain tables and reconciliation functions remain the
-- authoritative facts.

create or replace function public.get_operations_intelligence_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_money_rail jsonb := '{}'::jsonb;
  v_provider jsonb := '{}'::jsonb;
  v_manual_bank jsonb := '{}'::jsonb;
  v_inventory jsonb := '{}'::jsonb;
  v_sales_returns jsonb := '{}'::jsonb;
  v_business jsonb := '{}'::jsonb;
  v_async_work jsonb := '{}'::jsonb;
  v_integrity_issue_count bigint := 0;
begin
  if not public.has_investment_permission('audit.read') then
    raise exception 'audit.read required';
  end if;

  -- Existing reconciliation engines remain authoritative; this function only
  -- composes their aggregate outputs into one immutable response snapshot.
  v_money_rail := public.get_investment_money_rail_health();
  v_provider := public.get_investment_provider_reconciliation_health();

  select jsonb_build_object(
    'pending_bank_verification', count(*) filter (where status = 'PENDING_BANK_VERIFICATION'),
    'allocated_without_human_verification', count(*) filter (where status = 'ALLOCATED' and bank_verified_at is null),
    'allocated_without_receipt', count(*) filter (
      where status = 'ALLOCATED'
        and not exists (
          select 1 from public.investment_payment_receipts r where r.order_id = investment_orders.id
        )
    ),
    'allocated_without_contract_activation', count(*) filter (where status = 'ALLOCATED' and contract_activated_at is null),
    'duplicated_proof_hashes', (
      select count(*)
      from (
        select payment_proof_sha256
        from public.investment_orders
        where payment_proof_sha256 is not null
        group by payment_proof_sha256
        having count(*) > 1
      ) duplicated
    )
  )
  into v_manual_bank
  from public.investment_orders;

  select jsonb_build_object(
    'total_lots', count(*),
    'reconciled_lots', count(*) filter (where is_reconciled),
    'unreconciled_lots', count(*) filter (where not is_reconciled),
    'serialized_units', coalesce(sum(serialized_units), 0),
    'movement_quantity_mismatches', coalesce(sum(movement_quantity_mismatches), 0),
    'bottles_without_history', coalesce(sum(bottles_without_history), 0),
    'canonical_location_gaps', coalesce(sum(canonical_location_gaps), 0),
    'location_mismatches', coalesce(sum(location_mismatches), 0),
    'status_mismatches', coalesce(sum(status_mismatches), 0),
    'sale_link_mismatches', coalesce(sum(sale_link_mismatches), 0)
  )
  into v_inventory
  from public.get_inventory_reconciliation(null);

  select jsonb_build_object(
    'total_sales', count(*),
    'reconciled_sales', count(*) filter (where is_reconciled),
    'unreconciled_sales', count(*) filter (where not is_reconciled),
    'returned_units', coalesce(sum(returned_units), 0),
    'physical_return_mismatches', coalesce(sum(physical_return_mismatches), 0),
    'financial_reversal_mismatches', coalesce(sum(financial_reversal_mismatches), 0),
    'gross_credit_cents', coalesce(sum(gross_credit_cents), 0),
    'tax_credit_cents', coalesce(sum(tax_credit_cents), 0)
  )
  into v_sales_returns
  from public.get_sales_return_reconciliation(null);

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
  ), lot_summary as (
    select
      count(*)::bigint as total_lots,
      count(*) filter (where status not in ('CLOSED','CANCELLED','EXPIRED'))::bigint as active_lots,
      coalesce(sum(total_cases * case_size_units), 0)::bigint as total_capacity_units
    from public.investment_production_lots
  ), bottle_summary as (
    select
      count(*)::bigint as serialized_units,
      count(*) filter (where status = 'SOLD')::bigint as sold_units,
      count(*) filter (where status in ('DAMAGED','LOST','EXPIRED','RECALLED'))::bigint as physical_incidents
    from public.investment_bottle_units
  )
  select jsonb_build_object(
    'total_lots', l.total_lots,
    'active_lots', l.active_lots,
    'total_capacity_units', l.total_capacity_units,
    'serialized_units', b.serialized_units,
    'sold_units', b.sold_units,
    'physical_incidents', b.physical_incidents,
    'sell_through_pct', case when b.serialized_units = 0 then 0 else round((b.sold_units::numeric / b.serialized_units::numeric) * 100, 2) end,
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
  )
  into v_business
  from financial f cross join lot_summary l cross join bottle_summary b;

  select jsonb_build_object(
    'outbox_unpublished', (select count(*) from public.system_domain_event_outbox where published_at is null),
    'outbox_expired_leases', (select count(*) from public.system_domain_event_outbox where published_at is null and lease_expires_at is not null and lease_expires_at <= now()),
    'notification_queued', (select count(*) from public.system_notification_deliveries where status = 'QUEUED'),
    'notification_failed', (select count(*) from public.system_notification_deliveries where status = 'FAILED'),
    'notification_expired_processing', (select count(*) from public.system_notification_deliveries where status = 'PROCESSING' and lease_expires_at is not null and lease_expires_at <= now()),
    'document_queued', (select count(*) from public.system_document_jobs where status = 'QUEUED'),
    'document_failed', (select count(*) from public.system_document_jobs where status = 'FAILED'),
    'document_expired_processing', (select count(*) from public.system_document_jobs where status = 'PROCESSING' and lease_expires_at is not null and lease_expires_at <= now())
  )
  into v_async_work;

  v_integrity_issue_count :=
      coalesce((v_money_rail ->> 'allocated_orders_without_receipt')::bigint, 0)
    + coalesce((v_money_rail ->> 'receipt_funding_ledger_mismatches')::bigint, 0)
    + coalesce((v_money_rail ->> 'paid_withdrawals_without_confirmed_payout')::bigint, 0)
    + coalesce((v_money_rail ->> 'confirmed_payout_ledger_mismatches')::bigint, 0)
    + coalesce((v_provider ->> 'latest_conflict')::bigint, 0)
    + coalesce((v_provider ->> 'reconciled_receipt_mismatches')::bigint, 0)
    + coalesce((v_provider ->> 'confirmed_payout_mismatches')::bigint, 0)
    + coalesce((v_provider ->> 'failed_payout_mismatches')::bigint, 0)
    + coalesce((v_manual_bank ->> 'allocated_without_human_verification')::bigint, 0)
    + coalesce((v_manual_bank ->> 'allocated_without_receipt')::bigint, 0)
    + coalesce((v_manual_bank ->> 'allocated_without_contract_activation')::bigint, 0)
    + coalesce((v_manual_bank ->> 'duplicated_proof_hashes')::bigint, 0)
    + coalesce((v_inventory ->> 'movement_quantity_mismatches')::bigint, 0)
    + coalesce((v_inventory ->> 'bottles_without_history')::bigint, 0)
    + coalesce((v_inventory ->> 'canonical_location_gaps')::bigint, 0)
    + coalesce((v_inventory ->> 'location_mismatches')::bigint, 0)
    + coalesce((v_inventory ->> 'status_mismatches')::bigint, 0)
    + coalesce((v_inventory ->> 'sale_link_mismatches')::bigint, 0)
    + coalesce((v_sales_returns ->> 'physical_return_mismatches')::bigint, 0)
    + coalesce((v_sales_returns ->> 'financial_reversal_mismatches')::bigint, 0);

  return jsonb_build_object(
    'snapshot_version', 'p2.5-v1',
    'generated_at', now(),
    'mode', 'READ_ONLY',
    'business', v_business,
    'integrity', jsonb_build_object(
      'attention_required', v_integrity_issue_count > 0,
      'issue_count', v_integrity_issue_count,
      'money_rail', v_money_rail,
      'provider_reconciliation', v_provider,
      'manual_bank_verification', v_manual_bank,
      'inventory_reconciliation', v_inventory,
      'sales_return_reconciliation', v_sales_returns
    ),
    'async_work', v_async_work,
    'ai_contract', jsonb_build_object(
      'read_only', true,
      'mutations_allowed', false,
      'prohibited_actions', jsonb_build_array(
        'approve_payment',
        'approve_kyc',
        'verify_bank_transfer',
        'finalize_settlement',
        'mutate_inventory',
        'initiate_payout',
        'confirm_payout',
        'approve_withdrawal',
        'change_roles'
      )
    )
  );
end;
$$;

comment on function public.get_operations_intelligence_snapshot() is
  'Read-only aggregate operations snapshot for audit-authorized admins. No PII, secrets, identifiers or mutation capability.';

revoke all on function public.get_operations_intelligence_snapshot() from public, anon;
grant execute on function public.get_operations_intelligence_snapshot() to authenticated;
