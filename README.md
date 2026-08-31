# CTG One Technology

**Software, Data & Digital Infrastructure for the CTG One Business Ecosystem**

CTG One Technology es la capa propietaria de software, datos e infraestructura digital que soporta el ecosistema empresarial CTG One. Diseña, construye y opera aplicaciones, plataformas transaccionales, identidad, automatización, seguridad e infraestructura compartida aplicadas directamente a unidades de negocio reales.

Su diferenciador es la integración vertical: la tecnología se desarrolla dentro del mismo ecosistema donde se utiliza, mide y mejora.

> **Gobernanza:** este README explica el proyecto, pero no es una base de datos de estado runtime. Para saber dónde vive cada fuente autoritativa consulte `docs/architecture/SYSTEM_STATE.md`. Para contratos y compatibilidad entre CTG One, CTG Wallet y Nvet Care consulte `docs/architecture/ECOSYSTEM_CONTRACT_REGISTRY.md`.

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
- **Web3:** Privy/Polygon integrados bajo identidad canónica; CTGO permanece ROADMAP hasta existir evidencia productiva verificable
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

La armonía tecnológica entre productos se gobierna mediante contratos explícitos de identidad, autoridad, capacidades, compatibilidad y evidencia de despliegue. No se exige que `ctg_one_website`, `CTG-Wallet` y `Nvet-Care-App` usen el mismo framework o las mismas versiones si sus límites de integración permanecen compatibles y fail-closed.

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
- rutas protegidas
- administración y auditoría

### Wallet / Saldo CTG

CTG One es la autoridad de identidad y del saldo COP que consume `CTG-Wallet`. El dominio utiliza cuentas internas y un journal append-only de doble entrada para que cada crédito y débito tenga evidencia transaccional y el navegador nunca pueda editar el saldo directamente.

La UX de Wallet es capability-driven: una pantalla o SDK puede existir sin que la operación esté habilitada. El cliente puede hacer una capacidad más restrictiva, pero nunca ampliar una capability que CTG One mantiene cerrada. Actualmente Swap es quote-only, el retiro bancario y la compra crypto de tercero no son rails canónicos habilitados, y el envío crypto permanece limitado al perímetro canary controlado.

Flujo de recarga operativo:

```text
Usuario autenticado + KYC
        ↓
/dashboard/depositos
        ↓
QR Bre-B / transferencia
        ↓
Pago real a cuenta bancaria
        ↓
Comprobante asociado al usuario
        ↓
Verificación administrativa
        ↓
Conciliación independiente
        ↓
ledger.topup (crédito Saldo CTG)
        ↓
Wallet V2 balance + activity
```

La cuenta bancaria mantiene los pesos reales. El **Saldo CTG** es el registro interno reconciliado que permite operar dentro del perímetro habilitado del ecosistema. La carga de un comprobante nunca acredita dinero por sí sola.

La autoridad objetivo es `ctg_ledger_v2`. `public.wallets.balance_cents` se conserva únicamente como caché de compatibilidad durante la transición; el saldo canónico se deriva de postings autoritativos publicados. El backend incluye un débito atómico service-role-only para consumo futuro del ecosistema, con idempotencia, control de saldo insuficiente y doble entrada. Este límite no habilita retiro libre de COP, P2P ni débitos de inversión desde el navegador.

### CTG Craft Beer Investment

Bounded context para órdenes de inversión, asignaciones económicas, lotes de producción, economía unitaria, master data cervecera, trazabilidad por botella, inventario canónico, Sales OS, hechos financieros, participant ledger, settlement, withdrawals/reinvestment, RBAC y trazabilidad pública por serial.

La plataforma pública se mantiene bajo el release stage definido por `src/data/technology-proof.ts`; no debe inferirse `LIVE` de la existencia del bounded context.

### CTG Knowledge

Beta controlada de conocimiento institucional con ingestión, chunking, retrieval, control de acceso y provider integration. Debe mantenerse bajo política de evidencia, evaluación y seguridad antes de promoción a `LIVE`.

### Nvet Care federation

