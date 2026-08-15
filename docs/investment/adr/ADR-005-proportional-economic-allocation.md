# ADR-005: Proportional Economic Allocation (Not Physical Bottle Ownership)

## Status
Accepted

## Context
A `ProductionLot` is one physical batch; multiple participants (and CTG
itself) each finance an "equivalent" slice of it (e.g. 5 of 50 cases).
Section 11-12 of the product brief is explicit that this must not be modeled
as ownership of specific bottles.

## Decision
`investment_funding_allocations.case_equivalent_units` (and the derived
`allocation_ratio = case_equivalent_units / lot.total_eligible_units`) is the
only mechanism used to attribute lot-level financial performance to a
participant. Sales, inventory, and settlement calculations always operate at
the lot level first, then distribute proportionally to allocations. No
schema field, UI copy, or API response implies a participant owns specific
bottles/cases.

## Consequences
Settlement math is a single well-tested proportional-distribution routine
reused across all lots, rather than per-participant physical tracking. UI
copy must consistently say "equivalente productivo financiado", never
"tus botellas" / "your bottles".
