// Feature flags for CTG Craft Beer Inversión (ADR-010, docs/investment/adr).
// Every flag defaults to false when its env var is unset — fail closed, so a
// missing env var cannot accidentally broaden public funding or automated
// money movement. Financial authorization and invariants remain enforced in
// PostgreSQL/RPCs; these flags control product exposure/integration modes and
// never replace KYC, lot state, capacity, ledger or settlement controls.

function flag(name: string): boolean {
  return process.env[name] === 'true';
}

export const investmentFlags = {
  publicRegistrationEnabled: flag('CTG_INVESTMENT_PUBLIC_REGISTRATION_ENABLED'),
  publicFundingEnabled: flag('CTG_INVESTMENT_PUBLIC_FUNDING_ENABLED'),
  paymentGatewayEnabled: flag('CTG_INVESTMENT_PAYMENT_GATEWAY_ENABLED'),
  automaticSettlementEnabled: flag('CTG_INVESTMENT_AUTOMATIC_SETTLEMENT_ENABLED'),
  automaticWithdrawalsEnabled: flag('CTG_INVESTMENT_AUTOMATIC_WITHDRAWALS_ENABLED'),
  kycProviderEnabled: flag('CTG_INVESTMENT_KYC_PROVIDER_ENABLED'),
  whatsappNotificationsEnabled: flag('CTG_INVESTMENT_WHATSAPP_NOTIFICATIONS_ENABLED'),
} as const;
