// Row shapes mirroring Supabase investment migrations.

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
  id: string; code: string; beer_style: string; destination: string; status: LotStatus;
  case_size_units: number; total_cases: number; total_eligible_units: number; created_at: string;
  production_cost_unit_cents?: number; label_cost_unit_cents?: number;
  own_point_price_unit_cents?: number; b2b_price_unit_cents?: number;
  inc_rate?: number; advertising_rate_on_pre_inc?: number;
}

export interface InvestmentProductionEvent {
  id: string; lot_id: string; previous_status: LotStatus | null; new_status: LotStatus;
  notes: string | null; occurred_at: string;
}

export interface InvestmentFundingAllocation {
  id: string; lot_id: string; participant_user_id: string | null; is_ctg_internal: boolean;
  case_equivalent_units: number; capital_committed_cents: number; created_at: string;
}

export interface InvestmentInventoryMovement { movement_type: string; quantity_units: number; }

export interface InvestmentParticipantProfile {
  id: string; user_id: string;
  investment_role: 'SUPER_ADMIN' | 'FINANCE_ADMIN' | 'PRODUCTION_MANAGER' | 'INVENTORY_MANAGER' | 'SALES_MANAGER' | 'AUDITOR' | 'PARTICIPANT';
  kyc_status: 'NOT_STARTED' | 'PENDING' | 'VERIFIED' | 'REJECTED' | 'REQUIRES_REVIEW';
  created_at: string;
}

export interface InvestmentLedgerEntry {
  id: string; lot_id: string | null; entry_type: string; amount_cents: number;
  reference: string | null; created_at: string;
}

export interface InvestmentWithdrawalRequest {
  id: string; amount_cents: number;
  status: 'REQUESTED' | 'UNDER_REVIEW' | 'APPROVED' | 'PAYMENT_PROCESSING' | 'PAID' | 'REJECTED' | 'CANCELLED';
  created_at: string;
}

export type InvestmentOrderStatus =
  | 'AWAITING_PAYMENT' | 'PAYMENT_SUBMITTED' | 'PAYMENT_VERIFIED' | 'ALLOCATED'
  | 'REJECTED' | 'CANCELLED' | 'EXPIRED';

export interface InvestmentOrder {
  id: string;
  participant_user_id: string;
  lot_id: string;
  case_equivalent_units: number;
  capital_required_cents: number;
  status: InvestmentOrderStatus;
  payment_method: 'bank_transfer' | 'pse' | 'bre_b_qr' | 'crypto' | null;
  payment_reference: string | null;
  payment_proof_storage_path: string | null;
  allocation_id: string | null;
  admin_notes: string | null;
  payment_submitted_at: string | null;
  payment_verified_at: string | null;
  created_at: string;
  updated_at: string;
  lot?: InvestmentProductionLot;
}

export const INVESTMENT_ORDER_STATUS_LABELS: Record<InvestmentOrderStatus, string> = {
  AWAITING_PAYMENT: 'Pendiente de pago', PAYMENT_SUBMITTED: 'Pago enviado', PAYMENT_VERIFIED: 'Pago verificado',
  ALLOCATED: 'Participación activa', REJECTED: 'Rechazada', CANCELLED: 'Cancelada', EXPIRED: 'Expirada',
};

export interface LotFundingSummary { totalCases: number; allocatedCases: number; fundedPercent: number; availableCasesEquivalent: number; }
export interface LotInventorySummary { produced: number; warehouse: number; dispatched: number; sold: number; damaged: number; }
