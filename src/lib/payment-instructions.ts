// Non-secret display content shown to users during a deposit — not env
// vars, just easy to edit here once the real details exist.
//
// TODO(business owner): every value below is a placeholder. Fill in the
// real bank account / PSE / Bre-B details and the real corporate crypto
// wallet addresses before this goes live — nothing here is functional
// yet, it's just what gets displayed on the deposit form.

export const BANK_TRANSFER_INSTRUCTIONS = {
  bankName: 'TODO: nombre del banco',
  accountType: 'TODO: tipo de cuenta (ahorros/corriente)',
  accountNumber: 'TODO: número de cuenta',
  accountHolder: 'CTG One Corporation',
  nit: 'TODO: NIT',
};

export const PSE_INSTRUCTIONS = {
  note: 'TODO: instrucciones específicas de PSE, si difieren de la transferencia bancaria estándar',
};

export const BRE_B_INSTRUCTIONS = {
  key: 'TODO: Llave Bre-B de CTG One',
};

export const CRYPTO_DEPOSIT_ADDRESSES: Array<{ network: string; asset: string; address: string }> = [
  // TODO: reemplazar con la(s) dirección(es) de wallet corporativa real(es).
  { network: 'polygon', asset: 'CTGO', address: 'TODO: dirección de wallet' },
];
