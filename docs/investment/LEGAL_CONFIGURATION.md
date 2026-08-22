# Legal Configuration — CTG Craft Beer Inversión

Status: **PARTIALLY IMPLEMENTED**

Legal/commercial terminology must remain configurable, not embedded as
irreversible technical naming or hard-coded UI copy, because several
classifications are explicitly unresolved (see `BUSINESS_MODEL.md`
§Pending Business Decisions).

## Configuration surface (`src/lib/investment/config.ts`)

| Field | State | Notes |
|---|---|---|
| `programDisplayName`, `participantDisplayName`, `legalInstrumentDisplayName` | Implemented | Defined once; **not** a mass-migration of every existing hard-coded occurrence — see "Known pending hard-coded copy" below. |
| `publicFundingEnabled`, `publicRegistrationEnabled` | Implemented | Re-exported from `flags.ts`, the actual fail-closed exposure flags — not a second copy of that state. |
| `minimumAllocationCases` | Implemented | Reads `MIN_INVESTMENT_CASES` from `constants.ts`, the same value the server-side `create_investment_order` RPC enforces. Expressed in cases (cajas), not currency. |
| `maximumAllocationCases` | Implemented, always `null` | No commercial maximum has been decided — this is an *additional* undecided item, not one of the numbered `BR-*` decisions in `BUSINESS_MODEL.md`. Deliberately **not** env-configurable: neither `InvestmentCheckoutClient` (capped only at lot capacity) nor `create_investment_order` consult a maximum, so an override here would silently do nothing if set. Wire real enforcement through both the checkout UI and the RPC (a new migration) before adding one back. |
| `eligibilityRules` | Implemented, read-only | Describes rules already enforced authoritatively inside PostgreSQL `SECURITY DEFINER` RPCs (`SECURITY_MODEL.md`). This is documentation for UI/copy use — flipping these booleans would not change server behavior, so it is not a real "configuration" in the tunable sense. |
| `riskDisclosureText` | Implemented, wired into `/inversion/simulador` | The exact disclaimer text previously inline in that page, now centralized. Not yet wired into other places that show similar disclaimers (`InvestmentFooter.tsx` has its own, differently-worded, bilingual disclaimer — left as-is; unifying that copy is a separate, explicit decision, not bundled here). |
| `agreementType` | Not implemented, `null` | No contract-type concept exists in the product beyond the `agreement_accepted_at` timestamp column on `investment_participant_profiles`. Not a `CONFIRMED` business rule — never invent a value here (`PRODUCT_CONSTITUTION.md` §Stop conditions). |

## Known pending hard-coded copy

`programDisplayName`'s literal value (`'CTG Craft Beer Inversión'`) still
appears hard-coded in ~16 files across the repo, including some shared
marketing components (`ServicesSection.tsx`, `ecosystem-technology.ts`)
that are explicitly out of scope for this initiative to touch without a
separately authorized change (`CLAUDE.md` — never modify existing
marketing pages). The investment-scoped occurrences
(`InvestmentFooter.tsx`, `inversion/layout.tsx`, `inversion/legal/page.tsx`,
`inversion/como-funciona/page.tsx`, `payment-qr.ts`, checkout/resume-payment
clients) have **not** been migrated to import from `config.ts` in this
change either — that's a larger, purely-cosmetic refactor with no behavior
change, better done as its own small PR than bundled here. Treat
`config.ts` as the source new code should use, not as proof the old
occurrences are gone.

## Compliance note

This program involves accepting capital from third parties tied to future
economic performance. Depending on its final structuring, this may fall
under Colombian financial-services oversight (Superintendencia Financiera)
or other regulatory regimes. **This documentation set does not constitute
legal or regulatory advice and does not certify compliance.** The
conservative defaults in ADR-010 (all funding/settlement/withdrawal
automation flags off by default) exist specifically so the technical system
cannot outrun a legal/regulatory decision that hasn't been made yet. Launch
to real participants and real money must be authorized separately from
completing the technical build.

## Marketing/legal copy rules

See `BUSINESS_MODEL.md` §Marketing language restrictions — no guaranteed-
return language, no "50% de retorno" conflation, mandatory disclaimer on the
simulator (`/inversion/simulador`, now sourced from
`investmentConfig.riskDisclosureText`): projected values are estimates and
do not constitute guaranteed returns; authoritative settlement depends on
actual sales, costs, taxes, and applicable contractual rules.
