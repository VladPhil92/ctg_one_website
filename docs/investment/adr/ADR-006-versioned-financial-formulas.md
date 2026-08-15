# ADR-006: Versioned Financial Formulas

## Status
Accepted

## Context
The profit-share rule (currently intended: capital recovery + 50% of net
distributable profit attributable to the allocation) is a business decision
that will change over time and must never be silently reapplied to
historical settlements.

## Decision
`investment_formula_versions` stores every profit-share/cost-rule
configuration as an immutable, timestamped row (`effective_from`,
`effective_to`, `participant_profit_share`, `ctg_profit_share`, rule
references). Every `investment_funding_allocations` row records the
`formula_version_id` in effect at allocation time, and every
`investment_settlements` row records the `formula_version_id` actually used
to compute it. Settlement code always reads the formula version pinned on
the record, never "the current" formula.

## Consequences
Changing the split for future lots is a new `investment_formula_versions`
row, not a code change and not a UPDATE on old data. Historical settlements
remain reproducible from their own recorded inputs indefinitely.
