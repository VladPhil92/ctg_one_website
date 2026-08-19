# CTG One Technology

**Software, Data & Digital Infrastructure for the CTG One Business Ecosystem**

CTG One Technology es la capa propietaria de software, datos e infraestructura digital que soporta el ecosistema empresarial CTG One. Diseña, construye y opera aplicaciones, plataformas transaccionales, identidad, automatización, seguridad e infraestructura compartida aplicadas directamente a unidades de negocio reales.

Su diferenciador es la integración vertical: la tecnología se desarrolla dentro del mismo ecosistema donde se utiliza, mide y mejora.

> **Gobernanza:** este README explica el proyecto, pero no es una base de datos de estado runtime. Para saber dónde vive cada fuente autoritativa consulte `docs/architecture/SYSTEM_STATE.md`.

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

- **Framework/runtime:** versiones autoritativas en `package.json`
- **Backend / Database:** Supabase — PostgreSQL, Auth y Storage
- **Session / SSR:** `@supabase/ssr`
- **Validation:** Zod
- **Data:** TanStack React Query donde aplica
- **AI:** CTG Knowledge como beta controlada; la capa general de IA permanece gobernada por su estado de madurez
- **Web3:** librerías presentes; CTGO permanece ROADMAP hasta existir evidencia productiva verificable
- **Production hosting:** Render Web Service
- **Source control / CI:** GitHub + GitHub Actions
- **Browser E2E:** Playwright / Chromium

El proyecto requiere runtime Node. No es un static export.

## Arquitectura de entrega

```text
branch
  ↓
Pull Request
  ↓
GitHub Actions
(invariants + dependency audit + typecheck + build + browser E2E + clean database contract)
  ↓
main
  ↓
Render Web Service
  ↓
ctgone.com
  ↓
Supabase
PostgreSQL · Auth · Storage · RLS
```

## Ecosistema empresarial

CTG One Technology opera como capa tecnológica común para las unidades del ecosistema definidas de forma canónica en `src/data/content.ts`. Estas unidades constituyen entornos reales de aplicación y validación tecnológica. Su pertenencia al ecosistema no implica el mismo nivel de madurez digital; cada capacidad se clasifica por evidencia.

## Modelo de madurez

La fuente autoritativa de madurez pública es `src/data/technology-proof.ts`. Los estados públicos contemplan:

- `LIVE`
- `BETA`
- `PARTIAL`
- `IN DEVELOPMENT`
- `ROADMAP`

Una capacidad no pasa a `LIVE` por existir una descripción, dependencia, pantalla o prototipo. La superficie pública de evidencia vive en `/technology/status`.

## Dominios actuales

### Identity / Account

- Supabase Auth
- perfiles
- KYC
- documentos privados
- wallet/account transactions
- rutas protegidas
- administración y auditoría

### CTG Craft Beer Investment

Bounded context para órdenes de inversión, asignaciones económicas, lotes de producción, economía unitaria, master data cervecera, trazabilidad por botella, inventario canónico, Sales OS, hechos financieros, participant ledger, settlement, withdrawals/reinvestment, RBAC y trazabilidad pública por serial.

La plataforma pública se mantiene bajo el release stage definido por `src/data/technology-proof.ts`; no debe inferirse `LIVE` de la existencia del bounded context.

### CTG Knowledge

Beta controlada de conocimiento institucional con ingestión, chunking, retrieval, control de acceso y provider integration. Debe mantenerse bajo política de evidencia, evaluación y seguridad antes de promoción a `LIVE`.

### Observability

- `/api/health`
- Admin System Health
- structured logger con redacción de campos sensibles
- verificación de runtime/configuración/migraciones críticas
- identidad de deployment por SHA de Render
- request/correlation ID validado y propagado en superficies instrumentadas

## Rutas principales

