import {
  BANK_TRANSFER_CONFIGURED,
  BRE_B_CONFIGURED,
} from '@/lib/payment-instructions';
import type { WalletKycStatus } from '@/lib/wallet/domain';

export type WalletCopTopUpRail = 'bank_transfer' | 'bre_b_qr';

export interface WalletCopTopUpAction {
  currency: 'COP';
  submissionMode: 'ctg_one_web';
  path: '/dashboard/depositos';
  rails: WalletCopTopUpRail[];
  requiresKyc: true;
}

export interface WalletCopTopUpCapability {
  enabled: boolean;
  action?: WalletCopTopUpAction;
}

/**
 * Additive capability advertised by the canonical Wallet V2 overview.
 *
 * This deliberately publishes only availability + handoff metadata. It never
 * exposes bank account details, Bre-B keys, proof storage paths, service-role
 * credentials or a client-side money-movement primitive.
 */
export function buildWalletCopTopUpCapability(
  kycStatus: WalletKycStatus,
): WalletCopTopUpCapability {
  const rails: WalletCopTopUpRail[] = [];
  if (BANK_TRANSFER_CONFIGURED) rails.push('bank_transfer');
  if (BRE_B_CONFIGURED) rails.push('bre_b_qr');

  if (kycStatus !== 'verified' || rails.length === 0) {
    return { enabled: false };
  }

  return {
    enabled: true,
    action: {
      currency: 'COP',
      submissionMode: 'ctg_one_web',
      path: '/dashboard/depositos',
      rails,
      requiresKyc: true,
    },
  };
}
