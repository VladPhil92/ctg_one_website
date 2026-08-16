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
 * Single production safety switch derived from the actual display values.
 * The top-up UI must not accept requests while any channel shown to users
 * still contains placeholder configuration.
 */
export const PAYMENT_INSTRUCTIONS_CONFIGURED =
  Object.values(BANK_TRANSFER_INSTRUCTIONS).every(configured) &&
  configured(PSE_INSTRUCTIONS.note) &&
  configured(BRE_B_INSTRUCTIONS.key) &&
  CRYPTO_DEPOSIT_ADDRESSES.length > 0 &&
  CRYPTO_DEPOSIT_ADDRESSES.every((item) =>
    configured(item.network) && configured(item.asset) && configured(item.address)
  );
