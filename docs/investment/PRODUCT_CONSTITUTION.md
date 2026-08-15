# Product Constitution — CTG Craft Beer Inversión

Non-negotiable principles for this initiative. When any other document,
code comment, or convenience conflicts with this file, this file wins
(see the source-of-truth hierarchy in `CLAUDE.md`).

## What this is

Economic participation linked to traceable physical CTG Craft Beer
production lots, run by Cervecería Cartagena S.A.S., surfaced inside
`ctgone.com` at `/inversion`.

## What this is not

- Not equity/shares in Cervecería Cartagena S.A.S. Participants never become
  shareholders by participating.
- Not a security, token, coin, or tradeable instrument. Terminology
  (`Participant`, `FundingAllocation`, `ProductionLot`, `Settlement`) is
  deliberately neutral — never `Share`, `Stock`, `Equity`, `Shareholder`,
  `Token`, `Coin`.
- Not a crypto exchange, stock exchange, trading terminal, or casino — in
  domain model, in copy, or in visual design.
- Not guaranteed-return anything. "50% profit share" is not "50% ROI"
  (see `FINANCIAL_MODEL.md` — this distinction is mandatory everywhere the
  number is shown).

## Absolute project constraint

`ctgone.com` root and every existing page continue functioning exactly as
they do today. `/inversion` is additive. See `EXISTING_SITE_INTEGRATION.md`
and ADR-000.

## Priority order when trade-offs arise

1. Protect existing `ctgone.com`
2. Preserve all existing functionality
3. Isolate CTG Craft Beer Inversión
4. Maintain financial correctness
5. Maintain security
6. Maintain auditability
7. Use the preferred stack when compatible with the above

## Source of truth hierarchy

1. Explicit human instructions
2. This document
3. Approved business rules (`BUSINESS_MODEL.md` — "CONFIRMED" items only)
4. Approved ADRs (`docs/investment/adr/*`)
5. Domain documentation (`DOMAIN_MODEL.md`, `LOT_STATE_MACHINE.md`,
   `FINANCIAL_MODEL.md`, ...)
6. Existing `ctgone.com` architecture and conventions
7. Implementation code

Code conforms to the documented model — the model is never silently changed
to make coding easier.

## Stop conditions

Never invent: financial formulas, loss-allocation rules, contract terms, tax
treatment, legal classification, capital-recovery policy, or unsold-inventory
policy. When one of these is needed and undecided, record it as a
`PENDING BUSINESS DECISION` in `BUSINESS_MODEL.md`, build the surrounding
architecture so the eventual rule is configurable (not hard-coded), and keep
moving on the safe, unambiguous parts of the task.
