# ADR-003: Append-Only Financial Ledger

## Status
Accepted

## Context
The existing CTG One deposits system already established the precedent of
never letting a client write a balance directly, and only mutating money
through `SECURITY DEFINER` RPCs. CTG Craft Beer Inversión's money flows are
more complex (capital → production → sales → settlement → withdrawal/
reinvestment) and need full historical traceability per participant per lot,
not just a current balance.

## Decision
`investment_ledger_entries` is append-only (no `UPDATE`/`DELETE` grant to any
role, including admin — enforced at the RLS/grant level, not just in
application code). Every balance-affecting fact is a typed ledger event:
`FUNDING_RECEIVED`, `CAPITAL_COMMITTED`, `CAPITAL_DEPLOYED`,
`CAPITAL_RECOVERED`, `LOT_REVENUE_RECOGNIZED`, `LOT_EXPENSE_RECOGNIZED`,
`TAX_RECOGNIZED`, `PROFIT_REALIZED`, `PROFIT_DISTRIBUTED`,
`SETTLEMENT_CREDIT`, `WITHDRAWAL_DEBIT`, `REINVESTMENT_DEBIT`,
`ADJUSTMENT_CREDIT`, `ADJUSTMENT_DEBIT`, `REVERSAL`.

Any derived figure a participant or admin sees (available balance, capital
recovered, realized profit) is a query/materialized view over this ledger,
never a mutable column that gets directly incremented.

## Consequences
- Corrections happen via `REVERSAL`/adjustment entries referencing the
  original entry, never by editing history.
- This is more implementation work up front than a `balance` column, but it
  is the only way to satisfy the auditability and "reconstructible history"
  requirements in the product constitution.
- Deferred to the first domain milestone (see `DOMAIN_MODEL.md`) — not part
  of the initial UI-skeleton slice.
