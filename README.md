# CTG One Technology

**Software, Data & Digital Infrastructure for the CTG One Business Ecosystem**

CTG One Technology es la capa propietaria de software, datos e infraestructura digital que soporta el ecosistema empresarial CTG One. Diseña, construye y opera aplicaciones, plataformas transaccionales, identidad, automatización, seguridad e infraestructura compartida aplicadas directamente a unidades de negocio reales.

Su diferenciador es la integración vertical: la tecnología se desarrolla dentro del mismo ecosistema donde se utiliza, mide y mejora.

> **Gobernanza:** este README explica el proyecto, pero no es una base de datos de estado runtime. Para saber dónde vive cada fuente autoritativa consulte `docs/architecture/SYSTEM_STATE.md`. El índice general de documentación está en `docs/README.md`. Para contratos y compatibilidad entre CTG One, CTG Wallet, Nvet Care y otras superficies federadas consulte `docs/architecture/ECOSYSTEM_CONTRACT_REGISTRY.md` y `docs/federation/`.

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
- **Frontend / Full-stack:** Next.js + React + TypeScript
- **Backend / Database:** Supabase — PostgreSQL, Auth y Storage
- **Session / SSR:** `@supabase/ssr`
- **Validation:** Zod
- **Data:** TanStack React Query donde aplica
- **AI:** CTG Knowledge bajo gobernanza de madurez y evidencia
- **Web3:** integraciones y capacidades gobernadas por contrato; ninguna UI o dependencia implica por sí sola producción habilitada
- **Payments:** integración educativa con Wompi bajo orden server-authoritative y settlement verificado
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
(invariants + dependency audit + lint + typecheck + build + browser E2E + clean database / Golden Paths)
  ↓
main
  ↓
Render Web Service
  ↓
ctgone.com
  ↓
Supabase + proveedores externos verificados
```

Antes de fusionar una rama debe sincronizarse con el `main` más reciente y revisarse el delta final. Si una fase ya fue absorbida por trabajo posterior y el PR queda sin diferencias, debe cerrarse como **superseded** en vez de fabricar un merge. La resolución de conflictos no puede duplicar constantes, registros JSON, JSX, imports, tests o metadata de migraciones.

## Ecosistema empresarial

CTG One Technology opera como capa tecnológica común para las unidades del ecosistema definidas de forma canónica en `src/data/content.ts`. Estas unidades constituyen entornos reales de aplicación y validación tecnológica. Su pertenencia al ecosistema no implica el mismo nivel de madurez digital; cada capacidad se clasifica por evidencia.

La armonía tecnológica entre productos se gobierna mediante contratos explícitos de identidad, autoridad, capacidades, compatibilidad y evidencia de despliegue. No se exige que `ctg_one_website`, `CTG-Wallet`, `Nvet-Care-App` u otros productos federados usen el mismo framework o las mismas versiones si sus límites de integración permanecen compatibles y fail-closed.

## Modelo de madurez

La fuente autoritativa de madurez pública es `src/data/technology-proof.ts`. Los estados públicos contemplan, según el producto y la evidencia disponible:

- `LIVE`
- `BETA`
- `PARTIAL`
- `IN DEVELOPMENT`
- `ROADMAP`

Una capacidad no pasa a `LIVE` por existir una descripción, dependencia, pantalla o prototipo. La superficie pública de evidencia vive en `/technology/status`.

## Bounded contexts actuales

### Identity / Account / KYC

- Supabase Auth
- perfiles
- KYC
- documentos privados
- rutas protegidas
- administración y auditoría
- assurance/federation claims únicamente cuando la identidad canónica lo permite

La elevación de identidad debe fallar cerrada: una inconsistencia en KYC no puede convertirse en una afirmación de verificación hacia otro sistema.

### Wallet / Saldo CTG

CTG One es la autoridad de identidad y del saldo COP consumido por las superficies Wallet bajo el contrato vigente. El dominio utiliza cuentas internas y un journal append-only de doble entrada para que cada crédito y débito tenga evidencia transaccional y el navegador nunca pueda editar el saldo directamente.

La UX de Wallet es capability-driven: una pantalla o SDK puede existir sin que la operación esté habilitada. El cliente puede hacer una capacidad más restrictiva, pero nunca ampliar una capability que CTG One mantiene cerrada.

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
ledger.topup
        ↓
Wallet V2 balance + activity
```

