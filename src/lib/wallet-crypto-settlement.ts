import 'server-only';

import { createAdminClient } from '@/lib/supabase/server';
import { validateWalletCryptoTopup } from '@/lib/wallet-crypto-onchain';
import type { WalletCryptoAsset } from '@/lib/wallet-crypto-topups';

export async function validateAndPersistWalletCryptoTopup(
  admin: ReturnType<typeof createAdminClient>,
  claimId: string,
) {
  const { data: claim, error } = await admin
    .from('wallet_crypto_topup_claims')
    .select('id,asset,network,destination_address,tx_hash,crypto_amount_expected,state')
    .eq('id', claimId)
    .maybeSingle();
  if (error || !claim) throw new Error(error?.message ?? 'CRYPTO_TOPUP_CLAIM_NOT_FOUND');
  if (claim.state === 'confirmed' || claim.state === 'rejected') return claim;

  let validation;
  try {
    validation = await validateWalletCryptoTopup({
      asset: claim.asset as WalletCryptoAsset,
      network: claim.network,
      destinationAddress: claim.destination_address,
      txHash: claim.tx_hash,
      expectedAmount: Number(claim.crypto_amount_expected),
    });
  } catch (validationError) {
    validation = {
      state: 'manual_review' as const,
      confirmations: 0,
      receivedAmount: null,
      reason: validationError instanceof Error ? validationError.message : 'CHAIN_VALIDATION_UNAVAILABLE',
      details: { validatorUnavailable: true },
    };
  }

  if (validation.state === 'confirmed' && validation.receivedAmount !== null) {
    const { data, error: confirmError } = await admin.rpc('confirm_wallet_crypto_topup_server', {
      p_claim_id: claimId,
      p_confirmations: validation.confirmations,
      p_received_amount: validation.receivedAmount,
      p_validation_data: validation.details,
    });
    if (confirmError) throw new Error(confirmError.message);
    return data;
  }

  const { data, error: recordError } = await admin.rpc('record_wallet_crypto_validation_server', {
    p_claim_id: claimId,
    p_state: validation.state,
    p_confirmations: validation.confirmations,
    p_received_amount: validation.receivedAmount,
    p_validation_data: validation.details,
    p_rejection_reason: validation.state === 'rejected'
      ? validation.reason ?? 'on-chain validation rejected the payment'
      : null,
  });
  if (recordError) throw new Error(recordError.message);
  return {
    ...data,
    reason: validation.reason,
    confirmations: validation.confirmations,
    receivedAmount: validation.receivedAmount,
  };
}
