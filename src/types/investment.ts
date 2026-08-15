// Demo-only types for the CTG Craft Beer Inversión UI-skeleton milestone.
// These are illustrative shapes for src/lib/investment/demo-data.ts, not a
// database schema — the real schema lives in docs/investment/DOMAIN_MODEL.md
// and lands with the first domain milestone (see docs/investment/adr).

export type LotStatus =
  | 'FUNDING_OPEN'
  | 'FUNDED'
  | 'BREWING'
  | 'FERMENTATION'
  | 'BOTTLING'
  | 'IN_MARKET'
  | 'SELLING'
  | 'SETTLED';

export interface DemoTimelineStep {
  label: string;
  done: boolean;
  date?: string;
}

export interface DemoProductionLot {
  slug: string;
  code: string; // e.g. PB-BOG-GPA-2026-008 — display identifier only
  beerStyle: string;
  destination: string;
  status: LotStatus;
  statusLabel: string;
  totalCases: number;
  caseSizeUnits: number;
  fundedPercent: number;
  availableCasesEquivalent: number;
  minimumAllocationCases: number;
  capitalPerCaseCents: number;
  timeline: DemoTimelineStep[];
  inventory: {
    produced: number;
    warehouse: number;
    dispatched: number;
    sold: number;
    damaged: number;
  };
}
