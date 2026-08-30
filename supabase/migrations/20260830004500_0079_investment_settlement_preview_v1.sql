-- CTG Craft Beer Investment — deterministic closed-beta settlement preview v1
--
-- NON-AUTHORITATIVE / NON-MUTATING.
-- This pure function exists to prove the proposed BR-002 arithmetic before any
-- business/legal approval is recorded. It does not read production financial
-- rows, write settlements/ledger entries, transition lots, or move money.
-- Persisted cost/loss classification remains intentionally outside this helper.

create or replace function public._investment_settlement_preview_v1(
  p_lot_available_cents bigint,
  p_participant_profit_share numeric,
  p_allocations jsonb
)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  v_result jsonb;
  v_count integer;
  v_total_units bigint;
  v_external_profit_base bigint;
  v_participant_profit_pool bigint;
begin
  if p_lot_available_cents is null or p_lot_available_cents < 0 then
    raise exception 'lot available cents must be non-negative';
  end if;

  if p_participant_profit_share is null
     or p_participant_profit_share < 0
     or p_participant_profit_share > 1 then
    raise exception 'participant profit share must be between 0 and 1';
  end if;

  if p_allocations is null
     or jsonb_typeof(p_allocations) <> 'array'
     or jsonb_array_length(p_allocations) = 0 then
    raise exception 'allocations must be a non-empty JSON array';
  end if;

  with parsed as (
    select
      x.allocation_id,
      x.participant_user_id,
      x.is_ctg_internal,
      x.case_equivalent_units,
      x.capital_committed_cents
    from jsonb_to_recordset(p_allocations) as x(
      allocation_id uuid,
      participant_user_id uuid,
      is_ctg_internal boolean,
      case_equivalent_units bigint,
      capital_committed_cents bigint
    )
  )
  select count(*)::integer,
         coalesce(sum(case_equivalent_units::numeric), 0)::bigint
    into v_count, v_total_units
  from parsed;

  if v_count <> jsonb_array_length(p_allocations) then
    raise exception 'allocation parsing mismatch';
  end if;

  if v_total_units <= 0 then
    raise exception 'total case-equivalent units must be positive';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_allocations) as x(
      allocation_id uuid,
      participant_user_id uuid,
      is_ctg_internal boolean,
      case_equivalent_units bigint,
      capital_committed_cents bigint
    )
    where allocation_id is null
       or is_ctg_internal is null
       or case_equivalent_units is null
       or case_equivalent_units <= 0
       or capital_committed_cents is null
       or capital_committed_cents < 0
       or (
         is_ctg_internal = false
         and participant_user_id is null
       )
       or (
         is_ctg_internal = true
         and participant_user_id is not null
       )
  ) then
    raise exception 'invalid allocation: recipient classification, units, capital and allocation id must be valid';
  end if;

  if (
    select count(*)
    from (
      select allocation_id
      from jsonb_to_recordset(p_allocations) as x(
        allocation_id uuid,
        participant_user_id uuid,
        is_ctg_internal boolean,
        case_equivalent_units bigint,
        capital_committed_cents bigint
      )
      group by allocation_id
      having count(*) > 1
    ) duplicates
  ) > 0 then
    raise exception 'allocation ids must be unique';
  end if;

  -- Use exact integer quotient/remainder arithmetic. Numeric division is
  -- intentionally avoided here because a large bigint numerator can be rounded
  -- before floor(), which can manufacture or lose a cent.
  with parsed as (
    select
      x.allocation_id,
      x.participant_user_id,
      x.is_ctg_internal,
      x.case_equivalent_units,
      x.capital_committed_cents
    from jsonb_to_recordset(p_allocations) as x(
      allocation_id uuid,
      participant_user_id uuid,
      is_ctg_internal boolean,
      case_equivalent_units bigint,
      capital_committed_cents bigint
    )
  ), available_parts as (
    select
      p.*,
      div(
        p_lot_available_cents::numeric * p.case_equivalent_units::numeric,
        v_total_units::numeric
      )::bigint as available_floor,
      mod(
        p_lot_available_cents::numeric * p.case_equivalent_units::numeric,
        v_total_units::numeric
      ) as available_remainder_numerator
    from parsed p
  ), available_remainder as (
    select
      p_lot_available_cents - coalesce(sum(available_floor), 0) as cents
    from available_parts
  ), ranked_available as (
    select
      b.*,
      row_number() over (
        order by b.available_remainder_numerator desc, b.allocation_id asc
      ) as available_rank
    from available_parts b
  ), waterfall as (
    select
      r.*,
      r.available_floor
        + case
            when r.available_rank <= (select cents from available_remainder)
              then 1
            else 0
          end as available_cents
    from ranked_available r
  ), capital as (
    select
      w.*,
      least(w.capital_committed_cents, w.available_cents)::bigint as capital_recovery_cents,
      (w.capital_committed_cents
        - least(w.capital_committed_cents, w.available_cents))::bigint as unrecovered_capital_cents,
      (w.available_cents
        - least(w.capital_committed_cents, w.available_cents))::bigint as profit_base_cents
    from waterfall w
  )
  select coalesce(sum(profit_base_cents::numeric) filter (where not is_ctg_internal), 0)::bigint
    into v_external_profit_base
  from capital;

  v_participant_profit_pool := floor(
    v_external_profit_base::numeric * p_participant_profit_share + 0.5
  )::bigint;

  with parsed as (
    select
      x.allocation_id,
      x.participant_user_id,
      x.is_ctg_internal,
      x.case_equivalent_units,
      x.capital_committed_cents
    from jsonb_to_recordset(p_allocations) as x(
      allocation_id uuid,
      participant_user_id uuid,
      is_ctg_internal boolean,
      case_equivalent_units bigint,
      capital_committed_cents bigint
    )
  ), available_parts as (
    select
      p.*,
      div(
        p_lot_available_cents::numeric * p.case_equivalent_units::numeric,
        v_total_units::numeric
      )::bigint as available_floor,
      mod(
        p_lot_available_cents::numeric * p.case_equivalent_units::numeric,
        v_total_units::numeric
      ) as available_remainder_numerator
    from parsed p
  ), available_remainder as (
    select
      p_lot_available_cents - coalesce(sum(available_floor), 0) as cents
    from available_parts
  ), ranked_available as (
    select
      b.*,
      row_number() over (
        order by b.available_remainder_numerator desc, b.allocation_id asc
      ) as available_rank
    from available_parts b
  ), waterfall as (
    select
      r.*,
      (
        r.available_floor
        + case
            when r.available_rank <= (select cents from available_remainder)
              then 1
            else 0
          end
      )::bigint as available_cents
    from ranked_available r
  ), capital as (
    select
      w.*,
      least(w.capital_committed_cents, w.available_cents)::bigint as capital_recovery_cents,
      (w.capital_committed_cents
        - least(w.capital_committed_cents, w.available_cents))::bigint as unrecovered_capital_cents,
      (w.available_cents
        - least(w.capital_committed_cents, w.available_cents))::bigint as profit_base_cents
    from waterfall w
  ), profit_exact as (
    select
      c.*,
      case
        when c.is_ctg_internal then 0::numeric
        else c.profit_base_cents::numeric * p_participant_profit_share
      end as exact_participant_profit
    from capital c
  ), profit_base as (
    select
      p.*,
      case
        when p.is_ctg_internal then 0::bigint
        else floor(p.exact_participant_profit)::bigint
      end as participant_profit_floor,
      case
        when p.is_ctg_internal then 0::numeric
        else p.exact_participant_profit - floor(p.exact_participant_profit)
      end as participant_profit_fraction
    from profit_exact p
  ), profit_remainder as (
    select
      v_participant_profit_pool
      - coalesce(sum(participant_profit_floor) filter (where not is_ctg_internal), 0) as cents
    from profit_base
  ), profit_ranked as (
    select
      p.*,
      case
        when p.is_ctg_internal then null
        else row_number() over (
          partition by p.is_ctg_internal
          order by p.participant_profit_fraction desc, p.allocation_id asc
        )
      end as participant_profit_rank
    from profit_base p
  ), final as (
    select
      p.allocation_id,
      p.participant_user_id,
      p.is_ctg_internal,
      p.case_equivalent_units,
      p.capital_committed_cents,
      p.available_cents,
      p.capital_recovery_cents,
      p.unrecovered_capital_cents,
      p.profit_base_cents,
      case
        when p.is_ctg_internal then 0::bigint
        else (
          p.participant_profit_floor
          + case
              when p.participant_profit_rank <= (select cents from profit_remainder)
                then 1
              else 0
            end
        )::bigint
      end as participant_profit_cents
    from profit_ranked p
  ), classified as (
    select
      f.*,
      case
        when f.is_ctg_internal then 0::bigint
        else f.capital_recovery_cents
      end as participant_capital_recovery_cents,
      case
        when f.is_ctg_internal then f.capital_recovery_cents
        else 0::bigint
      end as ctg_capital_recovery_cents,
      (f.profit_base_cents - f.participant_profit_cents)::bigint as ctg_profit_cents,
      case
        when f.is_ctg_internal then 0::bigint
        else (f.capital_recovery_cents + f.participant_profit_cents)::bigint
      end as participant_settlement_cents
    from final f
  ), totals as (
    select
      coalesce(sum(available_cents::numeric), 0)::bigint as available,
      coalesce(sum(participant_capital_recovery_cents::numeric), 0)::bigint as participant_capital,
      coalesce(sum(ctg_capital_recovery_cents::numeric), 0)::bigint as ctg_capital,
      coalesce(sum(participant_profit_cents::numeric), 0)::bigint as participant_profit,
      coalesce(sum(ctg_profit_cents::numeric), 0)::bigint as ctg_profit,
      coalesce(sum(participant_settlement_cents::numeric), 0)::bigint as participant_settlement
    from classified
  )
  select jsonb_build_object(
    'version', 'closed-beta-preview-v1',
    'nonAuthoritative', true,
    'lotAvailableCents', p_lot_available_cents,
    'participantProfitShare', p_participant_profit_share,
    'participantProfitPoolCents', v_participant_profit_pool,
    'totals', jsonb_build_object(
      'availableCents', t.available,
      'participantCapitalRecoveryCents', t.participant_capital,
      'ctgCapitalRecoveryCents', t.ctg_capital,
      'participantProfitCents', t.participant_profit,
      'ctgProfitCents', t.ctg_profit,
      'participantSettlementCents', t.participant_settlement,
      'economicConservationCents',
        t.participant_capital + t.ctg_capital + t.participant_profit + t.ctg_profit
    ),
    'allocations', (
      select jsonb_agg(
        jsonb_build_object(
          'allocationId', c.allocation_id,
          'participantUserId', c.participant_user_id,
          'isCtgInternal', c.is_ctg_internal,
          'caseEquivalentUnits', c.case_equivalent_units,
          'capitalCommittedCents', c.capital_committed_cents,
          'availableCents', c.available_cents,
          'capitalRecoveryCents', c.capital_recovery_cents,
          'unrecoveredCapitalCents', c.unrecovered_capital_cents,
          'profitBaseCents', c.profit_base_cents,
          'participantProfitCents', c.participant_profit_cents,
          'ctgProfitCents', c.ctg_profit_cents,
          'participantSettlementCents', c.participant_settlement_cents
        ) order by c.allocation_id
      )
      from classified c
    )
  ) into v_result
  from totals t;

  if (v_result #>> '{totals,availableCents}')::bigint <> p_lot_available_cents then
    raise exception 'settlement preview violated available-cent conservation';
  end if;

  if (v_result #>> '{totals,participantProfitCents}')::bigint
       <> v_participant_profit_pool then
    raise exception 'settlement preview violated participant-profit-pool conservation';
  end if;

  if (v_result #>> '{totals,economicConservationCents}')::bigint
       <> p_lot_available_cents then
    raise exception 'settlement preview violated economic conservation';
  end if;

  return v_result;
end;
$$;

comment on function public._investment_settlement_preview_v1(bigint,numeric,jsonb) is
  'Pure, non-authoritative closed-beta settlement arithmetic preview. Does not read/write transactional state or authorize real-money settlement.';

revoke all on function public._investment_settlement_preview_v1(bigint,numeric,jsonb)
  from public, anon, authenticated;
