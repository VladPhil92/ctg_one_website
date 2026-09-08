# CTG One Technology

**Software, Data & Digital Infrastructure for the CTG One Business Ecosystem**

CTG One Technology es la capa propietaria de software, datos e infraestructura digital que soporta el ecosistema empresarial CTG One. Diseña, construye y opera aplicaciones, plataformas transaccionales, identidad, automatización, seguridad e infraestructura compartida aplicadas directamente a unidades de negocio reales.

Su diferenciador es la integración vertical: la tecnología se desarrolla dentro del mismo ecosistema donde se utiliza, mide y mejora.

> **Gobernanza:** este README explica el proyecto, pero no es una base de datos de estado runtime. El mapa de autoridades vive en `docs/architecture/SYSTEM_STATE.md`; el índice documental está en `docs/README.md`; y el procedimiento para comprobar coherencia entre GitHub, Render, runtime y web pública está en `docs/infrastructure/PRODUCTION_REPOSITORY_PARITY.md`.

## Modelo operativo

```text
Necesidad real del negocio
        ↓
Diseño de sistema
        ↓
Desarrollo de software
        ↓
Despliegue productivo
        ↓
Datos operacionales
        ↓
Medición y auditoría
        ↓
Iteración
```

## Stack actual

- **Framework/runtime:** versiones autoritativas en `package.json`.
- **Frontend / Full-stack:** Next.js + React + TypeScript.
- **Backend / Database:** Supabase — PostgreSQL, Auth y Storage.
- **Session / SSR:** `@supabase/ssr`.
- **Validation:** Zod.
- **Data:** TanStack React Query donde aplica.
- **AI:** CTG Knowledge bajo gobernanza de madurez y evidencia.
- **Web3:** capacidades gobernadas por evidencia; la presencia de SDKs o UI no prueba un despliegue on-chain productivo.
- **Payments:** integraciones con órdenes server-authoritative y settlement verificado donde aplica.
- **Production hosting:** Render Web Service.
- **Source control / CI:** GitHub + GitHub Actions.
- **Browser E2E:** Playwright / Chromium.

El proyecto requiere runtime Node. No es un static export.

## Arquitectura de entrega

```text
branch
  ↓
Pull Request
  ↓
GitHub Actions
(invariants + audit + lint + typecheck + build + E2E + Golden Paths)
  ↓
main
  ↓
Render Web Service
  ↓
ctgone.com
  ↓
Supabase + proveedores externos verificados
```

Antes de fusionar una rama debe sincronizarse con el `main` más reciente y revisarse el delta final. Si una fase ya fue absorbida por trabajo posterior y el PR queda sin diferencias, debe cerrarse como **superseded** en vez de fabricar un merge.

## Coherencia producción ↔ repositorio

CTG One distingue dos tipos de paridad:

1. **Paridad de código:** el SHA desplegado en Render debe coincidir con el SHA de release esperado en GitHub.
2. **Paridad semántica:** la web pública debe describir el sistema con los mismos estados y límites de evidencia que las fuentes técnicas autoritativas.

Un despliegue puede tener el SHA correcto y aun así publicar un claim obsoleto si una UI mantiene una copia manual de un estado. Por eso el estado `live` de Render no sustituye la verificación de contenido y evidencia.

El procedimiento completo está en `docs/infrastructure/PRODUCTION_REPOSITORY_PARITY.md` e incluye:

```text
GitHub main SHA
↔ Render deployed SHA
↔ /api/health + runtime schema
↔ /technology/status
↔ homepage / public product surfaces
```

### Regla de madurez pública

La **única fuente autoritativa de madurez técnica pública** es `src/data/technology-proof.ts`.

Los estados públicos permitidos son:

- `LIVE`
- `BETA`
- `PARTIAL`
- `IN DEVELOPMENT`
- `ROADMAP`

Cuando un servicio de `src/config/dashboard-services.ts` corresponde a una capacidad ya registrada en `technology-proof.ts`, su estado debe derivarse mediante `getCapabilityProof(...)` y `getPublicProofStatus(...)`. El directorio puede poseer navegación, copy y estados de UX como `ACCOUNT`, pero no una segunda clasificación técnica independiente.

Una capacidad no pasa a `LIVE` por existir una pantalla, dependencia, contrato de interfaz o prototipo. La superficie pública de evidencia vive en `/technology/status`.

