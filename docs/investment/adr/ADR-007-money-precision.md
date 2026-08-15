# ADR-007: Money Precision

## Status
Accepted

## Decision
All money is stored and computed as integer COP cents (`*_cents`, `bigint`),
matching the convention already established in the existing `wallets`/
`transactions` tables. No `float`/`numeric` currency columns. Allocation
ratios (e.g. `case_equivalent_units / total_eligible_units`) may use
fixed-point/`numeric` for the ratio itself, but the final distributed amounts
are always rounded to whole cents with a documented, tested rounding rule
(largest-remainder method, so per-participant amounts always sum exactly to
the total being distributed — no cent lost or invented). All authoritative
financial calculations run server-side (domain/financial engine); the
frontend never computes an authoritative settlement or balance figure, only
displays server-provided values or clearly-labeled illustrative estimates
(see the simulator disclaimer in `BUSINESS_MODEL.md`).

## Consequences
Matches existing codebase convention exactly — `src/lib/format.ts`
(`formatCents`) is reusable as-is for investment amounts.
