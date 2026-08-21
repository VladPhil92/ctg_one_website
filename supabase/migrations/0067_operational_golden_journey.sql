-- CTG Craft Beer Investment — Operational Golden Journey read model.
-- Read-only, bounded, admin/operator-facing projection of one lot's full lifecycle.

create or replace function public.get_investment_operational_journey(p_lot_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_selected uuid;
  v_options jsonb;
  v_lot jsonb;
  v_funding jsonb;
  v_production jsonb;
  v_inventory jsonb;
  v_sales jsonb;
  v_finance jsonb;
  v_settlement jsonb;
  v_liquidity jsonb;
  v_serialized bigint := 0;
  v_terminal bigint := 0;
  v_allocation_capital bigint := 0;
  v_receipt_cents bigint := 0;
  v_inventory_reconciled boolean := false;
  v_return_mismatches bigint := 0;
  v_settlement_id uuid;
  v_next_action text;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not public.has_investment_permission('ops.read') then raise exception 'ops.read required'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id,
    'code', code,
    'beerStyle', beer_style,
    'status', status,
    'createdAt', created_at
  ) order by created_at desc, id), '[]'::jsonb)
  into v_options
  from (
    select id, code, beer_style, status, created_at
    from public.investment_production_lots
    order by created_at desc, id
    limit 60
  ) lots;

  if p_lot_id is not null then
    select id into v_selected from public.investment_production_lots where id = p_lot_id;
    if v_selected is null then raise exception 'lot not found'; end if;
  else
    select id into v_selected
    from public.investment_production_lots
    order by created_at desc, id
    limit 1;
  end if;

  if v_selected is null then
    return jsonb_build_object(
      'lotOptions', v_options,
      'selectedLot', null,
      'nextAction', 'CREATE_LOT',
      'generatedAt', now()
    );
  end if;

  select jsonb_build_object(
    'id', l.id,
    'code', l.code,
    'beerStyle', l.beer_style,
    'destination', l.destination,
    'status', l.status,
    'caseSizeUnits', l.case_size_units,
    'totalCases', l.total_cases,
    'totalEligibleCases', l.total_eligible_units,
    'createdAt', l.created_at
  ) into v_lot
  from public.investment_production_lots l
  where l.id = v_selected;

  select
    coalesce(sum(a.capital_committed_cents), 0)::bigint,
    jsonb_build_object(
      'allocationCount', count(a.id),
      'allocatedCases', coalesce(sum(a.case_equivalent_units), 0),
      'allocatedCapitalCents', coalesce(sum(a.capital_committed_cents), 0),
      'externalParticipantCount', count(distinct a.participant_user_id) filter (where a.participant_user_id is not null),
      'orderCount', (select count(*) from public.investment_orders o where o.lot_id = v_selected),
      'allocatedOrderCount', (select count(*) from public.investment_orders o where o.lot_id = v_selected and o.status = 'ALLOCATED'),
      'receiptCount', (select count(*) from public.investment_payment_receipts r join public.investment_orders o on o.id = r.order_id where o.lot_id = v_selected),
      'receiptCents', coalesce((select sum(r.amount_cents) from public.investment_payment_receipts r join public.investment_orders o on o.id = r.order_id where o.lot_id = v_selected), 0)
    )
  into v_allocation_capital, v_funding
  from public.investment_funding_allocations a
  where a.lot_id = v_selected;

  select coalesce(sum(r.amount_cents), 0)::bigint
  into v_receipt_cents
  from public.investment_payment_receipts r
  join public.investment_orders o on o.id = r.order_id
  where o.lot_id = v_selected;

  select count(*)::bigint,
         count(*) filter (where status in ('SOLD','RETURNED','DAMAGED','EXPIRED','LOST','RECALLED'))::bigint
  into v_serialized, v_terminal
  from public.investment_bottle_units
  where lot_id = v_selected;

  select jsonb_build_object(
    'eventCount', (select count(*) from public.investment_production_events e where e.lot_id = v_selected),
    'serializedUnits', v_serialized,
    'terminalPhysicalUnits', v_terminal,
    'statusCounts', coalesce((
      select jsonb_object_agg(status, quantity)
      from (
        select status, count(*)::bigint as quantity
        from public.investment_bottle_units
        where lot_id = v_selected
        group by status
      ) s
    ), '{}'::jsonb)
  ) into v_production;

  select coalesce(bool_and(r.is_reconciled), false)
  into v_inventory_reconciled
  from public.get_inventory_reconciliation(v_selected) r;

  select jsonb_build_object(
    'isReconciled', v_inventory_reconciled,
    'canonicalLocationGaps', coalesce(sum(r.canonical_location_gaps), 0),
    'locationMismatches', coalesce(sum(r.location_mismatches), 0),
    'statusMismatches', coalesce(sum(r.status_mismatches), 0),
    'saleLinkMismatches', coalesce(sum(r.sale_link_mismatches), 0)
  ) into v_inventory
  from public.get_inventory_reconciliation(v_selected) r;

  select count(*)::bigint into v_return_mismatches
  from public.investment_sales_credit_notes cn
  join public.investment_sales_credit_note_items cni on cni.credit_note_id = cn.id
  where cn.lot_id = v_selected
    and not exists (
      select 1
      from public.investment_inventory_movements m
      join public.investment_inventory_movement_units mu on mu.movement_id = m.id
      where m.lot_id = v_selected
        and m.movement_type = 'SALE_RETURNED'
        and m.source_credit_note_id = cn.id
        and mu.bottle_unit_id = cni.bottle_unit_id
    );

  select jsonb_build_object(
    'saleCount', (select count(*) from public.investment_sales s where s.lot_id = v_selected),
    'documentedSoldUnits', (
      select count(*)
      from public.investment_sale_items si
      join public.investment_sales s on s.id = si.sale_id
      where s.lot_id = v_selected
    ),
    'grossRevenueCents', coalesce((select sum(s.gross_revenue_cents) from public.investment_sales s where s.lot_id = v_selected), 0),
    'taxRecognizedCents', coalesce((select sum(s.tax_recognized_cents) from public.investment_sales s where s.lot_id = v_selected), 0),
    'creditNoteCount', (select count(*) from public.investment_sales_credit_notes cn where cn.lot_id = v_selected),
    'returnedUnits', (select count(*) from public.investment_sales_credit_note_items cni where cni.lot_id = v_selected),
    'grossCreditCents', coalesce((select sum(cn.gross_credit_cents) from public.investment_sales_credit_notes cn where cn.lot_id = v_selected), 0),
    'taxCreditCents', coalesce((select sum(cn.tax_credit_cents) from public.investment_sales_credit_notes cn where cn.lot_id = v_selected), 0),
    'returnGenealogyMismatches', v_return_mismatches
  ) into v_sales;

  select jsonb_build_object(
    'netRevenueCents', coalesce(sum(amount_cents) filter (where entry_type = 'REVENUE'), 0) - coalesce(sum(amount_cents) filter (where entry_type = 'REVENUE_REVERSAL'), 0),
    'netTaxCents', coalesce(sum(amount_cents) filter (where entry_type = 'TAX'), 0) - coalesce(sum(amount_cents) filter (where entry_type = 'TAX_REVERSAL'), 0),
    'productionCostCents', coalesce(sum(amount_cents) filter (where entry_type = 'PRODUCTION_COST'), 0),
    'commercialCostCents', coalesce(sum(amount_cents) filter (where entry_type = 'COMMERCIAL_COST'), 0),
    'adjustmentCents', coalesce(sum(amount_cents) filter (where entry_type = 'ADJUSTMENT'), 0)
  ) into v_finance
  from public.investment_lot_financial_entries
  where lot_id = v_selected;

  select s.id into v_settlement_id
  from public.investment_settlements s
  where s.lot_id = v_selected;

  if v_settlement_id is null then
    v_settlement := jsonb_build_object(
      'finalized', false,
      'settlementId', null,
      'netDistributableProfitCents', null,
      'participantCreditCount', 0,
      'participantCreditCents', 0
    );
    v_liquidity := jsonb_build_object(
      'sourceLinkedReinvestmentCount', 0,
      'sourceLinkedReinvestmentCents', 0,
      'creditedParticipantWithdrawalCountAfterSettlement', 0,
      'creditedParticipantWithdrawalCentsAfterSettlement', 0,
      'note', 'Withdrawals are participant-balance operations and are not source-settlement attributed.'
    );
  else
    select jsonb_build_object(
      'finalized', true,
      'settlementId', s.id,
      'finalizedAt', s.finalized_at,
      'netDistributableProfitCents', s.net_distributable_profit_cents,
      'participantCreditCount', (select count(*) from public.investment_ledger_entries le where le.lot_id = v_selected and le.entry_type = 'SETTLEMENT_CREDIT'),
      'participantCreditCents', coalesce((select sum(le.amount_cents) from public.investment_ledger_entries le where le.lot_id = v_selected and le.entry_type = 'SETTLEMENT_CREDIT'), 0)
    ) into v_settlement
    from public.investment_settlements s
    where s.id = v_settlement_id;

    select jsonb_build_object(
      'sourceLinkedReinvestmentCount', (select count(*) from public.investment_reinvestment_requests rr where rr.source_settlement_id = v_settlement_id),
      'sourceLinkedReinvestmentCents', coalesce((select sum(rr.amount_cents) from public.investment_reinvestment_requests rr where rr.source_settlement_id = v_settlement_id), 0),
      'sourceLinkedApprovedReinvestmentCents', coalesce((select sum(rr.amount_cents) from public.investment_reinvestment_requests rr where rr.source_settlement_id = v_settlement_id and rr.status = 'APPROVED'), 0),
      'creditedParticipantWithdrawalCountAfterSettlement', (
        select count(*)
        from public.investment_withdrawal_requests wr
        where wr.created_at >= (select finalized_at from public.investment_settlements where id = v_settlement_id)
          and exists (
            select 1 from public.investment_ledger_entries le
            where le.lot_id = v_selected
              and le.entry_type = 'SETTLEMENT_CREDIT'
              and le.participant_user_id = wr.participant_user_id
          )
      ),
      'creditedParticipantWithdrawalCentsAfterSettlement', coalesce((
        select sum(wr.amount_cents)
        from public.investment_withdrawal_requests wr
        where wr.created_at >= (select finalized_at from public.investment_settlements where id = v_settlement_id)
          and exists (
            select 1 from public.investment_ledger_entries le
            where le.lot_id = v_selected
              and le.entry_type = 'SETTLEMENT_CREDIT'
              and le.participant_user_id = wr.participant_user_id
          )
      ), 0),
      'note', 'Reinvestments preserve source-settlement genealogy. Withdrawals are reported only as later activity by participants credited from this lot and are not source-attributed.'
    ) into v_liquidity;
  end if;

  v_next_action := case
    when v_allocation_capital = 0 then 'FUNDING'
    when v_receipt_cents <> v_allocation_capital then 'PAYMENT_RECONCILIATION'
    when v_serialized = 0 then 'PRODUCTION_SERIALIZATION'
    when not v_inventory_reconciled then 'INVENTORY_RECONCILIATION'
    when v_terminal < v_serialized then 'SALES_OR_PHYSICAL_CLOSE'
    when v_return_mismatches > 0 then 'RETURN_RECONCILIATION'
    when v_settlement_id is null then 'SETTLEMENT'
    else 'CLOSED_LOOP'
  end;

  return jsonb_build_object(
    'lotOptions', v_options,
    'selectedLot', v_lot,
    'funding', v_funding,
    'production', v_production,
    'inventory', v_inventory,
    'sales', v_sales,
    'finance', v_finance,
    'settlement', v_settlement,
    'liquidity', v_liquidity,
    'milestones', jsonb_build_array(
      jsonb_build_object('key','FUNDING','complete',v_allocation_capital > 0),
      jsonb_build_object('key','PAYMENT_RECONCILIATION','complete',v_allocation_capital > 0 and v_receipt_cents = v_allocation_capital),
      jsonb_build_object('key','PRODUCTION_SERIALIZATION','complete',v_serialized > 0),
      jsonb_build_object('key','INVENTORY_RECONCILIATION','complete',v_inventory_reconciled),
      jsonb_build_object('key','COMMERCIAL_CLOSE','complete',v_serialized > 0 and v_terminal = v_serialized),
      jsonb_build_object('key','RETURN_RECONCILIATION','complete',v_return_mismatches = 0),
      jsonb_build_object('key','SETTLEMENT','complete',v_settlement_id is not null)
    ),
    'nextAction', v_next_action,
    'generatedAt', now()
  );
end;
$$;

comment on function public.get_investment_operational_journey(uuid) is
  'Read-only operator snapshot for one investment lot across funding, production, inventory, sales/returns, settlement and post-settlement liquidity evidence.';

revoke all on function public.get_investment_operational_journey(uuid) from public;
revoke execute on function public.get_investment_operational_journey(uuid) from anon;
grant execute on function public.get_investment_operational_journey(uuid) to authenticated;
