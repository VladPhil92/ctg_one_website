-- Automated on-chain settlement has no human admin actor. Keep the financial
-- evidence on the claim itself and do not write an invalid NULL admin_id.
create or replace function public.confirm_wallet_crypto_topup_server(
  p_claim_id uuid,
  p_confirmations integer,
  p_received_amount numeric,
  p_validation_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_claim public.wallet_crypto_topup_claims%rowtype;
  v_wallet public.wallets%rowtype;
begin
  select * into v_claim from public.wallet_crypto_topup_claims where id = p_claim_id for update;
  if v_claim.id is null then raise exception 'CRYPTO_TOPUP_CLAIM_NOT_FOUND'; end if;
  if v_claim.state = 'confirmed' then
    return jsonb_build_object('claimId',v_claim.id,'state','confirmed','creditedCents',v_claim.amount_cents,'idempotentReplay',true);
  end if;
  if v_claim.state = 'rejected' then raise exception 'CRYPTO_TOPUP_CLAIM_REJECTED'; end if;
  if p_received_amount is null or p_received_amount < v_claim.crypto_amount_expected then
    raise exception 'CRYPTO_TOPUP_RECEIVED_AMOUNT_INSUFFICIENT';
  end if;

  select * into v_wallet from public.wallets where user_id = v_claim.user_id for update;
  if v_wallet.id is null then raise exception 'CRYPTO_TOPUP_WALLET_NOT_FOUND'; end if;
  if v_wallet.currency <> 'COP' then raise exception 'CRYPTO_TOPUP_WALLET_CURRENCY_INVALID'; end if;

  update public.transactions
  set status='approved', reviewed_at=now(), admin_notes='Automatically validated on-chain'
  where id=v_claim.transaction_id and status='pending';
  if not found then raise exception 'CRYPTO_TOPUP_TRANSACTION_STATE_INVALID'; end if;

  update public.wallets
  set balance_cents = balance_cents + v_claim.amount_cents, updated_at=now()
  where id=v_wallet.id;

  update public.wallet_crypto_topup_claims
  set state='confirmed', confirmations=greatest(coalesce(p_confirmations,0),0),
      onchain_received_amount=p_received_amount,
      validation_data=coalesce(p_validation_data,'{}'::jsonb),
      validation_checked_at=now(), confirmed_at=now(), credited_at=now(), updated_at=now()
  where id=v_claim.id;

  return jsonb_build_object('claimId',v_claim.id,'state','confirmed','creditedCents',v_claim.amount_cents,'idempotentReplay',false);
end;
$$;
revoke all on function public.confirm_wallet_crypto_topup_server(uuid,integer,numeric,jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.confirm_wallet_crypto_topup_server(uuid,integer,numeric,jsonb)
  to service_role;