La cuenta bancaria mantiene los pesos reales. El **Saldo CTG** es el registro interno reconciliado que permite operar dentro del perímetro habilitado del ecosistema. La carga de un comprobante nunca acredita dinero por sí sola.

La autoridad objetivo es el ledger Wallet V2. Cualquier estructura legacy se conserva únicamente bajo reglas explícitas de compatibilidad/reconciliación y no puede ampliar rails desde el navegador.

### CTG Craft Beer Investment

Bounded context para órdenes de inversión, asignaciones económicas, lotes de producción, economía unitaria, master data cervecera, trazabilidad por botella, inventario canónico, Sales OS, hechos financieros, participant ledger, settlement, withdrawals/reinvestment, RBAC y trazabilidad pública por serial.

La plataforma pública se mantiene bajo el release stage definido por `src/data/technology-proof.ts`; no debe inferirse `LIVE` de la existencia del bounded context.

### JP Valderrama Education / Campus / Learning Center

El dominio educativo es una plataforma real dentro del repositorio y ya no debe tratarse como una página aislada. Abarca:

- presencia pública JP Valderrama;
- Talks, Ideas, Books y Projects;
- Campus y catálogo educativo;
- Learning Center;
- learner dashboard;
- cursos, lecciones, progreso y assessments;
- instructor/admin operations;
- catálogo comercial, órdenes, pago y entitlement.

Para productos o servicios educativos con **precio fijo publicado**, la ruta canónica es de compra inmediata:

```text
precio publicado
→ orden fijada por servidor
→ checkout de Wompi/proveedor habilitado
→ verificación firmada del proveedor
→ settlement
→ entitlement / acceso
```

No se requiere cotización ni aprobación comercial previa para una oferta de precio fijo. La cotización permanece únicamente como excepción para servicios realmente personalizados sin precio publicado.

### CTG Knowledge

Capacidad gobernada de conocimiento institucional con ingestión, chunking, retrieval, control de acceso, evaluación y provider integration. Debe mantenerse bajo política de evidencia, evaluación y seguridad antes de cualquier promoción de madurez.

### Nvet Care federation

`Nvet-Care-App` mantiene su backend y aplicación móvil como bounded context veterinario autónomo. CTG One aporta cuenta/sesión del ecosistema y superficies federadas donde el contrato lo define; Nvet conserva la autoridad sobre roles efectivos, mascotas, citas, servicios, chat, reviews y reglas veterinarias.

### VÉRTICE federation

CTG One incluye límites de federación server-to-server para intercambios autenticados con VÉRTICE. Las autoridades y claims deben ser mínimos, validados y fail-closed. Una sesión CTG One no autoriza por sí sola a ampliar permisos en VÉRTICE; cada sistema conserva su autoridad de dominio.

### Observability / Security / Operations

- `/api/health`
- Admin System Health
- structured logger con redacción de campos sensibles
- verificación de runtime/configuración/migraciones críticas
- identidad de deployment por SHA de Render
- request/correlation ID validado y propagado
- CSP y headers de seguridad
- rate limiting y boundaries server-side donde aplica
- contratos de recovery, clean database y Golden Path en CI

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
| `/knowledge` | CTG Knowledge |
| `/rewards` | CTG Rewards según estado de madurez publicado |
| `/token` | CTGO/Web3 según estado de madurez publicado |
| `/jpvalderrama` | Plataforma pública JP Valderrama |
| `/jpvalderrama/talks` | Talks y conferencias |
| `/jpvalderrama/ideas` | Ideas / contenido académico |
| `/jpvalderrama/books` | Books |
| `/jpvalderrama/projects` | Projects |
| `/jpvalderrama/campus` | Campus y catálogo educativo |
| `/jpvalderrama/learningcenter` | Learning Center |
| `/dashboard` | Personal OS protegido |
| `/dashboard/depositos` | Recarga manual Bre-B/banco + comprobante + conciliación |
| `/dashboard/inversion` | Investment experience integrada |
| `/dashboard/educacion` | Learner / education dashboard |
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

