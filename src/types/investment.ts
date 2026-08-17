// Domain-friendly row shapes synchronized with the production Supabase schema.
// Source of truth remains the database migrations / generated Supabase types.

export type LotStatus =
  | 'DRAFT' | 'FUNDING_PENDING' | 'FUNDING_OPEN' | 'FUNDED' | 'PROCUREMENT' | 'BREWING'
  | 'FERMENTATION' | 'CONDITIONING' | 'BOTTLING' | 'QUALITY_CONTROL' | 'WAREHOUSE' | 'DISPATCHED'
  | 'IN_MARKET' | 'SELLING' | 'SOLD_OUT' | 'SETTLEMENT_PENDING' | 'SETTLED' | 'CLOSED'
  | 'PAUSED' | 'CANCELLED' | 'PRODUCTION_LOSS' | 'PARTIAL_LOSS' | 'RECALLED' | 'EXPIRED';

export const LOT_STATUS_LABELS: Record<LotStatus, string> = {
  DRAFT: 'Borrador', FUNDING_PENDING: 'Financiación por abrir', FUNDING_OPEN: 'Financiación abierta',
  FUNDED: 'Financiado', PROCUREMENT: 'Compra de insumos', BREWING: 'Cocción', FERMENTATION: 'Fermentación',
  CONDITIONING: 'Acondicionamiento', BOTTLING: 'Embotellado', QUALITY_CONTROL: 'Control de calidad',
  WAREHOUSE: 'En bodega', DISPATCHED: 'Despachado', IN_MARKET: 'En mercado', SELLING: 'Comercialización',
  SOLD_OUT: 'Agotado', SETTLEMENT_PENDING: 'Liquidación pendiente', SETTLED: 'Liquidado', CLOSED: 'Cerrado',
  PAUSED: 'Pausado', CANCELLED: 'Cancelado', PRODUCTION_LOSS: 'Pérdida de producción',
  PARTIAL_LOSS: 'Pérdida parcial', RECALLED: 'Retirado del mercado', EXPIRED: 'Vencido',
};

export const LOT_NEXT_STATUS: Partial<Record<LotStatus, LotStatus>> = {
  DRAFT: 'FUNDING_PENDING', FUNDING_PENDING: 'FUNDING_OPEN', FUNDING_OPEN: 'FUNDED', FUNDED: 'PROCUREMENT',
  PROCUREMENT: 'BREWING', BREWING: 'FERMENTATION', FERMENTATION: 'CONDITIONING', CONDITIONING: 'BOTTLING',
  BOTTLING: 'QUALITY_CONTROL', QUALITY_CONTROL: 'WAREHOUSE', WAREHOUSE: 'DISPATCHED', DISPATCHED: 'IN_MARKET',
  IN_MARKET: 'SELLING', SELLING: 'SOLD_OUT', SOLD_OUT: 'SETTLEMENT_PENDING', SETTLEMENT_PENDING: 'SETTLED', SETTLED: 'CLOSED',
};

export interface InvestmentProductionLot {
  id: string;
  code: string;
  beer_style: string;
  beer_style_id: string | null;
  destination: string;
  status: LotStatus;
  case_size_units: number;
  total_cases: number;
  total_eligible_units: number;
  created_by: string | null;
  created_at: string;
  production_cost_unit_cents: number;
  label_cost_unit_cents: number;
  own_point_price_unit_cents: number;
  b2b_price_unit_cents: number;
  inc_rate: number;
  advertising_rate_on_pre_inc: number;
}

export interface InvestmentProductionEvent {
  id: string;
  lot_id: string;
  previous_status: LotStatus | null;
  new_status: LotStatus;
  actor_id: string | null;
  notes: string | null;
  evidence_document_id: string | null;
  occurred_at: string;
}

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

// Lightweight projection used by inventory aggregation queries.
export interface InvestmentInventoryMovement {
  movement_type: string;
  quantity_units: number;
}