## Ecosistema empresarial

CTG One Technology opera como capa tecnológica común para las unidades definidas canónicamente en `src/data/content.ts`. Su pertenencia al ecosistema no implica el mismo nivel de madurez digital; cada capacidad se clasifica por evidencia.

La interoperabilidad entre CTG One, CTG Wallet, Nvet Care, VÉRTICE y otras superficies se gobierna mediante contratos explícitos de identidad, autoridad, capacidades y compatibilidad. No se exige que todos los productos utilicen el mismo framework si sus límites de integración permanecen compatibles y fail-closed.

## Bounded contexts principales

### Identity / Account / KYC

Supabase Auth, perfiles, KYC, documentos privados, rutas protegidas, administración y límites de assurance/federation. Una inconsistencia en identidad debe fallar cerrada y nunca convertirse en una afirmación de verificación.

### Wallet / Saldo CTG

CTG One mantiene la autoridad de identidad y del saldo COP consumido por las superficies Wallet bajo el contrato vigente. El dominio usa ledger/journal server-side; el navegador no puede crear créditos, débitos o conciliaciones autoritativas.

```text
Identidad + KYC
→ evidencia de pago
→ verificación administrativa
→ conciliación
→ ledger canónico
→ Wallet balance / activity
```

### CTG Craft Beer Investment

Órdenes de inversión, asignaciones, lotes, economía unitaria, trazabilidad, inventario, Sales OS, hechos financieros, participant ledger, settlement, withdrawals/reinvestment y RBAC. Su release stage público se deriva de `src/data/technology-proof.ts` y no de la mera existencia de la plataforma.

### JP Valderrama Education / Campus / Learning Center

Incluye presencia pública, Talks, Ideas, Books, Projects, Campus, Learning Center, learner dashboard, cursos, lecciones, progreso, assessments, administración, comercio y entitlements.

Las ofertas de precio fijo usan compra inmediata:

```text
precio publicado
→ orden fijada por servidor
→ checkout
→ verificación del proveedor
→ settlement
→ entitlement
```

La cotización queda reservada para servicios genuinamente personalizados sin precio publicado.

### CTG Knowledge / AI

Capacidad gobernada de conocimiento institucional con ingestión, retrieval, control de acceso, evaluación y provider integration. La madurez y cualquier promoción a `LIVE` permanecen condicionadas por evidencia reproducible.

### Nvet Care federation

`Nvet-Care-App` conserva la autoridad sobre roles veterinarios, mascotas, citas, servicios, chat, reviews y lógica veterinaria. CTG One aporta identidad e integración únicamente dentro del contrato federado.

### VÉRTICE federation

La federación es server-to-server, con claims mínimos, autenticados, validados y fail-closed. Una sesión CTG One no amplía por sí sola permisos en VÉRTICE.

### Observability / Security / Operations

- `/api/health`.
- Admin System Health.
- runtime/schema compatibility.
- deployment identity por SHA.
- structured logging con redacción de datos sensibles.
- request/correlation IDs.
- CSP y security headers.
- rate limiting y límites server-side donde aplica.
- recovery, clean-database y Golden Path contracts en CI.

## Rutas principales

| Ruta | Propósito |
|---|---|
| `/` | Home corporativo y directorio de productos |
| `/about` | Naturaleza y modelo tecnológico |
| `/services` | Technology capabilities |
| `/ecosystem` | Ecosistema empresarial |
| `/products` | Productos / case studies |
| `/technology/status` | Registro público de madurez y evidencia |
| `/wallet` | Presentación pública de Wallet |
| `/nvetcareapp` | Superficie web federada de Nvet Care |
| `/ai` | Arquitectura y desarrollo de IA |
| `/knowledge` | CTG Knowledge |
| `/rewards` | CTG Rewards según estado publicado |
| `/token` y `/ctgotoken` | CTGO/Web3 según estado publicado |
| `/jpvalderrama` | Plataforma pública JP Valderrama |
| `/jpvalderrama/campus` | Campus y catálogo educativo |
| `/jpvalderrama/learningcenter` | Learning Center |
| `/dashboard` | Personal OS protegido |
| `/dashboard/wallet` | Wallet integrada |
| `/dashboard/depositos` | Recarga manual + evidencia + conciliación |
| `/dashboard/inversion` | Investment experience integrada |
| `/dashboard/educacion` | Learner / education dashboard |
| `/admin` | Admin OS protegido |
| `/admin/operations` | Production / Traceability / Sales OS |
| `/admin/system-health` | Diagnóstico técnico administrativo |
| `/inversion` | CTG Craft Beer Investment público |
| `/beer/[serial]` | Trazabilidad pública por unidad |

