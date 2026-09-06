revoke all on function public.verify_wallet_topup_claim(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.reconcile_wallet_topup_claim(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.reject_wallet_topup_claim(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.approve_kyc(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.reject_kyc(uuid, text) from public, anon, authenticated, service_role;

comment on function public.verify_wallet_topup_claim(uuid, text) is
  'Legacy internal implementation. Direct execution revoked in Phase 3; use verify_wallet_topup_claim_server through the server-only boundary.';
comment on function public.reconcile_wallet_topup_claim(uuid, text) is
  'Legacy internal implementation. Direct execution revoked in Phase 3; use reconcile_wallet_topup_claim_server through the server-only boundary.';
comment on function public.reject_wallet_topup_claim(uuid, text) is
  'Legacy internal implementation. Direct execution revoked in Phase 3; use reject_wallet_topup_claim_server through the server-only boundary.';
comment on function public.approve_kyc(uuid, text) is
  'Legacy internal implementation. Direct execution revoked in Phase 3; use approve_kyc_server through the server-only boundary.';
comment on function public.reject_kyc(uuid, text) is
  'Legacy internal implementation. Direct execution revoked in Phase 3; use reject_kyc_server through the server-only boundary.';
