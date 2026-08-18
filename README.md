# CTG One Technology

**Software, Data & Digital Infrastructure for the CTG One Business Ecosystem**

CTG One Technology es la capa propietaria de software, datos e infraestructura digital que soporta el ecosistema empresarial CTG One. Diseña, construye y opera aplicaciones, plataformas transaccionales, identidad, automatización, seguridad e infraestructura compartida aplicadas directamente a unidades de negocio reales.

CTG One no se define como agencia comercial, agencia de ventas ni consultora tecnológica genérica para terceros. Su diferenciador es la integración vertical: la tecnología se desarrolla dentro del mismo ecosistema donde se utiliza, mide y mejora.

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

- **Framework:** Next.js 16.3.1 — App Router, Server Components, Client Components y Route Handlers
- **React:** 19.2.8
- **TypeScript:** 5.x
- **Styling:** Tailwind CSS 3.x
- **Backend / Database:** Supabase — PostgreSQL, Auth y Storage
- **Session / SSR:** `@supabase/ssr`
- **Validation:** Zod
- **Data:** TanStack React Query donde aplica
- **AI pilot:** OpenAI integration code + CTG Knowledge controlled retrieval
- **Web3 libraries:** ethers, viem y wagmi; CTGO permanece ROADMAP hasta existir evidencia productiva verificable
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Production hosting:** Render Web Service
- **Source control / CI:** GitHub + GitHub Actions
- **Browser E2E:** Playwright / Chromium, baseline no destructivo en CI

El proyecto requiere runtime Node. No es un static export.

## Arquitectura de entrega

```text
branch
  ↓
Pull Request
  ↓
GitHub Actions
(invariants + dependency audit + typecheck + build + browser E2E)
  ↓
main protegida
  ↓
Render Web Service
  ↓
ctgone.com
  ↓
Supabase
PostgreSQL · Auth · Storage · RLS
```

## Ecosistema empresarial

CTG One Technology es la capa tecnológica común de doce unidades de negocio:

1. Valderrama International School
2. CTG Suites
3. Bechara Real Estate
4. CTG One Technology
5. Nvet Care
6. Oralgreen
7. Legalyst Consultores
8. CTG One Design
9. Vantage Libranza Plus
10. PISÁO Gastrobar
11. CTG Craft Beer
12. Guest Logistics Concierge

Estas unidades constituyen entornos reales de aplicación y validación tecnológica. La pertenencia al ecosistema no implica que todas posean el mismo nivel de madurez digital; cada capacidad debe clasificarse por evidencia.

## Modelo de madurez

Toda capacidad pública debe clasificarse como una de:

- `LIVE`
- `PARTIAL`
- `IN DEVELOPMENT`
- `PILOT` cuando corresponda al producto
- `ROADMAP`

Nada debe presentarse como `LIVE` únicamente por existir una descripción, diseño o dependencia instalada.

La superficie pública de evidencia vive en `/technology/status`.

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

Bounded context para:

- órdenes de inversión
- asignaciones económicas
- lotes de producción
- economía unitaria por snapshot de lote
- master data de estilos cerveceros
- eventos de producción
- serialización por botella
- ubicaciones canónicas de inventario
- movimientos físicos vinculados a seriales, origen y destino
- stock derivado por ubicación
- reconciliación botella ↔ movimiento ↔ Sales OS
- Sales OS con documentos e idempotencia
- hechos financieros por lote vinculados a ventas
- participant ledger
- settlement reconciliado
- withdrawals / reinvestment con reservas de saldo
- RBAC
- trazabilidad pública por serial

### CTG Knowledge

Pilot de conocimiento institucional con ingestión, chunking, retrieval, control de acceso y provider integration. Debe mantenerse bajo política de evidencia, evaluación y seguridad.

### Observability

- `/api/health`
- Admin System Health
- structured logger base
- verificación de runtime/configuración/migraciones críticas
- identidad de deployment por SHA de Render

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
| `/knowledge` | CTG Knowledge pilot |
| `/rewards` | CTG Rewards |
| `/token` | CTGO Web3 roadmap |
| `/dashboard` | Personal OS protegido |
| `/dashboard/kyc` | Identidad/KYC |
| `/dashboard/depositos` | Cuenta y recargas; fail-closed si no hay canales reales configurados |
| `/dashboard/inversion` | Investment experience integrada |
| `/admin` | Admin OS protegido |
| `/admin/operations` | Production / Traceability / Sales OS |
| `/admin/operations/inventory` | Inventory Reconciliation, ubicaciones y stock |
| `/admin/operations/scanner` | Operación física por QR/serial |
| `/admin/operations/settlement` | Reconciliación y cierre financiero de lote |
| `/admin/system-health` | Diagnóstico técnico administrativo |
| `/inversion` | CTG Craft Beer Investment público |
| `/inversion/simulador` | Escenarios derivados de snapshots de lotes publicados |
| `/beer/[serial]` | Trazabilidad pública por unidad |

