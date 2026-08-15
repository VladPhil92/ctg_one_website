// Demo/seed data for the CTG Craft Beer Inversión UI-skeleton milestone.
// No real participants, no real production, no real money — purely
// illustrative content for /inversion so the route, layout, and visual
// language can be reviewed before the domain/financial engine lands (see
// docs/investment/DOMAIN_MODEL.md).

import type { DemoProductionLot } from '@/types/investment';

export const DEMO_LOTS: DemoProductionLot[] = [
  {
    slug: 'pb-bog-gpa-2026-008',
    code: 'PB-BOG-GPA-2026-008',
    beerStyle: 'Golden Pale Ale',
    destination: 'Bogotá',
    status: 'SELLING',
    statusLabel: 'Comercialización',
    totalCases: 50,
    caseSizeUnits: 24,
    fundedPercent: 70,
    availableCasesEquivalent: 15,
    minimumAllocationCases: 5,
    capitalPerCaseCents: 33_600_000, // demo illustrative figure (COP 336,000/caja), not a quoted price
    timeline: [
      { label: 'Aporte confirmado', done: true },
      { label: 'Materias primas adquiridas', done: true },
      { label: 'Producción iniciada', done: true },
      { label: 'Cocción realizada', done: true },
      { label: 'Fermentación iniciada', done: true },
      { label: 'Fermentación finalizada', done: true },
      { label: 'Acondicionamiento', done: true },
      { label: 'Embotellado', done: true },
      { label: 'Control de calidad', done: true },
      { label: 'Ingreso a bodega', done: true },
      { label: 'Despacho', done: true },
      { label: 'Comercialización', done: true },
      { label: 'Lote vendido', done: false },
      { label: 'Liquidación', done: false },
    ],
    inventory: {
      produced: 1200,
      warehouse: 210,
      dispatched: 990,
      sold: 840,
      damaged: 6,
    },
  },
  {
    slug: 'pb-bog-ipa-2026-009',
    code: 'PB-BOG-IPA-2026-009',
    beerStyle: 'India Pale Ale',
    destination: 'Bogotá',
    status: 'FUNDING_OPEN',
    statusLabel: 'Financiación abierta',
    totalCases: 40,
    caseSizeUnits: 24,
    fundedPercent: 35,
    availableCasesEquivalent: 26,
    minimumAllocationCases: 5,
    capitalPerCaseCents: 36_800_000, // demo illustrative figure (COP 368,000/caja), not a quoted price
    timeline: [
      { label: 'Aporte confirmado', done: true },
      { label: 'Materias primas adquiridas', done: false },
      { label: 'Producción iniciada', done: false },
      { label: 'Cocción realizada', done: false },
      { label: 'Fermentación iniciada', done: false },
      { label: 'Fermentación finalizada', done: false },
      { label: 'Acondicionamiento', done: false },
      { label: 'Embotellado', done: false },
      { label: 'Control de calidad', done: false },
      { label: 'Ingreso a bodega', done: false },
      { label: 'Despacho', done: false },
      { label: 'Comercialización', done: false },
      { label: 'Lote vendido', done: false },
      { label: 'Liquidación', done: false },
    ],
    inventory: {
      produced: 0,
      warehouse: 0,
      dispatched: 0,
      sold: 0,
      damaged: 0,
    },
  },
];

export function getDemoLot(slug: string): DemoProductionLot | undefined {
  return DEMO_LOTS.find((lot) => lot.slug === slug);
}

// Illustrative participant dashboard figures — demo user only, no real
// ledger behind these (see docs/investment/FINANCIAL_MODEL.md for the real
// model, not yet implemented).
export const DEMO_PARTICIPANT_SUMMARY = {
  activeCapitalCents: 1_680_000_00,
  capitalRecoveredCents: 0,
  realizedProfitCents: 0,
  availableBalanceCents: 0,
  activeAllocations: 1,
};

export const DEMO_ADMIN_SUMMARY = {
  activeCapitalCents: 9_400_000_00,
  openFundingCents: 6_100_000_00,
  activeLots: DEMO_LOTS.length,
  participants: 12,
  pendingSettlements: 0,
  pendingWithdrawals: 0,
};
