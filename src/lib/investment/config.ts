// Legal/commercial configuration surface for CTG Craft Beer Inversión
// (docs/investment/LEGAL_CONFIGURATION.md). Centralizes terminology, limits
// and legal copy that must stay configurable rather than hard-coded, since
// several classifications remain unresolved
// (docs/investment/BUSINESS_MODEL.md §Pending Business Decisions).
//
// This deliberately does not duplicate state that already has a single
// source of truth elsewhere:
// - publicFundingEnabled/publicRegistrationEnabled are read from flags.ts
//   (the fail-closed exposure flags), not redefined here.
// - minimumAllocationCases reads MIN_INVESTMENT_CASES from constants.ts,
//   the same value the server-side create_investment_order RPC enforces.

import { investmentFlags } from './flags';
import { MIN_INVESTMENT_CASES } from './constants';

function optionalPositiveInt(name: string): number | null {
  const raw = process.env[name];
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export const investmentConfig = {
  // Display terminology. Defined once here so it isn't reintroduced as a
  // fresh hard-coded literal in new investment-scoped UI; existing call
  // sites are not being mass-migrated in this change (see the "known
  // pending hard-coded copy" note in LEGAL_CONFIGURATION.md).
  programDisplayName: 'CTG Craft Beer Inversión',
  participantDisplayName: 'Participante',
  legalInstrumentDisplayName: 'Asignación de participación económica en lote de producción',

  // Exposure flags — sourced from flags.ts, never duplicated state.
  publicFundingEnabled: investmentFlags.publicFundingEnabled,
  publicRegistrationEnabled: investmentFlags.publicRegistrationEnabled,

  // Allocation limits, expressed in cases (cajas) — the unit
  // BUSINESS_MODEL.md defines participation in, not currency.
  //
  // minimumAllocationCases mirrors MIN_INVESTMENT_CASES: a read of that
  // single value, not a second copy of the rule.
  minimumAllocationCases: MIN_INVESTMENT_CASES,
  // No commercial maximum has been decided. This is not one of
  // BR-001..BR-005 in BUSINESS_MODEL.md, but it is equally undecided —
  // null means "no configured cap beyond the lot's remaining capacity",
  // which is the only limit PostgreSQL currently enforces. Set
  // CTG_INVESTMENT_MAX_ALLOCATION_CASES once a business decision exists;
  // never assume a number here (PRODUCT_CONSTITUTION.md §Stop conditions).
  maximumAllocationCases: optionalPositiveInt('CTG_INVESTMENT_MAX_ALLOCATION_CASES'),

  // Eligibility is already enforced authoritatively inside PostgreSQL
  // SECURITY DEFINER RPCs (SECURITY_MODEL.md) — this is a read-only
  // description for UI/copy use, not a second enforcement point, and
  // toggling these booleans here would not change server behavior.
  eligibilityRules: {
    requiresVerifiedKyc: true,
    requiresFundingOpenLotState: true,
    enforcedServerSide: true,
  },

  // Mandatory disclaimer text (LEGAL_CONFIGURATION.md — "mandatory
  // disclaimer on the simulator"). Matches the copy already shown on
  // /inversion/simulador, centralized here so it can't silently fork if
  // reused elsewhere.
  riskDisclosureText:
    'Los escenarios son estimados y no constituyen una rentabilidad garantizada ni una reserva de capacidad. La liquidación real depende de las ventas, costos, impuestos, ajustes y reglas contractuales efectivamente aplicables al lote y a la versión de fórmula financiera que quede fijada en cada allocation.',

  // Not implemented anywhere in the product today — no contract-type
  // concept exists beyond the `agreement_accepted_at` timestamp column on
  // investment_participant_profiles — and not a CONFIRMED business rule.
  // Never invent a value here per PRODUCT_CONSTITUTION.md §Stop conditions.
  agreementType: null as string | null,
} as const;
