# CTG One Technology - Corporate Website

**Software, AI & Infrastructure**

CTG One Technology es una empresa tecnológica que desarrolla software propietario, sistemas de inteligencia artificial, automatización e infraestructura digital para sus propias unidades de negocio.

No se presenta como agencia comercial ni como consultora tecnológica tercerizada. Su función es construir y operar la capa tecnológica común del ecosistema CTG One: aplicaciones, plataformas, datos, integraciones, identidad, pagos, automatización, seguridad e infraestructura compartida aplicada directamente a negocios reales del grupo.

El ecosistema funciona como entorno operativo para diseñar, probar, desplegar y mejorar continuamente los productos tecnológicos de CTG One.

---

## Naturaleza de CTG One Technology

CTG One desarrolla tecnología de manera centralizada y la aplica dentro de sus propias unidades de negocio.

Principales líneas tecnológicas:

- **Software Engineering:** aplicaciones web, plataformas internas, APIs y productos digitales.
- **AI & Automation:** agentes de IA, automatización de procesos y asistencia inteligente.
- **Platforms, Data & Infrastructure:** identidad, bases de datos, integraciones, analítica, pagos, seguridad y servicios cloud compartidos.
- **Embedded Product Development:** desarrollo de productos tecnológicos a partir de necesidades operativas reales de las unidades de negocio.

El diferenciador central es la integración vertical: CTG One desarrolla la tecnología dentro del mismo ecosistema donde se utiliza y mide su desempeño.

---

## Tecnologías

- **Framework:** Next.js 14 — App Router, Server Components y Client Components
- **React:** 18.2
- **TypeScript:** 5.3
- **Styling:** Tailwind CSS 3.4
- **Backend / Database:** Supabase — PostgreSQL, Auth y Storage
- **Session / Middleware:** `@supabase/ssr`
- **Validation:** Zod
- **Web3:** ethers, viem y wagmi
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **i18n:** catálogo ES/EN curado manualmente, `LanguageProvider`, persistencia por cookie/localStorage
- **Production hosting:** Render Web Service
- **Source control / CI:** GitHub + GitHub Actions

El proyecto no es un Static Export. Usa middleware, Server Components, autenticación y conexiones server-side con Supabase, por lo que requiere un runtime Node.

---

## Arquitectura

```text
GitHub
   │
   │ push / merge a main
   ▼
GitHub Actions
   │
   │ typecheck + Next.js build
   ▼
Render Web Service
   │
   ▼
ctgone.com
   │
   ▼
Supabase
PostgreSQL · Auth · Storage · RLS
```

La rama de producción es `main`.

---

## Ecosistema empresarial

CTG One Technology constituye la capa tecnológica del ecosistema integrado por doce unidades de negocio:

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

Estas unidades no convierten a CTG One en una agencia comercial. Son los entornos operativos en los que la compañía desarrolla y aplica software, automatización, plataformas e infraestructura tecnológica.

---

## Rutas principales

| Ruta | Tipo |
|---|---|
| `/` | Home |
| `/about` | Naturaleza y modelo tecnológico |
| `/services` | Tecnología: software, IA e infraestructura |
| `/ecosystem` | Unidades de negocio |
| `/rewards` | CTG Rewards |
| `/token` | CTGO Token |
| `/contact` | Contacto |
| `/privacidad` | Política de privacidad |
| `/iniciar-sesion` | Autenticación |
| `/registro` | Registro |
| `/dashboard` | Cuenta protegida |
| `/dashboard/kyc` | Verificación de identidad |
| `/dashboard/depositos` | Recargas, bloqueadas hasta configurar canales reales de pago |
| `/admin` | Área administrativa protegida |
| `/inversion` | CTG Craft Beer Inversión |
| `/inversion/lotes` | Lotes públicos |
| `/inversion/como-funciona` | Explicación del modelo |
| `/inversion/simulador` | Simulador |
| `/inversion/riesgos` | Riesgos |
| `/inversion/legal` | Información legal |
| `/inversion/app` | Panel protegido del participante |
| `/inversion/admin` | Panel protegido de administración |

La etiqueta pública de navegación para `/services` es **Technology**. La ruta se conserva para compatibilidad.

---

## Autenticación y datos

La aplicación utiliza Supabase Auth y PostgreSQL con Row Level Security.

Componentes principales:

- `profiles`
- `kyc_submissions`
- `kyc_documents`
- `wallets`
- `transactions`
- `admin_audit_log`

Las operaciones sensibles se ejecutan server-side y las funciones administrativas revalidan autorización antes de modificar datos.

Los canales de recarga de la cuenta general funcionan bajo un criterio **fail closed**: la UI no debe aceptar solicitudes ni mostrar instrucciones bancarias/cripto mientras la configuración real de producción continúe pendiente.

---

## CTG Craft Beer Inversión

La plataforma `/inversion` vive dentro del mismo proyecto y utiliza un bounded context propio para lotes, asignaciones, inventario, ventas, ledger, retiros y liquidaciones.

La documentación funcional y técnica se encuentra en:

```text
docs/investment/
```

Incluye modelo de negocio, arquitectura de información, modelo financiero, seguridad, inventario, estados de lotes y ADRs de implementación.

Migraciones actuales:

```text
0001_init.sql
0002_kyc_submission_pending_trigger.sql
0003_crypto_tx_hash_unique.sql
0004_investment_schema.sql
0005_investment_security_hardening.sql
0006_investment_unit_economics.sql
```

`0006` incorpora el snapshot de economía unitaria por lote utilizado por la capa informativa de CTG Craft Beer Inversión. La liquidación real continúa dependiendo de los ingresos, impuestos, costos y ajustes efectivamente registrados en el ledger.

---

## Variables de entorno

Variables principales:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=https://ctgone.com
```

Los secretos reales nunca deben almacenarse en el repositorio.

La funcionalidad de inversión utiliza además variables `CTG_INVESTMENT_*`. Todas fallan cerradas (`false`) cuando no están configuradas y deben habilitarse únicamente cuando sus dependencias operativas y revisiones correspondientes estén listas.

---

## Desarrollo local

```bash
npm install
npm run dev
```

Validación:

```bash
npx tsc --noEmit
npm run build
```

Producción:

```bash
npm start
```

---

## Deployment

Producción corre como **Render Web Service** conectado al repositorio GitHub.

Configuración esperada:

```text
Branch: main
Runtime: Node
Build Command: npm ci && npm run build
Start Command: npm start
Domain: https://ctgone.com
```

El flujo de entrega es:

```text
branch → pull request → CI → merge a main → Render deploy → ctgone.com
```

---

## Posicionamiento corporativo

**CTG One Technology builds software, AI and digital infrastructure for its own business ecosystem.**

La compañía no debe describirse públicamente como:

- agencia comercial;
- agencia de ventas;
- consultora tecnológica tercerizada;
- proveedor genérico de servicios tecnológicos para terceros;
- arquitectura dual tecnología + agencia comercial.

La definición autorizada es una **empresa tecnológica integrada verticalmente con sus propias unidades de negocio**.

---

## Contacto

- **Email:** direccion@ctgone.com
- **Phone:** +57 (5) 6661 7000
- **Location:** Cl. 17 Mz 10 L 21, El Campestre, Cartagena de Indias
- **Website:** www.ctgone.com

---

© 2024-2026 CTG One Technology. All rights reserved.
