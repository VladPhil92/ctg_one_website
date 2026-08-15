// Row shapes mirroring supabase/migrations/0004_investment_schema.sql.
// Hand-written for now (matches the convention already used in
// src/types/domain.ts for the CTG One accounts schema) — could be
// generated via `supabase gen types typescript` once a CLI connection to
// the real project exists.

export type LotStatus =
  | 'DRAFT' | 'FUNDING_PENDING' | 'FUNDING_OPEN' | 'FUNDED' | 'PROCUREMENT' | 'BREWING'
  | 'FERMENTATION' | 'CONDITIONING' | 'BOTTLING' | 'QUALITY_CONTROL' | 'WAREHOUSE' | 'DISPATCHED'
  | 'IN_MARKET' | 'SELLING' | 'SOLD_OUT' | 'SETTLEMENT_PENDING' | 'SETTLED' | 'CLOSED'
  | 'PAUSED' | 'CANCELLED' | 'PRODUCTION_LOSS' | 'PARTIAL_LOSS' | 'RECALLED' | 'EXPIRED';

export const LOT_STATUS_LABELS: Record<LotStatus, string> = {
  DRAFT: 'Borrador',
  FUNDING_PENDING: 'Financiación por abrir',
  FUNDING_OPEN: 'Financiación abierta',
  FUNDED: 'Financiado',
  PROCUREMENT: 'Compra de insumos',
  BREWING: 'Cocción',
  FERMENTATION: 'Fermentación',
  CONDITIONING: 'Acondicionamiento',
  BOTTLING: 'Embotellado',
  QUALITY_CONTROL: 'Control de calidad',
  WAREHOUSE: 'En bodega',
  DISPATCHED: 'Despachado',
  IN_MARKET: 'En mercado',
  SELLING: 'Comercialización',
  SOLD_OUT: 'Agotado',
  SETTLEMENT_PENDING: 'Liquidación pendiente',
  SETTLED: 'Liquidado',
  CLOSED: 'Cerrado',
  PAUSED: 'Pausado',
  CANCELLED: 'Cancelado',
  PRODUCTION_LOSS: 'Pérdida de producción',
  PARTIAL_LOSS: 'Pérdida parcial',
  RECALLED: 'Retirado del mercado',
  EXPIRED: 'Vencido',
};

// The only forward transition each status legally allows (mirrors the
// allow-list enforced server-side in transition_lot_status() — this
// client-side copy is for UI labeling/disabling only, never the real
// authorization boundary).
export const LOT_NEXT_STATUS: Partial<Record<LotStatus, LotStatus>> = {
  DRAFT: 'FUNDING_PENDING',
  FUNDING_PENDING: 'FUNDING_OPEN',
  FUNDING_OPEN: 'FUNDED',
  FUNDED: 'PROCUREMENT',
  PROCUREMENT: 'BREWING',
  BREWING: 'FERMENTATION',
  FERMENTATION: 'CONDITIONING',
  CONDITIONING: 'BOTTLING',
  BOTTLING: 'QUALITY_CONTROL',
  QUALITY_CONTROL: 'WAREHOUSE',
  WAREHOUSE: 'DISPATCHED',
  DISPATCHED: 'IN_MARKET',
  IN_MARKET: 'SELLING',
  SELLING: 'SOLD_OUT',
  SOLD_OUT: 'SETTLEMENT_PENDING',
  SETTLEMENT_PENDING: 'SETTLED',
  SETTLED: 'CLOSED',
};

export interface InvestmentProductionLot {
  id: string;
  code: string;
  beer_style: string;
  destination: string;
  status: LotStatus;
  case_size_units: number;
  total_cases: number;
  total_eligible_units: number;
  created_at: string;
}

export interface InvestmentProductionEvent {
  id: string;
  lot_id: string;
  previous_status: LotStatus | null;
  new_status: LotStatus;
  notes: string | null;
  occurred_at: string;
}

export interface InvestmentFundingAllocation {
  id: string;
  lot_id: string;
  participant_user_id: string | null;
  is_ctg_internal: boolean;
  case_equivalent_units: number;
  capital_committed_cents: number;
  created_at: string;
}

export interface InvestmentInventoryMovement {
  movement_type: string;
  quantity_units: number;
}

export interface InvestmentParticipantProfile {
  id: string;
  user_id: string;
  investment_role: 'SUPER_ADMIN' | 'FINANCE_ADMIN' | 'PRODUCTION_MANAGER' | 'INVENTORY_MANAGER' | 'SALES_MANAGER' | 'AUDITOR' | 'PARTICIPANT';
  kyc_status: 'NOT_STARTED' | 'PENDING' | 'VERIFIED' | 'REJECTED' | 'REQUIRES_REVIEW';
  created_at: string;
}

export interface InvestmentLedgerEntry {
  id: string;
  lot_id: string | null;
  entry_type: string;
  amount_cents: number;
  reference: string | null;
  created_at: string;
}

export interface InvestmentWithdrawalRequest {
  id: string;
  amount_cents: number;
  status: 'REQUESTED' | 'UNDER_REVIEW' | 'APPROVED' | 'PAYMENT_PROCESSING' | 'PAID' | 'REJECTED' | 'CANCELLED';
  created_at: string;
}

// Derived, lot-level view assembled client/server-side from the rows
// above — never a DB table itself.
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
