\set ON_ERROR_STOP on

-- Pure arithmetic contract for the NON-AUTHORITATIVE settlement preview.
-- No production rows, ledger entries, settlements or lot state are mutated.
do $$
declare
  v jsonb;
  a jsonb;
begin
  -- Full capital recovery, no profit.
  a := jsonb_build_array(
    jsonb_build_object(
      'allocation_id','00000000-0000-0000-0000-000000000001',
      'participant_user_id','10000000-0000-0000-0000-000000000001',
      'is_ctg_internal',false,
      'case_equivalent_units',1,
      'capital_committed_cents',100
    )
  );
  v := public._investment_settlement_preview_v1(100, 0.50, a);
  if (v #>> '{allocations,0,capitalRecoveryCents}')::bigint <> 100
     or (v #>> '{allocations,0,participantProfitCents}')::bigint <> 0
     or (v #>> '{allocations,0,participantSettlementCents}')::bigint <> 100 then
    raise exception 'full-capital recovery contract failed: %', v;
  end if;

  -- Partial recovery: no guaranteed capital and no negative wallet.
  v := public._investment_settlement_preview_v1(40, 0.50, a);
  if (v #>> '{allocations,0,capitalRecoveryCents}')::bigint <> 40
     or (v #>> '{allocations,0,unrecoveredCapitalCents}')::bigint <> 60
     or (v #>> '{allocations,0,participantProfitCents}')::bigint <> 0
     or (v #>> '{allocations,0,participantSettlementCents}')::bigint <> 40 then
    raise exception 'partial-capital recovery contract failed: %', v;
  end if;

  -- Zero recovery: an underwater lot cannot manufacture a distributable cent.
  -- This is the reconciled outcome for examples such as R=3,D=4.
  v := public._investment_settlement_preview_v1(0, 0.50, a);
  if (v #>> '{totals,availableCents}')::bigint <> 0
     or (v #>> '{totals,economicConservationCents}')::bigint <> 0
     or (v #>> '{allocations,0,participantSettlementCents}')::bigint <> 0 then
    raise exception 'zero/underwater conservation contract failed: %', v;
  end if;

  -- Positive profit with explicit half-up rounding: 1 cent × 50% => 1 cent.
  a := jsonb_build_array(
    jsonb_build_object(
      'allocation_id','00000000-0000-0000-0000-000000000001',
      'participant_user_id','10000000-0000-0000-0000-000000000001',
      'is_ctg_internal',false,
      'case_equivalent_units',1,
      'capital_committed_cents',0
    )
  );
  v := public._investment_settlement_preview_v1(1, 0.50, a);
  if (v ->> 'participantProfitPoolCents')::bigint <> 1
     or (v #>> '{allocations,0,participantProfitCents}')::bigint <> 1
     or (v #>> '{allocations,0,ctgProfitCents}')::bigint <> 0 then
    raise exception 'half-up rounding contract failed: %', v;
  end if;

  -- Largest-remainder tie is deterministic by allocation UUID ascending.
  a := jsonb_build_array(
    jsonb_build_object(
      'allocation_id','00000000-0000-0000-0000-000000000002',
      'participant_user_id','10000000-0000-0000-0000-000000000002',
      'is_ctg_internal',false,
      'case_equivalent_units',1,
      'capital_committed_cents',0
    ),
    jsonb_build_object(
      'allocation_id','00000000-0000-0000-0000-000000000001',
      'participant_user_id','10000000-0000-0000-0000-000000000001',
      'is_ctg_internal',false,
      'case_equivalent_units',1,
      'capital_committed_cents',0
    )
  );
  v := public._investment_settlement_preview_v1(1, 1.00, a);
  if (v #>> '{allocations,0,allocationId}') <> '00000000-0000-0000-0000-000000000001'
     or (v #>> '{allocations,0,availableCents}')::bigint <> 1
     or (v #>> '{allocations,1,availableCents}')::bigint <> 0 then
    raise exception 'available-cent largest-remainder tie contract failed: %', v;
  end if;

  -- Participant profit pool is reconciled at lot level, not rounded per row.
  -- Two external one-cent profit bases at 50% produce a one-cent pool, not 2.
  v := public._investment_settlement_preview_v1(2, 0.50, a);
  if (v ->> 'participantProfitPoolCents')::bigint <> 1
     or (v #>> '{totals,participantProfitCents}')::bigint <> 1
     or (v #>> '{totals,ctgProfitCents}')::bigint <> 1 then
    raise exception 'lot-level participant-profit reconciliation failed: %', v;
  end if;

  -- CTG-internal allocations participate in lot economics but never create a
  -- participant credit or consume participant-profit remainder cents.
  a := jsonb_build_array(
    jsonb_build_object(
      'allocation_id','00000000-0000-0000-0000-000000000001',
      'participant_user_id','10000000-0000-0000-0000-000000000001',
      'is_ctg_internal',false,
      'case_equivalent_units',1,
      'capital_committed_cents',0
    ),
    jsonb_build_object(
      'allocation_id','00000000-0000-0000-0000-000000000002',
      'participant_user_id',null,
      'is_ctg_internal',true,
      'case_equivalent_units',1,
      'capital_committed_cents',0
    )
  );
  v := public._investment_settlement_preview_v1(2, 0.50, a);
  if (v ->> 'participantProfitPoolCents')::bigint <> 1
     or (v #>> '{allocations,0,participantProfitCents}')::bigint <> 1
     or (v #>> '{allocations,1,participantProfitCents}')::bigint <> 0
     or (v #>> '{allocations,1,participantSettlementCents}')::bigint <> 0
     or (v #>> '{allocations,1,ctgProfitCents}')::bigint <> 1 then
    raise exception 'CTG-internal recipient isolation failed: %', v;
  end if;

  -- Weighted allocation and exact total conservation.
  a := jsonb_build_array(
    jsonb_build_object(
      'allocation_id','00000000-0000-0000-0000-000000000001',
      'participant_user_id','10000000-0000-0000-0000-000000000001',
      'is_ctg_internal',false,
      'case_equivalent_units',1,
      'capital_committed_cents',1
    ),
    jsonb_build_object(
      'allocation_id','00000000-0000-0000-0000-000000000002',
      'participant_user_id','10000000-0000-0000-0000-000000000002',
      'is_ctg_internal',false,
      'case_equivalent_units',3,
      'capital_committed_cents',1
    ),
    jsonb_build_object(
      'allocation_id','00000000-0000-0000-0000-000000000003',
      'participant_user_id','10000000-0000-0000-0000-000000000003',
      'is_ctg_internal',false,
      'case_equivalent_units',3,
      'capital_committed_cents',1
    )
  );
  v := public._investment_settlement_preview_v1(11, 0.50, a);
  if (v #>> '{totals,availableCents}')::bigint <> 11
     or (v #>> '{totals,economicConservationCents}')::bigint <> 11
     or (v #>> '{totals,participantProfitCents}')::bigint
        <> (v ->> 'participantProfitPoolCents')::bigint then
    raise exception 'weighted conservation contract failed: %', v;
  end if;

  -- Bigint-scale allocation must use exact integer quotient/remainder math.
  -- Decimal division can round 8999999999999999999 / 3 upward before floor.
  a := jsonb_build_array(
    jsonb_build_object(
      'allocation_id','00000000-0000-0000-0000-000000000001',
      'participant_user_id','10000000-0000-0000-0000-000000000001',
      'is_ctg_internal',false,
      'case_equivalent_units',1,
      'capital_committed_cents',0
    ),
    jsonb_build_object(
      'allocation_id','00000000-0000-0000-0000-000000000002',
      'participant_user_id','10000000-0000-0000-0000-000000000002',
      'is_ctg_internal',false,
      'case_equivalent_units',1,
      'capital_committed_cents',0
    ),
    jsonb_build_object(
      'allocation_id','00000000-0000-0000-0000-000000000003',
      'participant_user_id','10000000-0000-0000-0000-000000000003',
      'is_ctg_internal',false,
      'case_equivalent_units',1,
      'capital_committed_cents',0
    )
  );
  v := public._investment_settlement_preview_v1(8999999999999999999, 0, a);
  if (v #>> '{totals,availableCents}')::bigint <> 8999999999999999999
     or (v #>> '{totals,economicConservationCents}')::bigint <> 8999999999999999999
     or (v #>> '{allocations,0,availableCents}')::bigint <> 3000000000000000000
     or (v #>> '{allocations,1,availableCents}')::bigint <> 3000000000000000000
     or (v #>> '{allocations,2,availableCents}')::bigint <> 2999999999999999999 then
    raise exception 'bigint exact-remainder contract failed: %', v;
  end if;

  -- Invalid recipient classification must fail closed.
  begin
    perform public._investment_settlement_preview_v1(
      1,
      0.50,
      jsonb_build_array(
        jsonb_build_object(
          'allocation_id','00000000-0000-0000-0000-000000000001',
          'participant_user_id',null,
          'is_ctg_internal',false,
          'case_equivalent_units',1,
          'capital_committed_cents',0
        )
      )
    );
    raise exception 'invalid participant-backed classification unexpectedly succeeded';
  exception
    when others then
      if sqlerrm = 'invalid participant-backed classification unexpectedly succeeded' then
        raise;
      end if;
  end;

  -- Private helper must not be executable by client roles.
  if has_function_privilege(
       'authenticated',
       'public._investment_settlement_preview_v1(bigint,numeric,jsonb)',
       'EXECUTE'
     ) then
    raise exception 'authenticated unexpectedly has settlement preview EXECUTE';
  end if;

  if has_function_privilege(
       'anon',
       'public._investment_settlement_preview_v1(bigint,numeric,jsonb)',
       'EXECUTE'
     ) then
    raise exception 'anon unexpectedly has settlement preview EXECUTE';
  end if;
end;
$$;

select 'investment settlement preview v1 contract: ok' as result;
