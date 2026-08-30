// Public display configuration for account top-ups.
//
// IMPORTANT: production payment channels must fail closed until the real
// legal holder, bank/PSE/Bre-B details and wallet addresses have been
// explicitly configured. Never replace these values with guessed data.

const PENDING = 'PENDING_CONFIGURATION';

export const BANK_TRANSFER_INSTRUCTIONS = {
  bankName: process.env.NEXT_PUBLIC_WALLET_BANK_NAME ?? PENDING,
  accountType: process.env.NEXT_PUBLIC_WALLET_BANK_ACCOUNT_TYPE ?? PENDING,
  accountNumber: process.env.NEXT_PUBLIC_WALLET_BANK_ACCOUNT_NUMBER ?? PENDING,
  accountHolder: process.env.NEXT_PUBLIC_WALLET_BANK_ACCOUNT_HOLDER ?? PENDING,
  nit: process.env.NEXT_PUBLIC_WALLET_BANK_ACCOUNT_HOLDER_NIT ?? PENDING,
};

export const PSE_INSTRUCTIONS = {
  note: process.env.NEXT_PUBLIC_WALLET_PSE_NOTE ?? PENDING,
};

// Approved static Bancolombia/Bre-B rail supplied by the operator. The QR
// payload is versioned in source and is the same immutable banking payload used
// by the existing CTG payment surface. It is public display material, not a
// credential, and therefore requires no Bancolombia API integration. Runtime
// exposure is still independently feature-gated so a deployment cannot start
// accepting real-money top-ups merely because this code was merged.
const WALLET_BRE_B_QR_ASSET = '/api/wallet/payment-qr';
const WALLET_BRE_B_KEY = '@grupopisaofood';
export const WALLET_STATIC_BRE_B_ENABLED =
  process.env.NEXT_PUBLIC_WALLET_STATIC_BRE_B_ENABLED === 'true';

export const BRE_B_INSTRUCTIONS = {
  key: WALLET_BRE_B_KEY,
  qrImageUrl: WALLET_BRE_B_QR_ASSET,
  recipientLabel: 'GRUPO PISAO FOOD',
};

export const CRYPTO_DEPOSIT_ADDRESSES: Array<{ network: string; asset: string; address: string }> = [
  {
    network: process.env.NEXT_PUBLIC_WALLET_CRYPTO_NETWORK ?? 'polygon',
    asset: process.env.NEXT_PUBLIC_WALLET_CRYPTO_ASSET ?? 'CTGO',
    address: process.env.NEXT_PUBLIC_WALLET_CRYPTO_ADDRESS ?? PENDING,
  },
];

const configured = (value: string) => value.trim().length > 0 && value !== PENDING;

/**
 * Wallet rails are configured independently. A verified Bancolombia/Bre-B COP
 * rail must not be blocked merely because PSE or crypto are still unavailable.
 */
export const BANK_TRANSFER_CONFIGURED =
  Object.values(BANK_TRANSFER_INSTRUCTIONS).every(configured);

export const PSE_CONFIGURED = configured(PSE_INSTRUCTIONS.note);
export const BRE_B_CONFIGURED =
  WALLET_STATIC_BRE_B_ENABLED &&
  configured(BRE_B_INSTRUCTIONS.key) &&
  configured(BRE_B_INSTRUCTIONS.qrImageUrl) &&
  configured(BRE_B_INSTRUCTIONS.recipientLabel);
export const CRYPTO_DEPOSIT_CONFIGURED =
  CRYPTO_DEPOSIT_ADDRESSES.length > 0 &&
  CRYPTO_DEPOSIT_ADDRESSES.every((item) =>
    configured(item.network) && configured(item.asset) && configured(item.address)
  );

/**
 * First production-safe wallet funding slice: manual COP transfer evidence.
 * PSE and crypto remain separate future trust-boundary work.
 */
export const WALLET_MANUAL_COP_TOPUP_CONFIGURED =
  BANK_TRANSFER_CONFIGURED || BRE_B_CONFIGURED;

export function isWalletManualCopRailConfigured(rail: string) {
  if (rail === 'bank_transfer') return BANK_TRANSFER_CONFIGURED;
  if (rail === 'bre_b_qr') return BRE_B_CONFIGURED;
  return false;
}

/**
 * Backward-compatible global flag for any legacy surface that still expects all
 * top-up channels to be ready simultaneously.
 */
export const PAYMENT_INSTRUCTIONS_CONFIGURED =
  BANK_TRANSFER_CONFIGURED &&
  PSE_CONFIGURED &&
  BRE_B_CONFIGURED &&
  CRYPTO_DEPOSIT_CONFIGURED;

/**
 * CTG Craft Beer Investment currently operates with one deliberately simple
 * inbound rail: direct Bancolombia/Bre-B transfer using the approved QR.
 *
 * The QR is public display material, not a credential. Its scan-validated
 * module matrix is versioned in source and rendered by a first-party route so
 * checkout does not depend on a mutable third-party image URL or Render env.
 */
const INVESTMENT_BANCOLOMBIA_QR_ASSET = '/api/investment/payment-qr';

export const INVESTMENT_BANK_TRANSFER_INSTRUCTIONS = {
  bankName: 'Bancolombia',
  accountType: 'Cuenta de Ahorros',
  qrImageUrl: INVESTMENT_BANCOLOMBIA_QR_ASSET,
};

export const INVESTMENT_BANK_TRANSFER_CONFIGURED =
  configured(INVESTMENT_BANK_TRANSFER_INSTRUCTIONS.qrImageUrl);

/**
 * Second manual inbound rail. Like the bank rail it carries no provider or
 * custody integration: the participant transfers on-chain and Finance confirms
 * the movement on a public block explorer. The destination wallet is real
 * operational data, so it is never embedded in source — checkout stays fail
 * closed until all three values are configured in the deployment environment.
 */
export const INVESTMENT_CRYPTO_INSTRUCTIONS = {
  network: process.env.NEXT_PUBLIC_INVESTMENT_CRYPTO_NETWORK ?? PENDING,
  asset: process.env.NEXT_PUBLIC_INVESTMENT_CRYPTO_ASSET ?? PENDING,
  address: process.env.NEXT_PUBLIC_INVESTMENT_CRYPTO_ADDRESS ?? PENDING,
};

export const INVESTMENT_CRYPTO_CONFIGURED =
  Object.values(INVESTMENT_CRYPTO_INSTRUCTIONS).every(configured);