## Supabase migrations

Migraciones versionadas actualmente en el repositorio:

```text
0001_init.sql
0002_kyc_submission_pending_trigger.sql
0003_crypto_tx_hash_unique.sql
0004_investment_schema.sql
0005_investment_security_hardening.sql
0006_investment_unit_economics.sql
0007_ctg_knowledge_v01.sql
0008_investment_orders_checkout.sql
0009_production_traceability_os.sql
0010_investment_rbac.sql
0011_role_admin_and_permission_enforcement.sql
0012_core_permission_guards.sql
0013_beer_style_master_and_lot_codes.sql
0014_sales_os_foundation.sql
0015_security_definer_execution_hardening.sql
0016_performance_hardening.sql
0017_system_health_observability.sql
0018_system_health_trigger_name_fix.sql
0019_client_table_privilege_hardening.sql
0020_authoritative_lot_economics.sql
0021_economics_function_privilege_hardening.sql
0022_closed_loop_integrity.sql
0023_closed_loop_review_hardening.sql
0024_inventory_reconciliation.sql
0025_inventory_reconciliation_hardening.sql
```

La presencia de una migración en Git no prueba por sí sola que esté aplicada en un entorno. Producción debe verificarse mediante migration history/System Health y procedimientos operacionales documentados. `EXPECTED_DATABASE_MIGRATION` debe coincidir con la última migración del repositorio; CI valida continuidad y ausencia de huecos.

## Principios financieros

- dinero representado en centavos enteros (`bigint`) cuando aplica;
- presets económicos editables en master data, sin convertirlos en historia retroactiva;
- snapshot económico completo e histórico por lote;
- órdenes que derivan capital desde el snapshot de lote en PostgreSQL;
- allocation únicamente por flujo autorizado y respetando reservas de órdenes;
- una sola FormulaVersion por lote;
- soporte explícito para allocations internas CTG y externas sin romper el contrato XOR participante/interno;
- ledger de participante append-only;
- spendable balance descontando requests pendientes;
- settlement único por lote;
- revenue/tax vinculados a Sales OS; Sales OS puede reconocer ambos bajo `sales.manage` cuando existe `source_sale_id`;
- correcciones mediante reversals/adjustments, no hard delete de historia financiera;
- liquidación basada en hechos reales reconciliados, no en proyecciones de UI;
- operaciones sensibles mediante funciones server-side/database-side con autorización revalidada.

## Principios de inventario

- la botella serializada es la unidad física mínima trazable;
- `current_location_id` es la ubicación canónica; el texto de ubicación es solo proyección de presentación;
- todo movimiento autoritativo registra origen, destino y seriales afectados;
- la cantidad del movimiento debe reconciliar con el número de unidades vinculadas;
- la historia de movimientos es append-only;
- una transición física inválida o un lote parcial de seriales falla de forma atómica;
- `SOLD` solo nace de Sales OS y conserva vínculo con el documento de venta;
- una venta no puede abarcar inventario localizado físicamente en múltiples ubicaciones;
- `get_inventory_reconciliation()` detecta divergencias entre proyección física, historia y Sales OS.

## Seguridad

Arquitectura base:

- Supabase Auth;
- RLS;
- server-side authorization;
- RBAC del dominio inversión;
- funciones `SECURITY DEFINER` con comprobaciones explícitas;
- Storage privado + signed URLs para documentos sensibles;
- feature flags y canales financieros fail-closed;
- inventario operacional no expuesto a `anon`;
- mutaciones físicas únicamente mediante RPCs autorizados, no DML directo del cliente;
- headers de seguridad baseline;
- dependency audit en CI;
- PR obligatorio + required checks + conversación resuelta + rama actualizada antes de merge.

No se realizan afirmaciones de SOC 2, ISO 27001, PCI DSS u otras certificaciones sin evidencia formal.

## CI

El check protegido `Test, typecheck and build` ejecuta, entre otros:

```bash
npm test
npm run audit:critical
npx tsc --noEmit
npm run build
npx playwright test --project=chromium
```

`npm test` incluye invariantes críticos, master data, migraciones, gobernanza, economía, Closed Loop e Inventory Reconciliation.

CI se ejecuta en pull requests y pushes a `main`. Render espera checks aprobados antes del auto-deploy.

## Desarrollo local

```bash
npm ci
npm run dev
```

Las pruebas E2E de navegador tienen documentación específica en `docs/infrastructure/E2E_TESTING.md`.

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

El circuito base ya tiene invariantes transaccionales en PostgreSQL, incluido inventario físico por ubicación y reconciliación unitaria. Las siguientes etapas se concentran en devoluciones comerciales/credit notes, payout rails, conciliación de pagos y read models de portafolio.

El primer caso vertical de referencia es CTG Craft Beer. El objetivo es que una operación completa pueda reconstruirse a partir de evidencia persistida y auditable.
