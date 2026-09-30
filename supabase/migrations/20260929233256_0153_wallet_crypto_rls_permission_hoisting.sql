-- CTG One Wallet — hoist authorization helpers out of per-row RLS evaluation.
-- auth.uid() was already hoisted; is_admin() must be hoisted as well to match
-- the repository-wide RLS performance contract.
drop policy if exists wallet_crypto_quotes_read_own_or_admin on public.wallet_crypto_quotes;
create policy wallet_crypto_quotes_read_own_or_admin
  on public.wallet_crypto_quotes for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists wallet_crypto_topups_read_own_or_admin on public.wallet_crypto_topup_claims;
create policy wallet_crypto_topups_read_own_or_admin
  on public.wallet_crypto_topup_claims for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
