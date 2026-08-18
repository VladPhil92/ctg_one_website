// Public display configuration for account top-ups.
//
// IMPORTANT: production payment channels must fail closed until the real
// legal holder, bank/PSE/Bre-B details and wallet addresses have been
// explicitly configured. Never replace these values with guessed data.

const PENDING = 'PENDING_CONFIGURATION';

export const BANK_TRANSFER_INSTRUCTIONS = {
  bankName: PENDING,
  accountType: PENDING,
  accountNumber: PENDING,
  accountHolder: PENDING,
  nit: PENDING,
};

export const PSE_INSTRUCTIONS = {
  note: PENDING,
};

export const BRE_B_INSTRUCTIONS = {
  key: PENDING,
};

export const CRYPTO_DEPOSIT_ADDRESSES: Array<{ network: string; asset: string; address: string }> = [
  { network: 'polygon', asset: 'CTGO', address: PENDING },
];

const configured = (value: string) => value.trim().length > 0 && value !== PENDING;

/**
 * Legacy/global top-up channels remain fail-closed until every value shown in
 * those flows is explicitly configured.
 */
export const PAYMENT_INSTRUCTIONS_CONFIGURED =
  Object.values(BANK_TRANSFER_INSTRUCTIONS).every(configured) &&
  configured(PSE_INSTRUCTIONS.note) &&
  configured(BRE_B_INSTRUCTIONS.key) &&
  CRYPTO_DEPOSIT_ADDRESSES.length > 0 &&
  CRYPTO_DEPOSIT_ADDRESSES.every((item) =>
    configured(item.network) && configured(item.asset) && configured(item.address)
  );

/**
 * CTG Craft Beer Investment currently operates with one deliberately simple
 * inbound rail: direct Bancolombia transfer using the company's QR image.
 *
 * The QR asset is public display material, not a credential. Keep the actual
 * image outside source code and configure its public URL in Render when the
 * approved QR asset is available.
 */
export const INVESTMENT_BANK_TRANSFER_INSTRUCTIONS = {
  bankName: 'Bancolombia',
  accountType: 'Cuenta de Ahorros',
  qrImageUrl: process.env.NEXT_PUBLIC_INVESTMENT_BANCOLOMBIA_QR_URL ?? PENDING,
};

export const INVESTMENT_BANK_TRANSFER_CONFIGURED =
  configured(INVESTMENT_BANK_TRANSFER_INSTRUCTIONS.qrImageUrl);
