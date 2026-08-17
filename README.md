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

El proyecto requiere runtime Node. No es un static export.

## Arquitectura de entrega

```text
branch
  ↓
Pull Request
  ↓
GitHub Actions
(test + dependency audit + typecheck + build)
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
- economía unitaria
- eventos de producción
- serialización por botella
- movimientos de inventario
- hechos financieros por lote
- participant ledger
- settlement
- withdrawals / reinvestment
- RBAC
- trazabilidad pública por serial

### CTG Knowledge

Pilot de conocimiento institucional con ingestión, chunking, retrieval, control de acceso y provider integration. Debe mantenerse bajo política de evidencia, evaluación y seguridad.

### Observability

- `/api/health`
- Admin System Health
- structured logger base
- verificación de runtime/configuración/migraciones críticas

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
| `/admin/operations` | Production / Traceability OS |
| `/admin/system-health` | Diagnóstico técnico administrativo |
| `/inversion` | CTG Craft Beer Investment público |
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
```

La presencia de una migración en Git no prueba por sí sola que esté aplicada en un entorno. Producción debe verificarse mediante migration history/System Health y procedimientos operacionales documentados.

## Principios financieros

- dinero representado en centavos enteros (`bigint`) cuando aplica;
- ledger de participante append-only;
- settlement único por lote;
- correcciones mediante reversals/adjustments, no hard delete de historia financiera;
- liquidación basada en hechos reales de ingreso/costo/impuesto, no únicamente en proyecciones de UI;
- operaciones sensibles mediante funciones server-side/database-side con autorización revalidada.

## Seguridad

Arquitectura base:

- Supabase Auth;
- RLS;
- server-side authorization;
- RBAC del dominio inversión;
- funciones `SECURITY DEFINER` con comprobaciones explícitas;
- Storage privado + signed URLs para documentos sensibles;
- feature flags y canales financieros fail-closed;
- headers de seguridad baseline;
- dependency audit en CI.

No se realizan afirmaciones de SOC 2, ISO 27001, PCI DSS u otras certificaciones sin evidencia formal.

## CI

```bash
npm test
npm run audit:critical
npx tsc --noEmit
npm run build
```

CI ejecuta estas comprobaciones en pull requests y pushes a `main`.

## Desarrollo local

```bash
npm ci
npm run dev
```

## Variables de entorno principales

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=https://ctgone.com
```

Nunca almacenar secretos productivos en Git.

## Roadmap técnico prioritario

La siguiente etapa se denomina **CTG One Closed Loop**:

```text
Identity
→ Investment
→ Payment
→ Allocation
→ Production
→ Serialization
→ Inventory
→ Sales
→ Finance / Ledger
→ Settlement
→ Withdrawal
→ Reporting
```

El primer caso vertical de referencia es CTG Craft Beer. El objetivo es que una operación completa pueda reconstruirse a partir de evidencia persistida y auditable.

Ver:

- `docs/architecture/REPOSITORY_AUDIT_CURRENT.md`
- `docs/architecture/CLOSED_LOOP_GAP_ANALYSIS.md`
- `docs/architecture/CTG_ONE_OS.md`
- `docs/investment/`
- `docs/security/`
- `docs/infrastructure/`

## Posicionamiento canónico

**CTG One Technology is the proprietary software, data and digital infrastructure layer powering the CTG One business ecosystem.**

No utilizar como definición institucional:

- “Dual Architecture”;
- agencia comercial;
- agencia de ventas;
- consultora tecnológica tercerizada;
- proveedor genérico de servicios tecnológicos.

## Contacto

- **Email:** direccion@ctgone.com
- **Phone:** +57 (5) 6661 7000
- **Location:** Cartagena de Indias, Colombia
- **Website:** https://ctgone.com

© 2024-2026 CTG One Technology.
