# Business Model — CTG Craft Beer Inversión

Every rule below is tagged **CONFIRMED** (from the master implementation
brief) or **PENDING BUSINESS DECISION** (never to be silently assumed —
see `PRODUCT_CONSTITUTION.md` §Stop conditions).

## CONFIRMED

- A participant provides capital corresponding to a configurable number of
  "cajas" (cases) within an identified production lot. Case size is
  configurable, current default `1 caja = 24 botellas` — not hard-coded.
- Participants do not finance physically isolated micro-batches; multiple
  participants (and CTG's own internal allocation) share one physical lot,
  each holding a proportional economic allocation (see ADR-005).
- Sales attribution model: proportional economic allocation. If an
  allocation represents 20% of the eligible lot, 20% of that lot's economic
  performance is attributed to it before profit-sharing.
- Current default financial rule: the participant is entitled to recovery of
  eligible invested capital **plus** 50% of the Net Distributable Profit
  attributable to their allocation (`participantProfitShare = 50%`,
  `ctgProfitShare = 50%`) — versioned, never hard-coded into UI (ADR-006).
- 50% profit share ≠ 50% ROI. Example: COP 1,680,000 capital, COP 600,000
  net distributable profit attributable to the allocation → participant
  profit COP 300,000 → ROI 17.86%. Never market this as "50% rentabilidad".
- Currency: COP. Locale: `es-CO`. Timezone: `America/Bogota`. Timestamps
  persisted in UTC, presented localized.
- Initial launch scope: closed beta, no public registration/funding
  automation (see ADR-010 feature flags), demo/seed data only until
  explicitly authorized otherwise.

## PENDING BUSINESS DECISION

These must never be answered by assumption. Each is recorded here so the
architecture stays configurable (versioned formula, feature-flagged
behavior) rather than hard-coding a guess.

- **BR-001 — Cost scope.** Does financing cover beer manufacturing only, or
  also bottles/labels/boxes/transport/commercialization/distribution?
- **BR-002 — Capital recovery.** "Capital recovery + 50% of attributable net
  distributable profit" is the *current intended* model, pending final
  contractual confirmation.
- **BR-003 — Losses.** Treatment of damaged beer, expired inventory,
  production failure, theft, loss, recall, returns — not yet decided.
- **BR-004 — Lot closing rule.** Candidate: 100% sold OR contractual closing
  date. Not yet confirmed.
- **BR-005 — Unsold inventory.** Options under consideration: extend
  commercialization, residual liquidation, CTG repurchase, write-off,
  conversion, other contractual rule. Not yet decided.

## Configurable terminology (never hard-coded into copy)

`programDisplayName` ("CTG Craft Beer Inversión"),
`participantDisplayName` ("Participante"),
`legalInstrumentDisplayName`, `publicFundingEnabled`,
`publicRegistrationEnabled` — live in `src/lib/investment/config.ts` once
the first domain milestone lands, not scattered across components.

## Marketing language restrictions

Never generate or approve: "Rentabilidad garantizada", "Ganancias seguras",
"50% de retorno", "Duplica tu inversión", "Riesgo cero". Preferred framing:

> El participante podrá tener derecho al porcentaje contractual aplicable de
> la utilidad neta distribuible efectivamente generada por su asignación,
> sujeto a las condiciones del programa.