## Principios financieros, comerciales y operacionales

- dinero representado en centavos enteros (`bigint`) cuando aplica
- Saldo CTG derivado de journal append-only de doble entrada
- postings autoritativos server/database-side; nunca mutación financiera desde browser
- idempotencia obligatoria en recargas, checkout, settlements y consumos
- compatibilidad legacy reconciliada contra autoridades canónicas
- capacidades de cliente fail-closed frente al contrato server-side
- ninguna UI puede fabricar settlement, hash, provider confirmation o transacción confirmada como sustituto de evidencia real
- checkout educativo de precio fijo sin cotización previa
- entitlement educativo únicamente después del boundary de settlement aplicable
- snapshots económicos históricos por lote
- participant ledger append-only
- settlement único y reconciliado por lote
- revenue/tax vinculados a Sales OS
- correcciones mediante reversals/adjustments, no hard delete
- liquidación basada en hechos reconciliados, no proyecciones de UI
- botella serializada como unidad física mínima trazable
- ubicación canónica e historia de movimientos append-only
- operaciones sensibles mediante funciones server-side/database-side con autorización revalidada

## Seguridad

Arquitectura base:

- Supabase Auth
- RLS
- server-side authorization
- RBAC por dominio donde aplica
- funciones `SECURITY DEFINER` con comprobaciones explícitas
- Storage privado + signed URLs para documentos sensibles
- feature flags y canales financieros fail-closed
- CSP y headers de seguridad
- rate limiting en superficies sensibles instrumentadas
- dependency audit en CI
- PR + required checks antes de merge
- federation claims mínimos y server-to-server

No se realizan afirmaciones de certificaciones sin evidencia formal.

## CI

La definición autoritativa vive en `.github/workflows/ci.yml` y `package.json`. Incluye, entre otros:

```bash
npm test
npm run audit:critical
npm run lint
npx tsc --noEmit
npm run build
npx playwright test --project=chromium
```

Además existen contratos especializados, incluyendo **Golden Path clean database**, Wallet, Education Wompi y Education Assessment cuando la rama/disparo correspondiente los ejecuta.

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

Proveedores específicos pueden requerir variables adicionales documentadas en `.env.local.example` y en sus runbooks. Nunca almacenar secretos productivos en Git.

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

## Closed Loop — Education fixed-price commerce

```text
Published Offering
→ Authenticated User
→ Server-authoritative Order
→ Provider Checkout
→ Signed Provider Verification
→ Settlement
→ Entitlement
→ Learning / Access Surface
```

Los circuitos cuentan con invariantes transaccionales en PostgreSQL y/o contratos de aplicación/Golden Path según el dominio. Las capacidades futuras se añaden por incrementos versionados y no deben anticiparse en documentación como si ya fueran productivas.

## Documentación autoritativa

- `docs/README.md` — índice general y reglas de autoridad documental
- `docs/architecture/SYSTEM_STATE.md` — mapa de fuentes de verdad internas de CTG One
- `docs/architecture/CTG_ONE_OS.md` — arquitectura compartida y bounded contexts
- `docs/architecture/ECOSYSTEM_CONTRACT_REGISTRY.md` — contratos y compatibilidad cross-product
- `docs/federation/` — contratos de federación server-to-server
- `docs/infrastructure/PRODUCTION_READINESS.md` — preparación/deploy
- `docs/infrastructure/BACKUP_RESTORE.md` — recuperación
- `docs/infrastructure/OBSERVABILITY.md` — observabilidad
- `src/data/technology-proof.ts` — madurez pública
- `src/lib/observability/schema-version.ts` — release de base de datos esperado

## Higiene del repositorio

- los audits de fase son históricos, no autoridades runtime;
- documentación superseded y engañosa debe retirarse o archivarse explícitamente;
- no se duplican registries de migraciones o madurez en Markdown;
- los PRs deben revisarse contra el último `main` antes del merge;
- un PR con delta final vacío se considera superseded;
- después de resolver conflictos se inspeccionan duplicaciones antes de depender del CI para detectarlas.