`Nvet-Care-App` mantiene su backend y aplicación móvil como bounded context veterinario autónomo. CTG One aporta la cuenta/sesión del ecosistema y la superficie web federada en `/nvetcareapp`; Nvet conserva la autoridad sobre roles efectivos, mascotas, citas, servicios, chat, reviews y reglas de dominio. La federación y compatibilidad cross-repository se documentan en `docs/architecture/ECOSYSTEM_CONTRACT_REGISTRY.md` y en el contrato local de Nvet.

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
| `/wallet` | Presentación pública de Wallet + estado de capacidades |
| `/nvetcareapp` | Superficie web federada de Nvet Care |
| `/ai` | Arquitectura y desarrollo de IA |
| `/knowledge` | CTG Knowledge beta |
| `/rewards` | CTG Rewards roadmap |
| `/token` | CTGO Web3 roadmap |
| `/dashboard` | Personal OS protegido con Saldo CTG, identidad y capital |
| `/dashboard/depositos` | Recarga manual Bre-B/banco + comprobante + conciliación |
| `/dashboard/inversion` | Investment experience integrada |
| `/admin` | Admin OS protegido |
| `/admin/operations` | Production / Traceability / Sales OS |
| `/admin/system-health` | Diagnóstico técnico administrativo |
| `/inversion` | CTG Craft Beer Investment público |
| `/inversion/simulador` | Escenarios derivados de snapshots de lotes publicados |
| `/beer/[serial]` | Trazabilidad pública por unidad |

## Supabase migrations

No se mantiene una lista manual de migraciones en este README.

La secuencia autoritativa vive en `supabase/migrations/` y el release esperado se define en `src/lib/observability/schema-version.ts` mediante:

- `EXPECTED_DATABASE_MIGRATION`
- `EXPECTED_DATABASE_MIGRATION_NAME`
- `EXPECTED_DATABASE_MIGRATION_COUNT`

CI valida continuidad de la cadena, aplica todas las migraciones sobre una base PostgreSQL limpia y ejecuta contratos de Golden Path y seguridad. La presencia de una migración en Git no prueba por sí sola que esté aplicada en un entorno; la compatibilidad de producción debe verificarse mediante `/api/health` y Admin System Health.

Las migraciones aplicadas son inmutables. Una corrección de schema se realiza mediante una nueva migración contigua, nunca reescribiendo historia ya desplegada.

## Principios financieros y operacionales

- dinero representado en centavos enteros (`bigint`) cuando aplica
- Saldo CTG derivado de journal append-only de doble entrada
- postings autoritativos server/database-side; nunca mutación financiera desde browser
- idempotencia obligatoria en recargas y consumos
- compatibilidad legacy reconciliada contra el ledger canónico
- capacidades de cliente fail-closed frente al contrato server-side
- ninguna UI puede fabricar settlement, hash o transacción confirmada como sustituto de evidencia real
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

## Closed Loop — Saldo CTG

```text
Identity / KYC
→ Bre-B o transferencia
→ Payment Evidence
→ Admin Verification
→ Independent Reconciliation
→ Canonical Ledger Credit
→ Wallet V2 Balance / Activity
→ Trusted Ecosystem Consumption
→ Atomic Ledger Debit
→ Reconciliation
```

## Closed Loop — Investment

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

Los circuitos cuentan con invariantes transaccionales en PostgreSQL y contratos de reconstrucción limpia en CI. Las capacidades futuras se añaden por incrementos versionados y no deben anticiparse en documentación como si ya fueran productivas.

## Documentación autoritativa

- `docs/architecture/SYSTEM_STATE.md` — mapa de fuentes de verdad internas de CTG One
- `docs/architecture/CTG_ONE_OS.md` — arquitectura compartida
- `docs/architecture/ECOSYSTEM_CONTRACT_REGISTRY.md` — contratos y compatibilidad CTG One / Wallet / Nvet
- `docs/infrastructure/PRODUCTION_READINESS.md` — preparación/deploy
- `docs/infrastructure/BACKUP_RESTORE.md` — recuperación
- `docs/infrastructure/OBSERVABILITY.md` — observabilidad
- `src/data/technology-proof.ts` — madurez pública
- `src/lib/observability/schema-version.ts` — release de base de datos esperado
