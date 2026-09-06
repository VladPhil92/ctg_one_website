-- Phase 4B: final contraction of legacy financial RPC execution.
-- The Phase 4 server-only wrappers are live in the application tier.
-- Legacy implementations remain callable only internally by their owning
-- SECURITY DEFINER wrappers; no PostgREST-facing role retains direct EXECUTE.

revoke all on function public.approve_withdrawal(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.reject_withdrawal(uuid, text)
  from public, anon, authenticated, service_role;
revoke all on function public.set_investment_user_role(uuid, text)
  from public, anon, authenticated, service_role;
revoke all on function public.verify_investment_bancolombia_transfer(uuid, text, bigint, timestamptz, text)
  from public, anon, authenticated, service_role;
revoke all on function public.verify_investment_crypto_transfer(uuid, text, text, bigint, timestamptz, text)
  from public, anon, authenticated, service_role;
revoke all on function public.initiate_investment_payout(uuid, text, text, text, text, text, text)
  from public, anon, authenticated, service_role;
revoke all on function public.confirm_investment_payout(uuid, text, timestamptz, text)
  from public, anon, authenticated, service_role;
revoke all on function public.fail_investment_payout(uuid, text, text)
  from public, anon, authenticated, service_role;

comment on function public.approve_withdrawal(uuid)
  is 'Legacy internal implementation. Direct API execution revoked; use the financial-control server boundary.';
comment on function public.reject_withdrawal(uuid, text)
  is 'Legacy internal implementation. Direct API execution revoked; use the financial-control server boundary.';
comment on function public.set_investment_user_role(uuid, text)
  is 'Legacy internal implementation. Direct API execution revoked; use the financial-control server boundary.';
comment on function public.verify_investment_bancolombia_transfer(uuid, text, bigint, timestamptz, text)
  is 'Legacy internal implementation. Direct API execution revoked; use the financial-control server boundary.';
comment on function public.verify_investment_crypto_transfer(uuid, text, text, bigint, timestamptz, text)
  is 'Legacy internal implementation. Direct API execution revoked; use the financial-control server boundary.';
comment on function public.initiate_investment_payout(uuid, text, text, text, text, text, text)
  is 'Legacy internal implementation. Direct API execution revoked; use the financial-control server boundary.';
comment on function public.confirm_investment_payout(uuid, text, timestamptz, text)
  is 'Legacy internal implementation. Direct API execution revoked; use the financial-control server boundary.';
comment on function public.fail_investment_payout(uuid, text, text)
  is 'Legacy internal implementation. Direct API execution revoked; use the financial-control server boundary.';
