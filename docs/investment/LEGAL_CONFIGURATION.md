# Legal Configuration — CTG Craft Beer Inversión

Status: **IMPLEMENTED** (within this initiative's scope — see "Known
pending hard-coded copy" for the explicitly out-of-scope remainder)

Legal/commercial terminology must remain configurable, not embedded as
irreversible technical naming or hard-coded UI copy, because several
classifications are explicitly unresolved (see `BUSINESS_MODEL.md`
§Pending Business Decisions).

## Configuration surface (`src/lib/investment/config.ts`)

| Field | State | Notes |
|---|---|---|
| `programDisplayName`, `participantDisplayName`, `legalInstrumentDisplayName` | Implemented; `programDisplayName` migrated in all investment-scoped call sites | See "Known pending hard-coded copy" below — the marketing/ecosystem/i18n/admin occurrences outside this initiative's scope remain, by explicit decision. |
| `publicFundingEnabled`, `publicRegistrationEnabled` | Implemented | Re-exported from `flags.ts`, the actual fail-closed exposure flags — not a second copy of that state. |
| `minimumAllocationCases` | Implemented | Reads `MIN_INVESTMENT_CASES` from `constants.ts`, the same value the server-side `create_investment_order` RPC enforces. Expressed in cases (cajas), not currency. |
| `maximumAllocationCases` | Implemented, always `null` | No commercial maximum has been decided — this is an *additional* undecided item, not one of the numbered `BR-*` decisions in `BUSINESS_MODEL.md`. Deliberately **not** env-configurable: neither `InvestmentCheckoutClient` (capped only at lot capacity) nor `create_investment_order` consult a maximum, so an override here would silently do nothing if set. Wire real enforcement through both the checkout UI and the RPC (a new migration) before adding one back. |
| `eligibilityRules` | Implemented, read-only | Describes rules already enforced authoritatively inside PostgreSQL `SECURITY DEFINER` RPCs (`SECURITY_MODEL.md`). This is documentation for UI/copy use — flipping these booleans would not change server behavior, so it is not a real "configuration" in the tunable sense. |
| `riskDisclosureText` | Implemented, wired into `/inversion/simulador` | The exact disclaimer text previously inline in that page, now centralized. Not yet wired into other places that show similar disclaimers (`InvestmentFooter.tsx` has its own, differently-worded, bilingual disclaimer — left as-is; unifying that copy is a separate, explicit decision, not bundled here). |
| `agreementType` | Not implemented, `null` | No contract-type concept exists in the product beyond the `agreement_accepted_at` timestamp column on `investment_participant_profiles`. Not a `CONFIRMED` business rule — never invent a value here (`PRODUCT_CONSTITUTION.md` §Stop conditions). |

## Known pending hard-coded copy

All investment-scoped occurrences of `programDisplayName`'s literal value
(`'CTG Craft Beer Inversión'`) have been migrated to import
`investmentConfig.programDisplayName`: `InvestmentFooter.tsx`,
`InvestmentCheckoutClient.tsx`, `InvestmentResumePaymentClient.tsx`,
`inversion/layout.tsx`, `inversion/legal/page.tsx`,
`inversion/como-funciona/page.tsx` — verified to produce byte-identical
rendered output (diff-reviewed, plus full `npm test`/typecheck/build).

Eight occurrences remain hard-coded **by explicit decision**, out of scope
for this initiative to touch without separate authorization (`CLAUDE.md` —
never modify existing marketing pages, or unrelated shared
components/data/i18n): `ServicesSection.tsx`, `InvestmentSpotlightSection.tsx`,
`ProductsCaseStudiesSection.tsx`, `ecosystem-processes.ts`,
`ecosystem-technology.ts`, `changelog/page.tsx`, `admin/roles/page.tsx`, and
`i18n/translations.ts`. `payment-qr.ts` and `flags.ts` also mention the name
but only inside source comments, not runtime UI copy — nothing to migrate
there. If these shared surfaces are ever brought into scope, `config.ts` is
the value they should import.

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