## Supabase migrations

La secuencia autoritativa vive en `supabase/migrations/`. El release esperado se define en `src/lib/observability/schema-version.ts` mediante:

- `EXPECTED_DATABASE_MIGRATION`
- `EXPECTED_DATABASE_MIGRATION_NAME`
- `EXPECTED_DATABASE_MIGRATION_COUNT`

La presencia de una migración en Git no prueba que esté aplicada en producción. La compatibilidad runtime se valida con `/api/health` y Admin System Health. Las migraciones aplicadas son inmutables: cualquier corrección se agrega como una nueva migración contigua.

## Principios operacionales

- PostgreSQL y servicios server-side son autoridad de hechos financieros y operacionales.
- Los cambios consecuenciales son idempotentes y auditables.
- El cliente puede restringir una capability, pero nunca ampliarla por encima del contrato del servidor.
- Ninguna UI puede fabricar settlement, hash, provider confirmation o transacción confirmada.
- Correcciones financieras mediante reversals/adjustments, no hard delete.
- La madurez pública sigue evidencia canónica, no copy de marketing.
- Claims on-chain requieren evidencia trazable antes de ser presentados como producción verificada.

## Seguridad

Arquitectura base:

- Supabase Auth.
- RLS.
- server-side authorization.
- RBAC por dominio donde aplica.
- funciones `SECURITY DEFINER` con comprobaciones explícitas.
- Storage privado + signed URLs para documentos sensibles.
- feature flags y canales financieros fail-closed.
- CSP y headers de seguridad.
- dependency audit en CI.
- federation claims mínimos y server-to-server.

No se realizan afirmaciones de certificaciones sin evidencia formal.

## CI

La definición autoritativa vive en `.github/workflows/ci.yml` y `package.json`. El contrato incluye, entre otros:

```bash
npm test
npm run audit:critical
npm run lint
npx tsc --noEmit
npm run build
npx playwright test --project=chromium
```

`npm test` incorpora invariantes especializados de seguridad, finanzas, Wallet, Investment, Education, observabilidad, madurez pública y documentación. `scripts/test-public-maturity-coherence-invariants.mjs` evita que los estados públicos auditados vuelvan a divergir de `technology-proof.ts`.

## Desarrollo local

```bash
npm ci
npm run dev
```

Las pruebas E2E tienen documentación específica en `docs/infrastructure/E2E_TESTING.md`.

## Variables de entorno base

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=https://ctgone.com
```

Proveedores específicos pueden requerir variables adicionales documentadas en `.env.local.example` y sus runbooks. Nunca almacenar secretos productivos en Git.

## Fuentes autoritativas

| Tema | Fuente |
|---|---|
| Mapa de autoridades | `docs/architecture/SYSTEM_STATE.md` |
| Índice documental | `docs/README.md` |
| Arquitectura compartida | `docs/architecture/CTG_ONE_OS.md` |
| Contratos cross-product | `docs/architecture/ECOSYSTEM_CONTRACT_REGISTRY.md` + `docs/federation/` |
| Producción ↔ repositorio | `docs/infrastructure/PRODUCTION_REPOSITORY_PARITY.md` |
| Production readiness | `docs/infrastructure/PRODUCTION_READINESS.md` |
| Recovery | `docs/infrastructure/BACKUP_RESTORE.md` |
| Observability | `docs/infrastructure/OBSERVABILITY.md` |
| Madurez pública | `src/data/technology-proof.ts` |
| Release de DB esperado | `src/lib/observability/schema-version.ts` |
| Dependencias y scripts | `package.json` |

## Higiene del repositorio

- Los audits de fase son históricos, no autoridades runtime.
- No se duplican registries de migraciones o madurez en Markdown o componentes de presentación.
- Los PRs deben revisarse contra el último `main` antes del merge.
- Un PR con delta final vacío se considera superseded.
- Después de resolver conflictos se inspeccionan duplicaciones antes de depender del CI.
- Después de cada release se verifica SHA de GitHub contra Render y luego paridad semántica de las superficies públicas.
