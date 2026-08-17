# Financial Model — CTG Craft Beer Inversión

Status: implemented baseline + design reference for further settlement hardening.

## Money model

Integer COP cents everywhere (ADR-007). Authoritative transactional calculations run in PostgreSQL. Frontend calculations are limited to explicitly labeled simulations derived from persisted lot snapshots and versioned formula data; no production-facing UI may invent fallback prices, costs, tax rates or profit shares.

## Economics source of truth

The system deliberately separates **presets**, **historical snapshots** and **realized financial facts**:

1. `investment_beer_styles` may hold current economic presets for new lots: production cost, label cost, own-point price, B2B price, INC rate and advertising rate.
2. `investment_production_lots` snapshots the resolved values at creation. Once a lot exists, those fields are the authoritative historical assumptions for that lot; later edits to style presets do not recalculate it.
3. `investment_orders.capital_required_cents` is derived server-side from the lot snapshot at order creation.
4. Actual settlement never uses the illustrative unit-economics projection. It reads realized `investment_lot_financial_entries`.
5. `investment_formula_versions` remains the authority for participant/CTG profit-share rules; every allocation pins a formula version.

Migration `0020_authoritative_lot_economics.sql` removes bootstrap-era implicit defaults from lot rows and canonical lot creation. Missing economics now fail closed. The legacy non-style lot-creation RPC is no longer executable by clients.

## Public simulator

`/inversion/simulador` no longer contains a fixed capital-per-case constant, a fixed projected-NDLP ratio or a hard-coded participant share. It only simulates `FUNDING_OPEN` lots with complete persisted economics and reads the active formula version from Supabase.

The simulator exposes two transparent boundary scenarios — 100% own-point and 100% B2B — instead of assuming an arbitrary channel mix. These are illustrative contribution scenarios, not a settlement forecast. If there is no published lot or active formula, the UI fails closed rather than inventing values.

## Net Distributable Lot Profit (NDLP)

```
NDLP =
    Eligible Recognized Revenue
  - Applicable Taxes
  - Eligible Production Costs
  - Eligible Commercial Costs
  - Authorized Adjustments
```

```
ParticipantProfit = (NDLP attributable to allocation) × participantProfitShare
CTGProfit         = (NDLP attributable to allocation) × ctgProfitShare
```

"NDLP attributable to allocation" = `NDLP × allocation.allocation_ratio`
(ADR-005 proportional model — never physical bottle ownership).

Participant settlement amount = `EligibleCapitalRecovery + ParticipantProfit`.

No deductions beyond what's listed above are assumed — BR-001/BR-003 in
`BUSINESS_MODEL.md` remain pending and must not be silently baked into this
formula.

## Formula versioning (ADR-006)

Every allocation and every settlement pins a `formula_version_id`. Changing
the split percentage is a new `FormulaVersion` row; a finalized settlement
recomputed later must still reproduce its original number using the version
it recorded — this is a required financial test (see `TESTING_STRATEGY.md`).

## Ledger (ADR-003)

Append-only `investment_ledger_entries`. Event types:
`FUNDING_RECEIVED`, `CAPITAL_COMMITTED`, `CAPITAL_DEPLOYED`,
`CAPITAL_RECOVERED`, `LOT_REVENUE_RECOGNIZED`, `LOT_EXPENSE_RECOGNIZED`,
`TAX_RECOGNIZED`, `PROFIT_REALIZED`, `PROFIT_DISTRIBUTED`,
`SETTLEMENT_CREDIT`, `WITHDRAWAL_DEBIT`, `REINVESTMENT_DEBIT`,
`ADJUSTMENT_CREDIT`, `ADJUSTMENT_DEBIT`, `REVERSAL`.

## Wallet-equivalent read model (never a single "balance" field)

`availableBalance`, `committedCapital`, `activeCapital`, `pendingSettlement`,
`capitalRecovered`, `realizedProfit`, `reinvestedAmount`, `withdrawnAmount` —
each a derived query over the ledger, each with its own Spanish dashboard
label.

## Financial invariants

- `ParticipantProfit + CTGProfit == NetDistributableProfit` under the applicable versioned split/distribution model.
- `sum(credits) - sum(debits) == derived balance` for every participant, per ledger convention.
- A finalized settlement never silently changes.
- `withdrawal amount <= eligible available balance`.
- Every reinvested amount traces back to a specific prior settlement credit.
- A lot cannot be created with missing economic snapshot values.
- Public economics and simulator output must come from persisted snapshots, never source-code fallback constants.

## Withdrawal / reinvestment workflow states

```
WithdrawalRequest:   REQUESTED → UNDER_REVIEW → APPROVED → PAYMENT_PROCESSING → PAID
                      (alt terminal: REJECTED, CANCELLED)
```

A withdrawal request does not itself subtract money — the financial effect
happens only via a `WITHDRAWAL_DEBIT` ledger entry written when the request
is paid, inside the same controlled domain workflow that transitions the
request's status.

Reinvestment preserves full genealogy: `Lot A Settlement → Reinvestment →
Lot B Allocation`, each step its own ledger entries, nothing overwritten.
