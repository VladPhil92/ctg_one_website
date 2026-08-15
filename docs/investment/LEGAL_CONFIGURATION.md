# Legal Configuration — CTG Craft Beer Inversión

Legal/commercial terminology must remain configurable, not embedded as
irreversible technical naming or hard-coded UI copy, because several
classifications are explicitly unresolved (see `BUSINESS_MODEL.md`
§Pending Business Decisions).

## Configuration surface (planned — `src/lib/investment/config.ts`)

`programDisplayName`, `participantDisplayName`, `legalInstrumentDisplayName`,
`publicFundingEnabled`, `publicRegistrationEnabled`, `eligibilityRules`,
`minimumAllocation`, `maximumAllocation`, `riskDisclosureText`,
`agreementType`.

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
simulator (`/inversion/simulador`): projected values are estimates and do
not constitute guaranteed returns; authoritative settlement depends on
actual sales, costs, taxes, and applicable contractual rules.