export interface InvestmentInventoryMovementRow extends InvestmentInventoryMovement {
  id: string;
  lot_id: string;
  actor_id: string | null;
  occurred_at: string;
}

export type InvestmentRole =
  | 'SUPER_ADMIN' | 'FINANCE_ADMIN' | 'PRODUCTION_MANAGER' | 'INVENTORY_MANAGER'
  | 'SALES_MANAGER' | 'AUDITOR' | 'PARTICIPANT';

export type InvestmentKycStatus =
  | 'NOT_STARTED' | 'PENDING' | 'VERIFIED' | 'REJECTED' | 'REQUIRES_REVIEW';

export interface InvestmentParticipantProfile {
  id: string;
  user_id: string;
  investment_role: InvestmentRole;
  kyc_status: InvestmentKycStatus;
  bank_account_masked: string | null;
  agreement_accepted_at: string | null;
  created_at: string;
}

export type InvestmentLedgerEntryType =
  | 'FUNDING_RECEIVED' | 'CAPITAL_COMMITTED' | 'CAPITAL_DEPLOYED' | 'CAPITAL_RECOVERED'
  | 'LOT_REVENUE_RECOGNIZED' | 'LOT_EXPENSE_RECOGNIZED' | 'TAX_RECOGNIZED'
  | 'PROFIT_REALIZED' | 'PROFIT_DISTRIBUTED' | 'SETTLEMENT_CREDIT' | 'WITHDRAWAL_DEBIT'
  | 'REINVESTMENT_DEBIT' | 'ADJUSTMENT_CREDIT' | 'ADJUSTMENT_DEBIT' | 'REVERSAL';

export interface InvestmentLedgerEntry {
  id: string;
  participant_user_id: string;
  lot_id: string | null;
  allocation_id: string | null;
  entry_type: InvestmentLedgerEntryType;
  amount_cents: number;
  reference: string | null;
  metadata: unknown | null;
  actor_id: string | null;
  created_at: string;
}

export type InvestmentWithdrawalStatus =
  | 'REQUESTED' | 'UNDER_REVIEW' | 'APPROVED' | 'PAYMENT_PROCESSING'
  | 'PAID' | 'REJECTED' | 'CANCELLED';

export interface InvestmentWithdrawalRequest {
  id: string;
  participant_user_id: string;
  amount_cents: number;
  status: InvestmentWithdrawalStatus;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export type InvestmentOrderStatus =
  | 'AWAITING_PAYMENT' | 'PAYMENT_SUBMITTED' | 'PAYMENT_VERIFIED' | 'ALLOCATED'
  | 'REJECTED' | 'CANCELLED' | 'EXPIRED';

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
  AWAITING_PAYMENT: 'Pendiente de pago', PAYMENT_SUBMITTED: 'Pago enviado', PAYMENT_VERIFIED: 'Pago verificado',
  ALLOCATED: 'Participación activa', REJECTED: 'Rechazada', CANCELLED: 'Cancelada', EXPIRED: 'Expirada',
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

export interface InvestmentSalesChannel {
  id: string;
  code: string;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InvestmentSale {
  id: string;
  lot_id: string;
  channel_id: string;
  sale_reference: string | null;
  idempotency_key: string;
  location: string | null;
  customer_label: string | null;
  status: 'CONFIRMED' | 'VOID';
  gross_revenue_cents: number;
  tax_recognized_cents: number;
  created_by: string;
  sold_at: string;
  created_at: string;
}

export interface InvestmentSaleItem {
  id: string;
  sale_id: string;
  lot_id: string;
  bottle_unit_id: string;
  serial_code: string;
  quantity_units: 1;
  unit_price_cents: number;
  line_total_cents: number;
  created_at: string;
}

export interface LotFundingSummary {
  totalCases: number;
  allocatedCases: number;
  fundedPercent: number;
  availableCasesEquivalent: number;
}

export interface LotInventorySummary {
  produced: number;
  warehouse: number;
  dispatched: number;
  sold: number;
  damaged: number;
}
