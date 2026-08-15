import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import type {
  InvestmentProductionLot,
  InvestmentProductionEvent,
  LotFundingSummary,
  LotInventorySummary,
} from '@/types/investment';

// Public, unauthenticated-safe reads for /inversion marketing pages — the
// underlying tables have `for select using (true)` RLS policies (see
// 0004_investment_schema.sql), so these work the same whether or not the
// visitor is signed in.

export async function getPublicLots(): Promise<InvestmentProductionLot[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('investment_production_lots')
    .select('*')
    .order('created_at', { ascending: false });
  return (data as InvestmentProductionLot[]) ?? [];
}

export async function getLotByCode(code: string): Promise<InvestmentProductionLot | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from('investment_production_lots')
    .select('*')
    .ilike('code', code)
    .maybeSingle();
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

export async function getLotFundingSummary(lot: InvestmentProductionLot): Promise<LotFundingSummary> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('investment_funding_allocations')
    .select('case_equivalent_units')
    .eq('lot_id', lot.id);

  const allocatedCases = (data ?? []).reduce((sum, row) => sum + row.case_equivalent_units, 0);
  return {
    totalCases: lot.total_cases,
    allocatedCases,
    fundedPercent: lot.total_cases > 0 ? Math.round((allocatedCases / lot.total_cases) * 100) : 0,
    availableCasesEquivalent: Math.max(lot.total_cases - allocatedCases, 0),
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
