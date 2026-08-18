import type { InvestmentInboundRail, InvestmentPayoutRail } from './payment-rails';

export type FinancialEventDirection = 'INBOUND' | 'OUTBOUND';
export type FinancialProviderEventType = 'SETTLED' | 'CONFIRMED' | 'FAILED';
export type FinancialProviderRail = InvestmentInboundRail | InvestmentPayoutRail;
export type FinancialMatchOutcome = 'RECONCILED' | 'CONFIRMED' | 'FAILED' | 'NO_MATCH' | 'CONFLICT' | 'IGNORED';
export type FinancialMatchMethod = 'AUTO_EXACT_REFERENCE' | 'AUTO_MERCHANT_REFERENCE' | 'MANUAL' | 'SYSTEM_NO_MATCH' | 'SYSTEM_CONFLICT' | 'IGNORED';

export interface NormalizedFinancialProviderEventInput {
  providerCode: string;
  providerEventKey: string;
  direction: FinancialEventDirection;
  eventType: FinancialProviderEventType;
  paymentRail: FinancialProviderRail;
  amountCents: number;
  externalReference?: string | null;
  merchantReference?: string | null;
  occurredAt: string;
}

export interface FinancialReconciliationInboxRow {
  event_id: string;
  provider_code: string;
  provider_event_key: string;
  direction: FinancialEventDirection;
  event_type: FinancialProviderEventType;
  payment_rail: FinancialProviderRail;
  amount_cents: number;
  external_reference: string | null;
  merchant_reference: string | null;
  occurred_at: string;
  ingested_at: string;
  match_outcome: FinancialMatchOutcome | null;
  match_method: FinancialMatchMethod | null;
  target_type: 'ORDER' | 'PAYOUT' | 'NONE' | null;
  order_id: string | null;
  payout_id: string | null;
  receipt_id: string | null;
  match_notes: string | null;
  match_created_at: string | null;
  is_terminal: boolean;
}

export interface ProviderReconciliationHealth {
  total_events: number;
  unresolved_events: number;
  latest_no_match: number;
  latest_conflict: number;
  reconciled_receipt_mismatches: number;
  confirmed_payout_mismatches: number;
  failed_payout_mismatches: number;
}

export interface AutoMatchSummary {
  processed: number;
  reconciled: number;
  confirmed: number;
  failed: number;
  unmatched: number;
  conflicts: number;
}
