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
- **Evaluación de permisos en RLS izada** (`0070_investment_rls_permission_hoisting.sql`) — 20 políticas RLS de `investment_*` llamaban una función de permisos (`is_investment_admin()`, `has_investment_permission('…')`) una vez **por fila candidata**. Envolverlas en `(select …)` las convierte en un InitPlan que Postgres evalúa una sola vez por consulta. Medido sobre 20.000 órdenes: leer filas propias no cambia (2,46 → 2,34 ms, el cortocircuito del `OR` ya saltaba la llamada), pero recorrer filas ajenas pasa de **76,5 ms a 2,8 ms (~27×)** — y ese es el caso que crece, porque a más participantes, mayor proporción de "filas que no son mías" en cada lectura. Cambio de frecuencia de evaluación, no de autorización: las cinco funciones son `STABLE` y ninguna recibe datos de fila. Probado por dos vías contra una base de referencia sin 0070: los predicados de las 44 políticas son idénticos tras normalizar el envoltorio, y la matriz de acceso (6 identidades × 12 tablas) da la misma visibilidad. El contrato de CI falla tanto si una política vuelve a evaluar por fila como si pierde su control de permisos.
- **Rail manual de cripto construido** (`0069_investment_manual_crypto_verification.sql`) — segundo rail *manual* junto al de Bancolombia, con la misma cadena de evidencia y la misma jerarquía de autoridad humana: `submit_investment_order_crypto_proof_server()` (solo `service_role`), `verify_investment_crypto_transfer()` (exige `finance.manage`, hash normalizado y único, red observada obligatoria, monto exacto) y `get_manual_crypto_verification_health()`. `guard_investment_payment_receipt()` se extendió de forma aditiva: la rama Bancolombia quedó intacta y todo lo que no sea uno de los dos rails manuales sigue fallando cerrado. Deliberadamente **sin** estado `PENDING_CRYPTO_VERIFICATION` — el rail se distingue por `payment_method`, evitando bifurcar la lista de estados reservados en 7+ funciones. Verificado contra una cadena real de 69 migraciones en Postgres local: los 11 smokes del Golden Path pasan y el nuevo `investment-manual-crypto-verification-smoke.sql` (ahora en CI) prueba el camino feliz y ocho rechazos fail-closed. Documentado en `MANUAL_CRYPTO_VERIFICATION.md`.
- **Agreement acceptance flow built** (`0068_investment_agreement_acceptance.sql`) — `accept_investment_agreement()` RPC (idempotent, audit-logged) plus a new fail-closed gate in `create_investment_order()` requiring `agreement_accepted_at is not null`, mirroring the existing KYC gate. `InvestmentCheckoutClient.tsx`'s existing risk checkbox now links to `/inversion/legal` and calls the RPC through the browser-repository boundary. Verified against a full local 68-migration Postgres run (not just static checks): all Golden Path CI smoke scripts pass, including the `security-definer-authorization-guard-smoke.sql` body-hash reconciliation (0 drift) and the reinvestment-blocked-order test (confirmed it still fails for capacity, not agreement, once fixtures were updated).

## Pendiente

### Sin bloqueo de negocio, pero no lista para codear directo

- **Menor:** el comentario en `src/app/api/investment/participant/withdrawals/route.ts`
  dice que `approve_withdrawal()`/`mark_withdrawal_paid()` "not built as
  a route yet" — falso, están construidos en
  `/admin/finance/rails` vía `initiate_investment_payout`/
  `confirm_investment_payout`. Comentario desactualizado, no un gap
  funcional; limpiar en el mismo cambio que toque ese archivo.

### Bloqueado por decisiones humanas/de negocio — no es tarea de ingeniería

- **`pse` sigue declarado en `InvestmentPaymentMethod` pero no se
  implementa, y esa es la decisión correcta.** Un rail manual exige que
  CTG pueda comprobar el movimiento por su cuenta: la transferencia
  Bancolombia se ve en el extracto y la transacción en cadena se ve en
  el explorador público. PSE no tiene equivalente — sin un agregador
  real no hay nada que Finanzas pueda abrir de forma independiente para
  confirmar el abono, y "verificarlo" sería creerle al comprobante, que
  es exactamente lo que toda la arquitectura de este módulo prohíbe.
  Implementarlo requiere primero contratar un agregador/proveedor, lo
  que lo devuelve al freno deliberado de ADR-010. No es trabajo
  pendiente de ingeniería: es una decisión comercial que no se ha
  tomado. `bre_b_qr` está en la misma situación.
- **Valores operativos reales del rail cripto** — la wallet de destino,
  la red y el activo se leen de
  `NEXT_PUBLIC_INVESTMENT_CRYPTO_{NETWORK,ASSET,ADDRESS}`. Mientras no
  estén configurados, el checkout ni siquiera ofrece la opción cripto y
  se comporta exactamente como hoy. Publicarlos es una decisión del
  negocio, no un cambio de código.
- **`BR-001..BR-005`** (`BUSINESS_MODEL.md`): cost scope, capital-recovery terms, loss treatment, lot-closing rule, unsold-inventory policy. These are the actual gate on `livePromotionEligible` — every engineering task above leaves the system exactly as conservative as today until someone with business/legal authority answers them. Nothing to build here; the architecture is already configurable and waiting.

### Bloqueado por uso real del producto — la herramienta ya existe, falta el evento que capturar

- **Evidencia operativa real** (Phase 19 pipeline, `npm run investment:evidence:*`): built and tested against synthetic fixtures only. Needs a real closed-beta lot cycle to observe before it can produce anything.
- **Canario de producción aceptado** (Phase 18/21, `verify-investment-production-readiness.mjs`): implemented and tested, but has never actually run post-deploy against the live Render service to populate `INVESTMENT_PRODUCTION_READINESS_CANARY`.

### Requiere autorización explícita — no se ha pedido, no se ha hecho

- **12 políticas RLS fuera del módulo con el mismo patrón por fila** — en
  `profiles`, `wallets`, `transactions`, `kyc_submissions`, `kyc_documents`,
  `knowledge_documents`, `knowledge_chunks` y `admin_audit_log`. Tienen la
  misma mejora disponible que las 20 ya corregidas en `0070` y el mismo
  argumento de seguridad (funciones `STABLE`, sin datos de fila), pero
  pertenecen al sistema de cuentas existente, que `CLAUDE.md` protege. La
  migración `0070` y su smoke sirven de plantilla exacta si se autoriza.
- **8 apariciones restantes de `'CTG Craft Beer Inversión'`** en `ServicesSection.tsx`, `InvestmentSpotlightSection.tsx`, `ProductsCaseStudiesSection.tsx`, `ecosystem-processes.ts`, `ecosystem-technology.ts`, `changelog/page.tsx`, `admin/roles/page.tsx`, `i18n/translations.ts`. Confirmed with the user during #171 to leave these untouched — they sit outside this initiative's scope per `CLAUDE.md`. `config.ts` is the value they'd import if this is ever explicitly authorized.

## Fuera de alcance

Per `PRODUCT_CONSTITUTION.md` and `CLAUDE.md`: no touching global styles,
existing marketing pages, the global Navbar/Footer, or the existing
accounts system without a separately authorized, explicitly scoped change
— and never inventing an answer to `BR-001..BR-005`. Any change here stays
additive under `src/app/inversion/**`, `src/app/api/investment/**`, and new
`supabase/migrations/000N_investment_*.sql` files.
