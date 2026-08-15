# Financial Model — CTG Craft Beer Inversión

Status: design reference for the first domain milestone (see note at the
bottom of `DOMAIN_MODEL.md`).

## Money model

Integer COP cents everywhere (ADR-007). No authoritative calculation ever
runs client-side — the frontend only displays server-computed values or an
explicitly-labeled illustrative simulator estimate (see `/inversion/simulador`
disclaimer, mandatory per the product brief §42).

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
(ADR-005 proportional model — never a per-bottle calculation).

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

## Financial invariants (mandatory tests once the engine lands)

- `ParticipantProfit + CTGProfit == NetDistributableProfit` (per the
  applicable formula version, per lot).
- `sum(credits) - sum(debits) == derived balance` for every participant, per
  ledger convention.
- A finalized settlement never silently changes.
- `withdrawal amount <= eligible available balance`.
- Every reinvested amount traces back to a specific prior settlement credit
  (no reinvestment from thin air).

## Withdrawal / reinvestment workflow states

```
WithdrawalRequest:   REQUESTED → UNDER_REVIEW → APPROVED → PAYMENT_PROCESSING → PAID
                      (alt terminal: REJECTED, CANCELLED)
```

A withdrawal request does not itself subtract money — the financial effect
happens only via a `WITHDRAWAL_DEBIT` ledger entry written when the request
is approved/paid, inside the same `SECURITY DEFINER` function that
transitions the request's status (mirrors `approve_deposit` in the existing
CTG One system).

Reinvestment preserves full genealogy: `Lot A Settlement → Reinvestment →
Lot B Allocation`, each step its own ledger entries, nothing overwritten.
