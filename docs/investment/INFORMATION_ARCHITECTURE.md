# Information Architecture — CTG Craft Beer Inversión

Status: **IMPLEMENTED**

This describes the routes as actually built. The original Day-1 plan (kept
below in "How this diverged from the original plan") assumed a fully
separate `/inversion/app/*` and `/inversion/admin/*` route tree mirroring
every participant/admin function as its own page. That is not what was
built — see below for why. For the exact live route list, `npm run build`'s
output is authoritative; this file is a reading aid.

## Public routes (`src/app/inversion/**`)

```
/inversion                     landing
/inversion/como-funciona
/inversion/lotes                marketplace listing
/inversion/lotes/[slug]         lot detail (public view)
/inversion/simulador            investment simulator (illustrative only)
/inversion/riesgos
/inversion/legal
```

`/inversion/preguntas-frecuentes` and a dedicated `/inversion/login` /
`/inversion/registro` redirect pair from the original plan were never
built as separate routes — the CTAs on the public pages link directly to
the shared `/iniciar-sesion` and `/registro` with a `next=` return path,
which does the same job with one fewer redirect hop.

## Participant surface (`src/app/inversion/app/**`, session required)

```
/inversion/app                  single dashboard page: profile/KYC status,
                                 order history, liquidity (balance/withdraw),
                                 reinvestment, and a value-tracking chart —
                                 as panels/components, not separate routes
/inversion/app/nueva/[slug]      start a new order against one lot
```

`/dashboard/inversion` and `/dashboard/inversion/nueva/[slug]` (the old
planned locations, under the shared CTG One dashboard) still exist only as
redirects to `/inversion/app` and `/inversion/app/nueva/[slug]`
respectively, for backward-compatible links — they are not a second
implementation.

The originally planned `/inversion/app/lotes`, `/inversion/app/inversiones`,
`/inversion/app/movimientos`, `/inversion/app/rendimientos`,
`/inversion/app/wallet`, `/inversion/app/retiros`,
`/inversion/app/reinversion`, `/inversion/app/documentos`,
`/inversion/app/perfil`, `/inversion/app/seguridad` were consolidated into
that one dashboard page (`InvestmentLiquidityPanel`,
`InvestmentReinvestmentPanel`, `InvestmentTrackingChart`, etc.) instead of
being built as ten separate routes.

## Admin/operations surfaces

```
/inversion/admin                 lot creation + status transitions
/inversion/admin/orders          order/payment-verification review
```

Everything else the original plan put under a separate `/inversion/admin/*`
tree (`participants`, `production`, `inventory`, `sales`, `allocations`,
`finance`, `settlements`, `withdrawals`, `reinvestments`, `documents`,
`audit`, `configuration`) instead lives inside the **shared, cross-business
Admin OS** at `/admin/*`, alongside the equivalent Sales OS/Production OS
surfaces for the rest of CTG One:

```
/admin/kyc                          KYC review (shared, all business lines)
/admin/depositos                    deposit approval (shared)
/admin/roles, /admin/usuarios       shared RBAC/user administration
/admin/finance/reinvestment         Finance OS reinvestment queue (Phase 16)
/admin/finance/rails                payment rails
/admin/finance/reconciliation       provider/bank reconciliation
/admin/operations/overview          production/inventory/sales overview
/admin/operations/inventory         inventory reconciliation
/admin/operations/journey           Operational Golden Journey view
/admin/operations/labels            bottle-unit/serialization labels
/admin/operations/returns           sales returns/credit notes
/admin/operations/scanner           bottle-unit scan workflow
/admin/operations/settlement        settlement finalization
/admin/release-readiness            SUPER_ADMIN release gate matrix (Phase 20)
/admin/system-health                shared deployment/schema health
```

This is a deliberate architectural choice, not an oversight: Investment
operations reuse the same Admin OS, RBAC, and audit conventions as every
other CTG One business line instead of duplicating an entire second admin
shell. `docs/investment/SECURITY_MODEL.md`'s investment-specific roles
(`FINANCE_ADMIN`, `PRODUCTION_MANAGER`, etc.) still gate access to each
surface — they are just not expressed as a separate URL namespace.

## Other investment-related routes

```
/beer/[serial]                  public bottle-unit traceability page
                                 (not in the original plan)
/api/investment/readiness       public-safe deployment readiness probe
/api/investment/payment-qr
/api/investment/orders/[orderId]/payment-proof
/api/investment/participant/withdrawals
/api/investment/admin/lots
/api/investment/admin/lots/[id]/transition
/api/investment/admin/finance/events/import
```

## Global navigation

The existing site's `Navbar`/`Footer` are **not** modified by this
initiative (ADR-012). Adding "Inversión" to the global nav remains a
separate, explicit decision, not bundled into any Investment PR.

## How this diverged from the original plan

The Day-1 information architecture assumed one route per function, mirrored
identically between participant and admin surfaces. What actually shipped
is flatter: richer single-page dashboards with internal panels for the
participant side, and reuse of the shared Admin OS for operations, instead
of a second parallel admin tree. Both choices reduce duplicated shell/RBAC
code and keep Investment's operational surfaces consistent with the rest of
CTG One Technology — see `docs/investment/EXISTING_SITE_INTEGRATION.md`
§"Shared capabilities intentionally reused". Treat this file, not the
original plan, as current; see `docs/investment/ROADMAP.md` for what's
still outstanding.
