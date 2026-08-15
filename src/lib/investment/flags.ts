// Feature flags for CTG Craft Beer Inversión (ADR-010, docs/investment/adr).
// Every flag defaults to false when its env var is unset — fail closed, so
// a missing env var can never accidentally open real funding/withdrawals.
// None of these are wired to real money-moving code yet (see
// docs/investment/DOMAIN_MODEL.md — this PR ships the UI-skeleton milestone
// only); they exist now so future work has a conservative switch to land
// behind from day one.

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
