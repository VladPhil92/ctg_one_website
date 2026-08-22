# Investment Roadmap — Work Plan Snapshot

Status: **SNAPSHOT — NOT A RUNTIME AUTHORITY**

This is a living work plan for CTG Craft Beer Inversión. Like
`docs/architecture/REPOSITORY_AUDIT_CURRENT.md`, it will drift as work
lands — that's expected, not a defect. For live facts, always defer to
`docs/architecture/SYSTEM_STATE.md`'s source-of-truth registry
(`src/data/technology-proof.ts` for capability maturity,
`docs/investment/RELEASE_GATE_MATRIX.md` for release eligibility,
`docs/investment/BUSINESS_MODEL.md` for business-rule status).

**Structure:** "Completado" is a compressed changelog — one line per item,
PR reference, done. "Pendiente" is grouped by *why* it's not done, because
that determines who acts on it next: an engineering task, a human decision,
or real-world usage that hasn't happened yet. Don't let completed items grow
back into long paragraphs here — the PR history is the detailed record;
this file's job is to say what's left and why.

Originating audit: 2026-08-22. Last updated: 2026-08-22 (added the
code-level technical-gap findings below, independent of the original
doc/config audit).

## Completado

Everything below shipped, passed the full `npm test` (50 suites) +
typecheck + build gate, and is merged to `main`.

- **Phase 21 canary evidence** (#166) — versioned, SHA-bound production-readiness artifacts; release governance unaffected.
- **`TESTING_STRATEGY.md` rewritten** (#168) — described a pre-test-suite repo; now documents the real ~50 invariant scripts + 7 Playwright specs.
- **`DOMAIN_MODEL.md` rewritten** (#168) — described an unimplemented "target model"; now documents the real 32 `investment_*` tables and their RPCs.
- **`INFORMATION_ARCHITECTURE.md` rewritten** (#169) — planned a route tree that was never built that way; now documents the real routes and *why* they diverged (shared Admin OS reuse, not a gap).
- **`src/lib/investment/config.ts` built** (#170) — the legal/commercial config surface `LEGAL_CONFIGURATION.md` had called "planned" since before the domain milestone. A Codex review caught `maximumAllocationCases` as unenforced env-configurable dead weight; fixed same-PR by removing the fake override rather than half-wiring enforcement into a financial RPC.
- **`programDisplayName` migrated in investment-scoped files** (#171) — 6 files now import `investmentConfig.programDisplayName` instead of a repeated literal; byte-identical rendered output, diff-verified.
- **Agreement acceptance flow built** (`0068_investment_agreement_acceptance.sql`) — `accept_investment_agreement()` RPC (idempotent, audit-logged) plus a new fail-closed gate in `create_investment_order()` requiring `agreement_accepted_at is not null`, mirroring the existing KYC gate. `InvestmentCheckoutClient.tsx`'s existing risk checkbox now links to `/inversion/legal` and calls the RPC through the browser-repository boundary. Verified against a full local 68-migration Postgres run (not just static checks): all Golden Path CI smoke scripts pass, including the `security-definer-authorization-guard-smoke.sql` body-hash reconciliation (0 drift) and the reinvestment-blocked-order test (confirmed it still fails for capacity, not agreement, once fixtures were updated).

## Pendiente

### Sin bloqueo de negocio, pero no lista para codear directo

- **`pse` y `crypto` están declarados en `InvestmentPaymentMethod` pero
  no implementados** — el checkout solo ofrece `bank_transfer` (QR
  Bancolombia + comprobante verificado a mano). **Necesita una decisión
  de alcance antes de codear:** si se implementan como otro rail
  *manual* (el participante paga por esa vía y un admin verifica, como
  hoy) caen fuera de `paymentGatewayEnabled`/ADR-010 y son tan
  construibles como el punto anterior; si implican una integración con
  un proveedor real (confirmación automática de PSE, custodia de
  cripto), entonces sí caen bajo el mismo freno deliberado de ADR-010
  que `paymentGatewayEnabled` — construirlas antes de esa señal
  repetiría el error que ADR-010 previene. Confirmar cuál de los dos
  antes de empezar.
- **Menor:** el comentario en `src/app/api/investment/participant/withdrawals/route.ts`
  dice que `approve_withdrawal()`/`mark_withdrawal_paid()` "not built as
  a route yet" — falso, están construidos en
  `/admin/finance/rails` vía `initiate_investment_payout`/
  `confirm_investment_payout`. Comentario desactualizado, no un gap
  funcional; limpiar en el mismo cambio que toque ese archivo.

### Bloqueado por decisiones humanas/de negocio — no es tarea de ingeniería

- **`BR-001..BR-005`** (`BUSINESS_MODEL.md`): cost scope, capital-recovery terms, loss treatment, lot-closing rule, unsold-inventory policy. These are the actual gate on `livePromotionEligible` — every engineering task above leaves the system exactly as conservative as today until someone with business/legal authority answers them. Nothing to build here; the architecture is already configurable and waiting.

### Bloqueado por uso real del producto — la herramienta ya existe, falta el evento que capturar

- **Evidencia operativa real** (Phase 19 pipeline, `npm run investment:evidence:*`): built and tested against synthetic fixtures only. Needs a real closed-beta lot cycle to observe before it can produce anything.
- **Canario de producción aceptado** (Phase 18/21, `verify-investment-production-readiness.mjs`): implemented and tested, but has never actually run post-deploy against the live Render service to populate `INVESTMENT_PRODUCTION_READINESS_CANARY`.

### Requiere autorización explícita — no se ha pedido, no se ha hecho

- **8 apariciones restantes de `'CTG Craft Beer Inversión'`** en `ServicesSection.tsx`, `InvestmentSpotlightSection.tsx`, `ProductsCaseStudiesSection.tsx`, `ecosystem-processes.ts`, `ecosystem-technology.ts`, `changelog/page.tsx`, `admin/roles/page.tsx`, `i18n/translations.ts`. Confirmed with the user during #171 to leave these untouched — they sit outside this initiative's scope per `CLAUDE.md`. `config.ts` is the value they'd import if this is ever explicitly authorized.

## Fuera de alcance

Per `PRODUCT_CONSTITUTION.md` and `CLAUDE.md`: no touching global styles,
existing marketing pages, the global Navbar/Footer, or the existing
accounts system without a separately authorized, explicitly scoped change
— and never inventing an answer to `BR-001..BR-005`. Any change here stays
additive under `src/app/inversion/**`, `src/app/api/investment/**`, and new
`supabase/migrations/000N_investment_*.sql` files.
