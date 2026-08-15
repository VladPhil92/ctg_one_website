# Information Architecture — CTG Craft Beer Inversión

## Public routes (`src/app/inversion/**`)

```
/inversion                     landing
/inversion/como-funciona
/inversion/lotes                marketplace listing
/inversion/lotes/[slug]         lot detail (public view)
/inversion/simulador            investment simulator (illustrative only)
/inversion/preguntas-frecuentes
/inversion/riesgos
/inversion/legal
/inversion/login                → reuses existing CTG One auth (ADR-011);
                                   this route redirects into the shared
                                   /iniciar-sesion with a return path back
                                   to /inversion/app
/inversion/registro             → same pattern, reuses /registro
```

## Participant routes (`src/app/inversion/app/**`, session required)

```
/inversion/app                  dashboard
/inversion/app/lotes
/inversion/app/lotes/[id]
/inversion/app/inversiones
/inversion/app/movimientos
/inversion/app/rendimientos
/inversion/app/wallet
/inversion/app/retiros
/inversion/app/reinversion
/inversion/app/documentos
/inversion/app/perfil
/inversion/app/seguridad
```

## Admin routes (`src/app/inversion/admin/**`, investment admin role required)

```
/inversion/admin
/inversion/admin/dashboard
/inversion/admin/participants
/inversion/admin/participants/[id]
/inversion/admin/lots
/inversion/admin/lots/[id]
/inversion/admin/production
/inversion/admin/inventory
/inversion/admin/sales
/inversion/admin/allocations
/inversion/admin/finance
/inversion/admin/settlements
/inversion/admin/withdrawals
/inversion/admin/reinvestments
/inversion/admin/documents
/inversion/admin/audit
/inversion/admin/configuration
```

## Global navigation

The existing site's `Navbar`/`Footer` are **not** modified by this
initiative (ADR-012, brief §49). Adding "Inversión" to the global nav is a
separate, explicit future decision once `/inversion` has real content behind
it — not bundled into this PR.

## Current implementation status

This PR ships: `/inversion` (landing), `/inversion/como-funciona`,
`/inversion/lotes` (marketplace with one demo lot),
`/inversion/lotes/[slug]` (demo lot detail), `/inversion/simulador`,
`/inversion/app` (dashboard shell, demo data), `/inversion/admin`
(dashboard shell, demo data). Login/registro reuse the existing
`/iniciar-sesion`/`/registro`. Remaining routes above are recommended next
milestones, not yet built (see final report `NEXT TASK`).