| Ruta | Propósito |
|---|---|
| `/` | Home corporativo |
| `/about` | Naturaleza y modelo tecnológico |
| `/services` | Technology capabilities |
| `/ecosystem` | Ecosistema empresarial |
| `/products` | Productos / case studies |
| `/technology/status` | Registro público de madurez y evidencia |
| `/ai` | Arquitectura y desarrollo de IA |
| `/knowledge` | CTG Knowledge beta |
| `/rewards` | CTG Rewards roadmap |
| `/token` | CTGO Web3 roadmap |
| `/dashboard` | Personal OS protegido |
| `/dashboard/inversion` | Investment experience integrada |
| `/admin` | Admin OS protegido |
| `/admin/operations` | Production / Traceability / Sales OS |
| `/admin/system-health` | Diagnóstico técnico administrativo |
| `/inversion` | CTG Craft Beer Investment público |
| `/inversion/simulador` | Escenarios derivados de snapshots de lotes publicados |
| `/beer/[serial]` | Trazabilidad pública por unidad |

## Supabase migrations

La secuencia autoritativa vive en `supabase/migrations/` y el release esperado se define en `src/lib/observability/schema-version.ts` mediante:

- `EXPECTED_DATABASE_MIGRATION`
- `EXPECTED_DATABASE_MIGRATION_NAME`
- `EXPECTED_DATABASE_MIGRATION_COUNT`

CI valida continuidad de la cadena, aplica todas las migraciones sobre una base PostgreSQL limpia y ejecuta contratos de Golden Path y seguridad. La presencia de una migración en Git no prueba por sí sola que esté aplicada en un entorno; la compatibilidad de producción debe verificarse mediante `/api/health` y Admin System Health.

Las migraciones aplicadas son inmutables. Una corrección de schema se realiza mediante una nueva migración contigua, nunca reescribiendo historia ya desplegada.

## Principios financieros y operacionales

- dinero representado en centavos enteros (`bigint`) cuando aplica
- snapshots económicos históricos por lote
- participant ledger append-only
- settlement único y reconciliado por lote
- revenue/tax vinculados a Sales OS
- correcciones mediante reversals/adjustments, no hard delete
- liquidación basada en hechos reconciliados, no proyecciones de UI
- botella serializada como unidad física mínima trazable
- ubicación canónica e historia de movimientos append-only
- `SOLD` originado desde Sales OS con vínculo verificable
- operaciones sensibles mediante funciones server-side/database-side con autorización revalidada

## Seguridad

Arquitectura base:

- Supabase Auth
- RLS
- server-side authorization
- RBAC del dominio inversión
- funciones `SECURITY DEFINER` con comprobaciones explícitas
- Storage privado + signed URLs para documentos sensibles
- feature flags y canales financieros fail-closed
- CSP y headers de seguridad
- rate limiting en superficies sensibles instrumentadas
- dependency audit en CI
- PR + required checks antes de merge

No se realizan afirmaciones de certificaciones sin evidencia formal.

## CI

La definición autoritativa vive en `.github/workflows/ci.yml` y `package.json`. Incluye, entre otros:

```bash
npm test
npm run audit:critical
npx tsc --noEmit
npm run build
npx playwright test --project=chromium
```

Además existe un job de **Golden Path clean database contract** que reconstruye el schema desde cero y valida contratos PostgreSQL críticos.

## Desarrollo local

```bash
npm ci
npm run dev
```

Las pruebas E2E tienen documentación específica en `docs/infrastructure/E2E_TESTING.md`.

## Variables de entorno principales

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=https://ctgone.com
```

Nunca almacenar secretos productivos en Git.

## Closed Loop actual

```text
Identity
→ KYC
→ Investment Order
→ Payment Evidence
→ Admin Verification
→ Allocation
→ Production
→ Serialization
→ Canonical Inventory
→ Inventory Reconciliation
→ Sales OS
→ Financial Facts
→ Settlement
→ Participant Ledger
→ Withdrawal / Reinvestment
```

El circuito base cuenta con invariantes transaccionales en PostgreSQL y contratos de reconstrucción limpia en CI. Las capacidades futuras se añaden por incrementos versionados y no deben anticiparse en documentación como si ya fueran productivas.

## Documentación autoritativa

- `docs/architecture/SYSTEM_STATE.md` — mapa de fuentes de verdad
- `docs/architecture/CTG_ONE_OS.md` — arquitectura compartida
- `docs/infrastructure/PRODUCTION_READINESS.md` — preparación/deploy
- `docs/infrastructure/BACKUP_RESTORE.md` — recuperación
- `docs/infrastructure/OBSERVABILITY.md` — observabilidad
- `src/data/technology-proof.ts` — madurez pública
- `src/lib/observability/schema-version.ts` — release de base de datos esperado
