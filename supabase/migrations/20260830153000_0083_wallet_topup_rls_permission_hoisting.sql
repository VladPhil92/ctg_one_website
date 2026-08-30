-- CTG One Wallet — keep permission checks init-plan hoisted in wallet top-up RLS.
--
-- The generic RLS performance/security contract rejects per-row evaluation of
-- permission helpers. Hoisting both auth.uid() and is_admin() through SELECT
-- preserves identical authorization semantics while forcing init-plan reuse.

drop policy if exists wallet_topup_claims_read_own_or_admin
  on public.wallet_topup_claims;

create policy wallet_topup_claims_read_own_or_admin
  on public.wallet_topup_claims
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_admin())
  );
