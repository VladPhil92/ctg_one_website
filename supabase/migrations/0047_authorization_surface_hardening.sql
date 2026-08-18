-- CTG One — authorization surface hardening
--
-- 1. Legacy RPCs that intentionally fail closed must not remain callable by
--    ordinary authenticated clients.
-- 2. Manual-bank reconciliation health exposes internal financial control
--    metrics and therefore requires finance.read (or SUPER_ADMIN via RBAC).

revoke execute on function public.approve_investment_order(uuid, text) from public, anon, authenticated;
revoke execute on function public.create_funding_allocation(uuid, integer, bigint) from public, anon, authenticated;
revoke execute on function public.mark_withdrawal_paid(uuid) from public, anon, authenticated;
revoke execute on function public.submit_investment_order_payment(uuid, text, text, text) from public, anon, authenticated;

create or replace function public.get_manual_bank_verification_health()
returns table(
  pending_bank_verification bigint,
  allocated_without_human_verification bigint,
  allocated_without_receipt bigint,
  allocated_without_contract_activation bigint,
  duplicated_proof_hashes bigint
)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if not public.has_investment_permission('finance.read') then
    raise exception 'not authorized';
  end if;

  return query
  select
    (select count(*) from public.investment_orders where status = 'PENDING_BANK_VERIFICATION'),
    (select count(*) from public.investment_orders where status = 'ALLOCATED' and bank_verified_at is null),
    (select count(*) from public.investment_orders o where o.status = 'ALLOCATED' and not exists (
      select 1 from public.investment_payment_receipts r where r.order_id = o.id
    )),
    (select count(*) from public.investment_orders where status = 'ALLOCATED' and contract_activated_at is null),
    (select count(*) from (
      select payment_proof_sha256
      from public.investment_orders
      where payment_proof_sha256 is not null
      group by payment_proof_sha256
      having count(*) > 1
    ) d);
end;
$$;

revoke all on function public.get_manual_bank_verification_health() from public;
revoke execute on function public.get_manual_bank_verification_health() from anon;
grant execute on function public.get_manual_bank_verification_health() to authenticated;
