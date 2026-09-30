import 'server-only';

import { createAdminClient } from '@/lib/supabase/server';
import { validateWalletCryptoTopup } from '@/lib/wallet-crypto-onchain';
import {
  canAutoSettleWalletCryptoDestination,
  type WalletCryptoAsset,
} from '@/lib/wallet-crypto-topups';

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
    // Explorer/RPC availability is transient. Keep the claim retryable so the
    // status endpoint and UI polling continue validating instead of stranding a
    // paid claim in manual review after a temporary provider outage.
    validation = {
      state: 'confirming' as const,
      confirmations: 0,
      receivedAmount: null,
      reason: validationError instanceof Error ? validationError.message : 'CHAIN_VALIDATION_UNAVAILABLE',
      details: { validatorUnavailable: true, retryable: true },
    };
  }

  if (validation.state === 'confirmed' && validation.receivedAmount !== null) {
    // The currently configured Binance destinations are shared operator
    // addresses. A transaction to a shared address proves receipt, but not which
    // CTG One participant originated it. Never auto-credit such a claim: doing
    // so would allow an otherwise-unclaimed historical/third-party transaction
    // to be presented by the wrong participant. Automatic settlement is only
    // permitted once the destination itself is claimant-specific.
    if (!canAutoSettleWalletCryptoDestination(claim.asset, claim.destination_address)) {
      validation = {
        state: 'manual_review' as const,
        confirmations: validation.confirmations,
        receivedAmount: validation.receivedAmount,
        reason: 'shared receiving address requires operator reconciliation before wallet credit',
        details: {
          ...validation.details,
          onchainValidated: true,
          autoSettlementBlocked: true,
          settlementBinding: 'shared-operator-address',
        },
      };
    } else {
      const { data, error: confirmError } = await admin.rpc('confirm_wallet_crypto_topup_server', {
        p_claim_id: claimId,
        p_confirmations: validation.confirmations,
        p_received_amount: validation.receivedAmount,
        p_validation_data: {
          ...validation.details,
          settlementBinding: 'claimant-specific-address',
        },
      });
      if (confirmError) throw new Error(confirmError.message);
      return data;
    }
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
