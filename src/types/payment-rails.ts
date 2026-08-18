export type InvestmentInboundRail = 'bank_transfer' | 'pse' | 'bre_b_qr' | 'crypto';
export type InvestmentPayoutRail = 'bank_transfer' | 'bre_b' | 'crypto' | 'other';
export type InvestmentPayoutEventType = 'PROCESSING' | 'CONFIRMED' | 'FAILED';

export interface InvestmentPaymentReceipt {
  id: string;
  order_id: string;
  participant_user_id: string;
  payment_rail: InvestmentInboundRail;
  provider_code: string;
  external_reference: string;
  amount_cents: number;
  currency: 'COP';
  settled_at: string;
  idempotency_key: string;
  notes: string | null;
  reconciled_by: string;
  reconciled_at: string;
  created_at: string;
}

export interface InvestmentPayout {
  id: string;
  withdrawal_request_id: string;
  participant_user_id: string;
  amount_cents: number;
  currency: 'COP';
  payout_rail: InvestmentPayoutRail;
  provider_code: string;
  destination_masked: string;
  destination_fingerprint: string;
  idempotency_key: string;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export interface InvestmentPayoutEvent {
  id: string;
  payout_id: string;
  event_type: InvestmentPayoutEventType;
  provider_code: string;
  external_reference: string | null;
  occurred_at: string;
  notes: string | null;
  metadata: unknown | null;
  actor_id: string;
  created_at: string;
}

export interface InvestmentInboundReconciliation {
  order_id: string;
  participant_user_id: string;
  order_status: string;
  capital_required_cents: number;
  receipt_id: string | null;
  receipt_amount_cents: number | null;
  provider_code: string | null;
  external_reference: string | null;
  allocation_id: string | null;
  funding_received_cents: number;
  capital_committed_cents: number;
  rail_state: 'AWAITING_RECEIPT' | 'RECONCILED' | 'MISMATCH';
  is_reconciled: boolean;
}

export interface InvestmentPayoutReconciliation {
  withdrawal_request_id: string;
  participant_user_id: string;
  withdrawal_status: string;
  amount_cents: number;
  payout_id: string | null;
  payout_rail: InvestmentPayoutRail | null;
  provider_code: string | null;
  destination_masked: string | null;
  payout_state: InvestmentPayoutEventType | 'NOT_INITIATED';
  external_reference: string | null;
  withdrawal_debit_cents: number;
  is_reconciled: boolean;
}
