export type InvestmentLotStatus =
  | 'DRAFT' | 'FUNDING_PENDING' | 'FUNDING_OPEN' | 'FUNDING_CLOSED'
  | 'RAW_MATERIALS_PURCHASED' | 'PRODUCTION' | 'BOTTLING' | 'WAREHOUSE'
  | 'DISPATCHED' | 'IN_MARKET' | 'SOLD_OUT' | 'SETTLED' | 'CLOSED'
  | 'CANCELLED' | 'EXPIRED';

export type InvestmentKycStatus = 'NOT_STARTED' | 'PENDING' | 'VERIFIED' | 'REJECTED' | 'REQUIRES_REVIEW';
export type InvestmentRole = 'PARTICIPANT' | 'SUPER_ADMIN' | 'FINANCE_ADMIN' | 'PRODUCTION_MANAGER' | 'INVENTORY_MANAGER' | 'SALES_MANAGER' | 'AUDITOR';

export interface InvestmentParticipantProfile {
  user_id: string;
  investment_role: InvestmentRole;
  kyc_status: InvestmentKycStatus;
  kyc_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvestmentProductionLot {
  id: string;
  code: string;
  beer_style: string;
  beer_style_id: string | null;
  destination: string;
  status: InvestmentLotStatus;
  case_size_units: number;
  total_cases: number;
  total_eligible_units: number;
  production_cost_unit_cents: number;
  label_cost_unit_cents: number;
  transport_cost_unit_cents: number | null;
  own_point_price_unit_cents: number;
  b2b_price_unit_cents: number;
  inc_rate: number;
  advertising_rate_on_pre_inc: number;
  created_by: string | null;
  created_at: string;
}

export const LOT_STATUS_LABELS: Record<InvestmentLotStatus, string> = {
  DRAFT: 'Borrador', FUNDING_PENDING: 'Pendiente de financiación', FUNDING_OPEN: 'Financiación abierta',
  FUNDING_CLOSED: 'Financiación cerrada', RAW_MATERIALS_PURCHASED: 'Insumos comprados',
  PRODUCTION: 'En producción', BOTTLING: 'Embotellado', WAREHOUSE: 'En bodega', DISPATCHED: 'Despachado',
  IN_MARKET: 'En mercado', SOLD_OUT: 'Agotado', SETTLED: 'Liquidado', CLOSED: 'Cerrado',
  CANCELLED: 'Cancelado', EXPIRED: 'Expirado',
};

export interface InvestmentFundingAllocation {
  id: string;
  lot_id: string;
  participant_user_id: string | null;
  is_ctg_internal: boolean;
  case_equivalent_units: number;
  capital_committed_cents: number;
  formula_version_id: string;
  created_at: string;
}

export type InvestmentLedgerEntryType =
  | 'FUNDING_RECEIVED' | 'CAPITAL_COMMITTED' | 'CAPITAL_RELEASED'
  | 'PROFIT_CREDIT' | 'LOSS_DEBIT' | 'WITHDRAWAL_DEBIT'
  | 'REINVESTMENT_DEBIT' | 'REINVESTMENT_CREDIT' | 'ADJUSTMENT';

export interface InvestmentLedgerEntry {
  id: string;
  participant_user_id: string;
  lot_id: string | null;
  allocation_id: string | null;
  entry_type: InvestmentLedgerEntryType;
  amount_cents: number;
  description: string;
  idempotency_key: string | null;
  actor_id: string | null;
  created_at: string;
}

export interface InvestmentProductionEvent {
  id: string;
  lot_id: string;
  previous_status: InvestmentLotStatus | null;
  new_status: InvestmentLotStatus;
  notes: string | null;
  evidence_document_id: string | null;
  actor_id: string | null;
  occurred_at: string;
}

export interface InvestmentSettlement {
  id: string;
  lot_id: string;
  formula_version_id: string;
  total_revenue_cents: number;
  eligible_costs_cents: number;
  tax_liability_cents: number;
  ndlp_cents: number;
  participant_pool_cents: number;
  ctg_pool_cents: number;
  finalized_at: string;
  finalized_by: string | null;
  created_at: string;
}

export interface InvestmentSettlementDistribution {
  id: string;
  settlement_id: string;
  allocation_id: string;
  participant_user_id: string | null;
  capital_committed_cents: number;
  pool_share: number;
  profit_amount_cents: number;
  created_at: string;
}

export interface InvestmentWithdrawalRequest {
  id: string;
  participant_user_id: string;
  amount_cents: number;
  status: 'REQUESTED' | 'APPROVED' | 'PAYMENT_PROCESSING' | 'PAID' | 'REJECTED' | 'CANCELLED';
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
  created_at: string;
}

export interface InvestmentReinvestmentRequest {
  id: string;
  participant_user_id: string;
  source_settlement_id: string;
  target_lot_id: string;
  amount_cents: number;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export type InvestmentOrderStatus =
  | 'AWAITING_PAYMENT' | 'PENDING_BANK_VERIFICATION' | 'PAYMENT_SUBMITTED'
  | 'PAYMENT_VERIFIED' | 'ALLOCATED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';

export type InvestmentPaymentMethod = 'bank_transfer' | 'pse' | 'bre_b_qr' | 'crypto';

export interface InvestmentOrder {
  id: string;
  participant_user_id: string;
  lot_id: string;
  case_equivalent_units: number;
  capital_required_cents: number;
  status: InvestmentOrderStatus;
  payment_method: InvestmentPaymentMethod | null;
  payment_reference: string | null;
  payment_proof_storage_path: string | null;
  payment_proof_sha256: string | null;
  payment_proof_original_name: string | null;
  payment_proof_mime: string | null;
  bank_verified_provider_code: string | null;
  bank_verified_reference: string | null;
  bank_verified_amount_cents: number | null;
  bank_received_at: string | null;
  bank_verified_at: string | null;
  bank_verified_by: string | null;
  contract_reference: string | null;
  contract_activated_at: string | null;
  allocation_id: string | null;
  admin_notes: string | null;
  payment_submitted_at: string | null;
  payment_verified_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
  lot?: InvestmentProductionLot;
}

export const INVESTMENT_ORDER_STATUS_LABELS: Record<InvestmentOrderStatus, string> = {
  AWAITING_PAYMENT: 'Pendiente de transferencia',
  PENDING_BANK_VERIFICATION: 'Pendiente de verificación bancaria',
  PAYMENT_SUBMITTED: 'Verificación en proceso',
  PAYMENT_VERIFIED: 'Pago verificado',
  ALLOCATED: 'Participación activa',
  REJECTED: 'Rechazada', CANCELLED: 'Cancelada', EXPIRED: 'Expirada',
};

export type BottleUnitStatus =
  | 'GENERATED' | 'PACKAGED' | 'QC_APPROVED' | 'WAREHOUSE' | 'DISPATCHED' | 'IN_MARKET'
  | 'SOLD' | 'RETURNED' | 'DAMAGED' | 'LOST' | 'EXPIRED' | 'RECALLED';

export interface InvestmentBottleUnit {
  id: string;
  lot_id: string;
  unit_number: number;
  serial_code: string;
  status: BottleUnitStatus;
  current_location: string | null;
  packaged_at: string | null;
  sold_at: string | null;
  sale_price_cents: number | null;
  sale_reference: string | null;
  last_actor_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvestmentSalesChannel { id: string; code: string; name: string; active: boolean; created_at: string; updated_at: string; }
export interface InvestmentSale {
  id: string; lot_id: string; channel_id: string; sale_reference: string | null; idempotency_key: string;
  location: string | null; customer_label: string | null; status: 'CONFIRMED' | 'VOID'; gross_revenue_cents: number;
  tax_recognized_cents: number; created_by: string; sold_at: string; created_at: string;
}
export interface InvestmentSaleItem {
  id: string; sale_id: string; lot_id: string; bottle_unit_id: string; serial_code: string; quantity_units: 1;
  unit_price_cents: number; line_total_cents: number; created_at: string;
}

export interface LotFundingSummary {
  totalCases: number;
  allocatedCases: number;
  reservedCases?: number;
  fundedPercent: number;
  availableCasesEquivalent: number;
}
export interface LotInventorySummary { produced: number; warehouse: number; dispatched: number; sold: number; damaged: number; }
