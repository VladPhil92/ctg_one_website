# CTG One Technology - Corporate Website

**AI Strategy & Infrastructure**

Sitio web corporativo para CTG One Technology — una empresa de tecnología y ecosistema empresarial integrado que diseña infraestructura tecnológica y arquitectura estratégica. Opera bajo una arquitectura dual: infraestructura tecnológica + agencia comercial con 12 unidades de negocio.

Además del sitio de marketing, la app incluye cuentas de usuario reales: registro/login con Supabase Auth, verificación KYC, saldo de billetera (`wallets`) y recargas (`transactions`) revisadas por un administrador — todo respaldado por Postgres con Row Level Security. No es un sitio estático: necesita un runtime Node/Edge (Vercel) para el middleware de sesión y los Server Components que hablan con Supabase.

---

## 🚀 Tecnologías

- **Framework:** Next.js 14 (App Router, Server + Client Components)
- **React:** 18.2 · **TypeScript:** 5.3 · **Styling:** Tailwind CSS 3.4
- **Backend / DB:** [Supabase](https://supabase.com) — Postgres + Auth + Storage, accedido vía `@supabase/ssr` y `@supabase/supabase-js`
- **Middleware:** `src/middleware.ts` refresca la sesión de Supabase en cada request y protege `/dashboard` (y `/admin`, cuando exista)
- **Validación:** Zod · **Data fetching:** TanStack React Query
- **Web3 (opcional, wallet connect):** ethers, viem, wagmi
- **Animación:** Framer Motion · **Iconos:** Lucide React
- **Deployment:** Vercel, runtime Node/Edge (⚠️ **no** Static Export — ver [nota](#por-qué-ya-no-es-static-export))

### Por qué ya no es Static Export

El sitio empezó como `output: 'export'` (HTML estático). Desde que se agregaron cuentas de usuario reales, KYC, saldo y el panel de administración, el proyecto pasó a depender de:

- **Middleware** (`src/middleware.ts`) que se ejecuta en cada request para refrescar la sesión y redirigir rutas protegidas.
- **Route Handlers / Server Components** que crean un cliente Supabase server-side (`src/lib/supabase/server.ts`) usando cookies de la request.
- La **service role key** de Supabase (`src/lib/supabase/server.ts` → `createAdminClient`), que nunca debe llegar al bundle del cliente.

Nada de eso es representable con `output: 'export'`, así que `next.config.js` ya no lo declara — el sitio se despliega como una app Next.js normal (Node/Edge) en Vercel.

---

## 🔐 Autenticación y datos de usuario

- **Auth:** Supabase Auth (email/password). Flujos en `src/app/(auth)/iniciar-sesion` y `src/app/(auth)/registro`.
- **Sesión en cliente:** `src/contexts/AuthContext.tsx` expone `useAuth()` (`userId`, `profile`, `isAuthenticated`, `signOut`, …) escuchando `onAuthStateChange`.
- **Sesión en servidor / middleware:** `src/lib/supabase/middleware.ts` refresca el cookie de sesión en cada request y:
  - Redirige a `/iniciar-sesion` si un usuario no autenticado visita `/dashboard` o `/admin`.
  - Verifica el rol `admin` en `profiles` (re-consultando la tabla, nunca confiando en un claim del cliente) antes de dejar pasar `/admin`.
- **Modo sin Supabase configurado:** si `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` no están seteadas (por ejemplo, en un preview sin secretos), el middleware y `AuthContext` hacen no-op y el sitio se comporta como "sin sesión" en vez de romperse — útil para levantar el sitio de marketing sin backend.

### Esquema de base de datos (`supabase/migrations/0001_init.sql`)

| Tabla | Propósito |
|---|---|
| `profiles` | Uno por `auth.users`, creado automáticamente por `handle_new_user()`. `role` y `kyc_status` **no son editables por el cliente**. |
| `kyc_submissions` / `kyc_documents` | Envíos de verificación de identidad y sus documentos (bucket privado `kyc-documents`). |
| `wallets` | Saldo del usuario (`balance_cents`). Solo se modifica dentro de funciones `SECURITY DEFINER`. |
| `transactions` | Recargas (`deposit`) y futuras compras. `purchase` está definido pero sin usar todavía (Fase 2). |
| `admin_audit_log` | Append-only — nadie tiene UPDATE/DELETE, ni siquiera un admin. |

Funciones clave (todas `SECURITY DEFINER`, todas re-verifican `is_admin()` server-side en vez de confiar en el rol que mande el cliente): `handle_new_user`, `is_admin`, `approve_deposit`, `reject_deposit`, `approve_kyc`, `reject_kyc`.

`src/types/domain.ts` tiene los tipos TS espejo de este schema (a mano por ahora; una vez que exista un proyecto Supabase real, `supabase gen types typescript` puede generarlos).

---

## 📁 Estructura del Proyecto

```
CTG One Website/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Layout raíz + metadata + JSON-LD
│   │   ├── page.tsx                # Home (hero + overview + CTA de cuenta)
│   │   ├── (auth)/
│   │   │   ├── layout.tsx          # Layout minimal para auth (sin navbar completa)
│   │   │   ├── iniciar-sesion/
│   │   │   └── registro/
│   │   ├── about/, services/, ecosystem/, rewards/, token/, contact/
│   │   │                          # Subpáginas de marketing (antes eran anclas en una sola página)
│   │   ├── dashboard/              # Cuenta autenticada: saldo, KYC, wallet connect
│   │   ├── privacidad/             # Política de privacidad (legal)
│   │   └── globals.css             # Estilos globales + variables CSS
│   ├── middleware.ts               # Refresca sesión Supabase + protege /dashboard, /admin
│   ├── components/
│   │   ├── Navbar.tsx, Footer.tsx  # Usan NAV_ITEMS de @/lib/constants (fuente única)
│   │   ├── BlockchainNetwork.tsx   # Visualización del ecosistema
│   │   ├── ErrorBoundary.tsx
│   │   ├── auth/AuthInput.tsx
│   │   ├── web3/WalletConnect.tsx  # Conexión MetaMask opcional
│   │   ├── sections/               # Una sección por página de marketing
│   │   └── ui/                     # Button, Card, Badge, FadeInSection, …
│   ├── contexts/AuthContext.tsx    # useAuth() — sesión, perfil, sign out
│   ├── hooks/useWallet.ts          # Lee wallets.balance_cents del usuario actual
│   ├── lib/
│   │   ├── constants.ts            # NAV_ITEMS, BUSINESS_UNITS, colores, animación
│   │   ├── format.ts               # formatCents, etc.
│   │   └── supabase/
│   │       ├── client.ts           # Cliente browser ('use client')
│   │       ├── server.ts           # Cliente server-only + createAdminClient (service role)
│   │       └── middleware.ts       # updateSession() — usado por src/middleware.ts
│   ├── config/config.json          # ⚙️ Contacto, marca, redes sociales
│   ├── data/content.ts             # Copy del sitio (hero, about, ecosystem, rewards, token, footer…)
│   └── types/
│       ├── domain.ts                # Profile, Wallet, Transaction, KycSubmission… (espejo del schema)
│       ├── web3.ts                  # Tipos para la integración de wallet/token
│       └── global.d.ts
├── supabase/
│   ├── config.toml                  # Config del proyecto Supabase (CLI local)
│   ├── migrations/0001_init.sql     # Schema: profiles, KYC, wallets, transactions, admin_audit_log
│   └── seed.sql                     # Cómo promover un usuario a admin en local/staging
├── public/
│   ├── images/logo/                 # Logo + logomarks de cada unidad de negocio
│   ├── images/token/, images/hospitalidad/, …
│   ├── favicon.ico, apple-touch-icon.png
│   ├── robots.txt, sitemap.xml
├── .env.local.example               # Variables de entorno necesarias (copiar a .env.local)
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 🎨 Paleta de Colores

- **Background Primary:** `#050505` (Negro profundo)
- **Background Secondary:** `#0a0a0a` (Negro suave)
- **Accent (Gold):** `#c9a962` (Dorado refinado)
- **Text Primary:** `#ffffff` (Blanco)
- **Text Muted:** `#a3a3a3` (Gris)
- **Text Dim:** `#737373` (Gris oscuro)

---

## 🗺️ Rutas

| Ruta | Tipo | Notas |
|---|---|---|
| `/`, `/about`, `/services`, `/ecosystem`, `/rewards`, `/token`, `/contact` | Marketing (pública) | Contenido en `src/data/content.ts` |
| `/privacidad` | Legal (pública) | Razón social, responsable de datos, etc. |
| `/iniciar-sesion`, `/registro` | Auth (pública) | Supabase Auth email/password |
| `/dashboard` | Protegida | Requiere sesión — el middleware redirige a `/iniciar-sesion` si no hay usuario |
| `/admin` | Protegida (rol admin) | **DB ready, UI pendiente** — el middleware ya gatea esta ruta y el schema tiene `approve_deposit`/`approve_kyc`/etc., pero no existe todavía ninguna página en `src/app/admin` |

### ⚠️ Enlaces rotos conocidos (pendientes de implementar)

El dashboard (`src/app/dashboard/page.tsx`) enlaza a `/dashboard/kyc` y `/dashboard/depositos` para completar la verificación de identidad y recargar saldo, pero **esas páginas todavía no existen** — hoy son 404. Son el siguiente paso lógico dado que el schema (`kyc_submissions`, `transactions`) y las funciones de aprobación ya están listas en la base de datos.

---

## 🏗️ Secciones de Marketing

### ✅ Hero Section
- Logo corporativo, tagline "Technology is infrastructure. Strategy is architecture."
- Métricas: 12 Business Units, Dual Architecture, Founded 2024

### ✅ About — Los 5 Pilares
Visión Integral del Cliente · Acceso Múltiple en un Solo Ecosistema · Confianza por Especialización · Continuidad en el Tiempo · Reducción de Riesgo

### ✅ Services — Tecnología & Agencia Comercial
Tecnología & Ingeniería · Equipo de Gestión Comercial · Diseño & Comunicación · Fintech & Créditos

### ✅ Ecosystem — 12 Unidades de Negocio
Valderrama International School · CTG Suites · Bechara Real Estate · CTG One Technology (core tecnológico) · Nvet Care · Oralgreen · Legalyst Consultores · CTG One Design · Vantage Libranza Plus · PISÁO Gastrobar · CTG Craft Beer · Guest Logistics Concierge

### ✅ CTG Rewards
Programa de fidelización y referidos (no es un vehículo de inversión) — puntos por consumo/referidos reales, canje por productos/servicios/experiencias, niveles de reconocimiento.

### ✅ Token (CTGO)
Tokenomics, distribución y utilidades del CTG One Token — utilidad de ecosistema, no lenguaje de inversión (ver commits de "board-approved restructure" para el contexto de este cambio de tono).

### ✅ Contact
Información de contacto centralizada desde `src/config/config.json`.

---

## ⚙️ Configuración

### Marca / contacto (`src/config/config.json`)

```json
{
  "contact": {
    "email": "direccion@ctgone.com",
    "phone": "+57 (5) 6661 7000",
    "location": "Cl. 17 Mz 10 L 21, El Campestre, Cartagena de Indias",
    "website": "www.ctgone.com"
  },
  "company": { "name": "CTG One Technology", "tagline": "AI Strategy & Infrastructure", "founded": 2024 },
  "social": { "twitter": "...", "linkedin": "...", "telegram": "..." }
}
```

### Variables de entorno (`.env.local.example` → `.env.local`)

| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase (Project Settings → API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/public key — segura para el cliente |
| `SUPABASE_SERVICE_ROLE_KEY` | **Solo servidor** — bypassa RLS. Nunca prefijar con `NEXT_PUBLIC_` ni usar en un Client Component |
| `NEXT_PUBLIC_SITE_URL` | Base para links absolutos en emails de auth (confirmación, etc.) |

Sin estas variables el sitio de marketing sigue funcionando (auth/middleware hacen no-op), pero `/dashboard`, login/registro y cualquier lectura de `wallets`/`profiles` no van a tener datos.

---

## 🛠️ Comandos de Desarrollo

```bash
# Instalar dependencias
npm install

# Copiar variables de entorno y completar con los valores del proyecto Supabase
cp .env.local.example .env.local

# (Opcional) Levantar Supabase local con la CLI, si tenés Docker
supabase start
supabase db reset   # aplica supabase/migrations/0001_init.sql + seed.sql

# Desarrollo local (http://localhost:3000)
npm run dev

# Build de producción
npm run build

# Lint / Typecheck
npm run lint
npx tsc --noEmit
```

---

## 📦 Deployment

El sitio corre en **Vercel** con runtime Node/Edge (no Static Export — ver [arriba](#por-qué-ya-no-es-static-export)).

```bash
# 1. Verificar build localmente
npm run build

# 2. Push a GitHub
git add .
git commit -m "Update"
git push origin main

# 3. Vercel auto-deploya desde main
```

Antes de deployar a producción, asegurate de que las 4 variables de entorno de Supabase estén configuradas en el proyecto de Vercel (Project Settings → Environment Variables) — sin ellas el middleware sigue funcionando en modo no-op, pero login/registro/dashboard no van a servir datos reales.

---

## 📞 Contacto

- **Email:** direccion@ctgone.com
- **Phone:** +57 (5) 6661 7000
- **Location:** Cl. 17 Mz 10 L 21, El Campestre, Cartagena de Indias
- **Website:** www.ctgone.com

---

## 📄 Licencia

© 2024-2026 CTG One Technology. All rights reserved.

---

**Última actualización:** Agosto 2026
**Versión:** 3.0.0
