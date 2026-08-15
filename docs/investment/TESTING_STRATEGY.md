# Testing Strategy — CTG Craft Beer Inversión

## Current repo baseline

No automated test runner is configured in `ctgone.com` yet (no Vitest/Jest,
no committed Playwright config — confirmed during the Step 1 audit). This
PR does not introduce one either; it verifies the UI-skeleton milestone via
`npm run build` (type-check + lint + prerender of every route) and a manual
headless-browser pass, matching how every prior change to this repo has been
verified. Introducing Vitest + Playwright as real dev dependencies is
recommended as part of the first domain milestone, once there is real
business logic (the financial engine, the state machine) worth unit-testing
— see the final report's `NEXT TASK`.

## Required tests once the domain/financial engine lands

**Financial invariants**
- `ParticipantProfit + CTGProfit == NetDistributableProfit` per the
  applicable formula version.
- `credits - debits == derived balance` per participant, per ledger
  convention.
- A finalized settlement cannot silently change.
- `withdrawal <= eligible available balance`.
- Every reinvested amount is traceable to its source settlement.

**Inventory invariants**
- No negative inventory.
- Movements reconcile.
- Sales cannot exceed available eligible inventory.
- Damaged/returned inventory stays traceable.

**Authorization**
- Participant A cannot read Participant B's data.
- Participant cannot reach `/inversion/admin/*`.
- `PRODUCTION_MANAGER` cannot approve withdrawals.
- `INVENTORY_MANAGER` cannot edit settlements.
- Unauthenticated/unauthorized users cannot fetch signed document URLs for
  documents they don't own.

**End-to-end (Playwright, once the domain milestone exists)**
Full lifecycle from brief §80: create lot → open funding → approve
participant → create allocation → record funding → lot funded → production
events through to warehouse/dispatch → sales recorded → settlement
finalized → participant credited → withdrawal/reinvestment requested →
ledger and inventory remain internally consistent → audit history complete.

## Zero-regression requirement for every PR touching this initiative

Before merging: `npm run build` clean, and a headless-browser pass over the
existing protected routes (`/`, `/about`, `/ecosystem`, `/services`,
`/rewards`, `/token`, `/contact`, `/dashboard`, `/registro`,
`/iniciar-sesion`, `/privacidad`) confirming no console errors and no visual
regression — the same check already used for every prior change to this
repo. "The investment app works but the homepage broke" is never an
acceptable outcome.
