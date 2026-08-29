-- CTG Craft Beer Investment — fail closed unresolved loss settlements
--
-- BR-002/BR-003 are still pending explicit business/legal approval and the
-- historical finalizer assumes full capital recovery. Until a versioned
-- partial-capital-recovery waterfall is approved and implemented, do not allow
-- a settlement whose realized NDLP is negative to create participant credits.
--
-- This is a conservative safety guard only. It does not define the final loss
-- allocation or capital-recovery business rule and does not enable LIVE use.

create or replace function public.guard_negative_investment_settlement_pending_business_rule()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.net_distributable_profit_cents < 0 then
    raise exception using
      errcode = 'P0001',
      message = 'settlement blocked: negative realized economics require approved capital-recovery/loss rules';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_negative_investment_settlement_pending_business_rule()
  from public, anon, authenticated;

drop trigger if exists investment_settlement_negative_economics_fail_closed
  on public.investment_settlements;

create trigger investment_settlement_negative_economics_fail_closed
before insert on public.investment_settlements
for each row
execute function public.guard_negative_investment_settlement_pending_business_rule();

comment on function public.guard_negative_investment_settlement_pending_business_rule() is
  'Temporary fail-closed guard: blocks negative-NDLP settlements until BR-002/BR-003 are explicitly approved and a deterministic partial capital-recovery waterfall is implemented.';
