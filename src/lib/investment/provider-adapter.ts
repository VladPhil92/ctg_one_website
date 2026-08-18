import type { NormalizedFinancialProviderEventInput } from '@/types/provider-reconciliation';

/**
 * Provider-neutral boundary for future bank/PSE/Bre-B/payment-processor adapters.
 *
 * An adapter may inspect a provider-specific payload in memory, but it must emit
 * only normalized events. CTG One persists the normalized event plus a SHA-256
 * digest; raw statements, account credentials and webhook payloads are not part
 * of the persistence contract.
 */
export interface InvestmentFinancialProviderAdapter<TPayload = unknown> {
  readonly providerCode: string;
  normalize(payload: TPayload): Promise<NormalizedFinancialProviderEventInput[]> | NormalizedFinancialProviderEventInput[];
}

export function assertProviderAdapterCode(providerCode: string) {
  const normalized = providerCode.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{2,64}$/.test(normalized)) {
    throw new Error('Provider adapter code must be 2-64 uppercase alphanumeric/underscore/hyphen characters.');
  }
  return normalized;
}
