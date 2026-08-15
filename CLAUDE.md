# CLAUDE.md

Repository-wide guidance for working on `ctgone.com`.

## CTG Craft Beer Inversión

A new, isolated capability living at `/inversion` inside this same site,
for Cervecería Cartagena S.A.S. / CTG Craft Beer's production-lot investment
program. Full documentation: `docs/investment/` (start with
`PRODUCT_CONSTITUTION.md`, `EXISTING_SITE_INTEGRATION.md`, and the ADRs in
`docs/investment/adr/`).

### NEVER

- Never rebuild, redesign, or migrate the existing `ctgone.com` site.
- Never refactor or reformat code unrelated to the change at hand.
- Never change global styles (`tailwind.config.ts`, `src/app/globals.css`)
  or existing CTG branding/logos for this initiative.
- Never modify the global `Navbar`/`Footer`, existing marketing pages
  (`/`, `/about`, `/ecosystem`, `/services`, `/rewards`, `/token`,
  `/contact`), or the existing accounts system
  (`AuthContext`, `/registro`, `/iniciar-sesion`, `/dashboard`,
  `supabase/migrations/0001-0003*.sql`) except through a separately
  authorized, explicitly scoped change.
- Never invent business rules or financial formulas — see
  `docs/investment/BUSINESS_MODEL.md` §Pending Business Decisions.
- Never hard-delete financial records (ledger, settlements, withdrawals,
  reinvestments, audit log) — lifecycle states and reversals only.
- Never bypass the append-only ledger or the production-lot state machine
  with a direct table write.
- Never mutate a finalized settlement.
- Never use floating-point for money — integer COP cents everywhere.
- Never expose one participant's data to another.
- Never write guaranteed-return marketing language ("rentabilidad
  garantizada", "50% de retorno", "riesgo cero").
- Never rename existing environment variables; new investment variables are
  `CTG_INVESTMENT_*`-namespaced.

### ALWAYS

- Read `docs/investment/EXISTING_SITE_INTEGRATION.md` and the relevant ADRs
  before touching anything under this initiative.
- Keep new code under `src/app/inversion/**`, `src/app/api/investment/**`,
  and additive `supabase/migrations/0004_investment_*.sql` — isolated from
  existing routes/tables (ADR-000, ADR-001).
- Keep authoritative financial calculations server-side, inside
  `SECURITY DEFINER` Postgres functions that re-check authorization
  themselves (mirrors the existing `approve_deposit`/`approve_kyc` pattern).
- Run `npm run build` and a headless-browser check of the existing protected
  routes before considering a change to this initiative done (see
  `docs/investment/TESTING_STRATEGY.md`).
- Keep diffs scoped to the task — small, reviewable PRs, not one giant pass.
