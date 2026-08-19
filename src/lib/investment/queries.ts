import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import type {
  InvestmentProductionLot,
  InvestmentProductionEvent,
  LotFundingSummary,
  LotInventorySummary,
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

// Public, unauthenticated-safe reads for /inversion surfaces. DRAFT lots are
// blocked by RLS as of migration 0060 and filtered here again as defense in
// depth. Funding progress is obtained only from the aggregate public RPC;
// allocation/order rows themselves remain participant/admin-only.

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

export async function getLotTimeline(lotId: string): Promise<InvestmentProductionEvent[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('investment_production_events')
    .select('*')
    .eq('lot_id', lotId)
    .order('occurred_at', { ascending: true });
  return (data as InvestmentProductionEvent[]) ?? [];
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

// Coarse, approximate derivation from raw movements — see the comment on
// investment_inventory_movements in the migration for why this isn't a
// full per-state stock engine yet.
export async function getLotInventorySummary(lotId: string): Promise<LotInventorySummary> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('investment_inventory_movements')
    .select('movement_type, quantity_units')
    .eq('lot_id', lotId);

  const sumBy = (types: string[]) =>
    (data ?? []).filter((m) => types.includes(m.movement_type)).reduce((sum, m) => sum + m.quantity_units, 0);

  const produced = sumBy(['PRODUCED']);
  const dispatched = sumBy(['DISPATCHED']);
  const sold = sumBy(['SOLD']);
  const damaged = sumBy(['DAMAGED', 'EXPIRED', 'LOST']);

  return {
    produced,
    dispatched,
    sold,
    damaged,
    warehouse: Math.max(produced - dispatched - damaged, 0),
  };
}
