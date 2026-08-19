import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import type {
  InvestmentProductionLot,
  LotFundingSummary,
  LotStatus,
} from '@/types/investment';
import type { InvestmentFormulaVersion } from '@/types/investment-economics';
import { hasCompleteLotEconomics } from '@/lib/investment/economics';
import { MIN_INVESTMENT_CASES } from '@/lib/investment/constants';

type PublicLotFundingRow = {
  lot_id: string;
  total_cases: number;
  allocated_cases: number;
  reserved_cases: number;
  funded_percent: number;
  available_cases_equivalent: number;
};

type PublicLotOperationsRow = {
  lot_id: string;
  serialized_units: number;
  warehouse_units: number;
  dispatched_units: number;
  in_market_units: number;
  sold_units: number;
  returned_units: number;
  incident_units: number;
  timeline: unknown;
};

export type PublicLotTimelineEvent = {
  status: LotStatus;
  occurredAt: string;
};

export type PublicLotOperationalSnapshot = {
  serializedUnits: number;
  warehouseUnits: number;
  dispatchedUnits: number;
  inMarketUnits: number;
  soldUnits: number;
  returnedUnits: number;
  incidentUnits: number;
  timeline: PublicLotTimelineEvent[];
};

// Public, unauthenticated-safe reads for /inversion surfaces. DRAFT lots are
// blocked by RLS as of migration 0060 and filtered here again as defense in
// depth. Funding and operational truth come only from reviewed aggregate RPCs;
// allocation, order, bottle-unit and production-event rows remain private.

export async function getPublicLots(): Promise<InvestmentProductionLot[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('investment_production_lots')
    .select('*')
    .neq('status', 'DRAFT')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });
  if (error) throw new Error(`No se pudieron cargar los lotes publicados: ${error.message}`);
  return (data as InvestmentProductionLot[]) ?? [];
}

export async function getPublicEconomicsReferenceLot(): Promise<InvestmentProductionLot | null> {
  const lots = await getPublicLots();
  const eligible = lots.filter((lot) => hasCompleteLotEconomics(lot));
  return eligible[0] ?? null;
}

export async function getPublicSimulationLots(): Promise<InvestmentProductionLot[]> {
  const lots = await getPublicLots();
  const eligible = lots.filter(
    (lot) => lot.total_eligible_units >= MIN_INVESTMENT_CASES
      && hasCompleteLotEconomics(lot),
  );

  // Prefer opportunities that are currently investable. If none are open,
  // keep the public calculator usable with the most recent persisted snapshot
  // instead of coupling the simulator lifecycle to FUNDING_OPEN.
  const fundingOpen = eligible.filter((lot) => lot.status === 'FUNDING_OPEN');
  return fundingOpen.length > 0 ? fundingOpen : eligible.slice(0, 1);
}

export async function getActiveInvestmentFormulaVersion(): Promise<InvestmentFormulaVersion | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from('investment_formula_versions')
    .select('id,version,effective_from,effective_to,participant_profit_share,ctg_profit_share,status,created_at,approved_at')
    .eq('status', 'ACTIVE')
    .maybeSingle();
  return (data as InvestmentFormulaVersion | null) ?? null;
}

export async function getLotByCode(code: string): Promise<InvestmentProductionLot | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('investment_production_lots')
    .select('*')
    .neq('status', 'DRAFT')
    .ilike('code', code)
    .maybeSingle();
  if (error) throw new Error(`No se pudo cargar el lote publicado: ${error.message}`);
  return (data as InvestmentProductionLot) ?? null;
}

function fundingRowToSummary(row: PublicLotFundingRow): LotFundingSummary {
  return {
    totalCases: Number(row.total_cases ?? 0),
    allocatedCases: Number(row.allocated_cases ?? 0),
    reservedCases: Number(row.reserved_cases ?? 0),
    fundedPercent: Number(row.funded_percent ?? 0),
    availableCasesEquivalent: Number(row.available_cases_equivalent ?? 0),
  };
}

export async function getPublicLotFundingSummaries(): Promise<Record<string, LotFundingSummary>> {
  if (!isSupabaseConfigured) return {};
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_public_investment_lot_funding', { p_lot_id: null });
  if (error) throw new Error(`No se pudo cargar el avance público de financiación: ${error.message}`);

  const rows = (data as PublicLotFundingRow[] | null) ?? [];
  return Object.fromEntries(rows.map((row) => [row.lot_id, fundingRowToSummary(row)]));
}

export async function getLotFundingSummary(lot: InvestmentProductionLot): Promise<LotFundingSummary> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_public_investment_lot_funding', { p_lot_id: lot.id });
  if (error) throw new Error(`No se pudo cargar la financiación del lote: ${error.message}`);

  const row = ((data as PublicLotFundingRow[] | null) ?? [])[0];
  if (row) return fundingRowToSummary(row);

  return {
    totalCases: lot.total_eligible_units,
    allocatedCases: 0,
    reservedCases: 0,
    fundedPercent: 0,
    availableCasesEquivalent: lot.total_eligible_units,
  };
}

function isPublicTimelineEntry(value: unknown): value is { status: LotStatus; occurred_at: string } {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return typeof row.status === 'string' && typeof row.occurred_at === 'string';
}

export async function getPublicLotOperationalSnapshot(lotId: string): Promise<PublicLotOperationalSnapshot> {
  const empty: PublicLotOperationalSnapshot = {
    serializedUnits: 0,
    warehouseUnits: 0,
    dispatchedUnits: 0,
    inMarketUnits: 0,
    soldUnits: 0,
    returnedUnits: 0,
    incidentUnits: 0,
    timeline: [],
  };
  if (!isSupabaseConfigured) return empty;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_public_investment_lot_operations', { p_lot_id: lotId });
  if (error) throw new Error(`No se pudo cargar el estado operacional público del lote: ${error.message}`);

  const row = ((data as PublicLotOperationsRow[] | null) ?? [])[0];
  if (!row) return empty;
  const rawTimeline = Array.isArray(row.timeline) ? row.timeline : [];

  return {
    serializedUnits: Number(row.serialized_units ?? 0),
    warehouseUnits: Number(row.warehouse_units ?? 0),
    dispatchedUnits: Number(row.dispatched_units ?? 0),
    inMarketUnits: Number(row.in_market_units ?? 0),
    soldUnits: Number(row.sold_units ?? 0),
    returnedUnits: Number(row.returned_units ?? 0),
    incidentUnits: Number(row.incident_units ?? 0),
    timeline: rawTimeline
      .filter(isPublicTimelineEntry)
      .map((event) => ({ status: event.status, occurredAt: event.occurred_at })),
  };
}
