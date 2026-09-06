revoke all on function public.approve_kyc(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.reject_kyc(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.verify_wallet_topup_claim(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.reconcile_wallet_topup_claim(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.reject_wallet_topup_claim(uuid, text) from public, anon, authenticated, service_role;
