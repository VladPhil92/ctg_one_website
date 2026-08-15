# Existing Site Integration Map

This document is the required Step 1/2 audit for **CTG Craft Beer Inversión**. It
records what `ctgone.com` already is, so the new `/inversion` capability can be
grafted on without touching protected surface.

```
ctgone.com
├── existing system — PROTECTED
│   ├── / , /about , /ecosystem , /services , /rewards , /token , /contact
│   ├── /registro , /iniciar-sesion , /dashboard  (CTG One account system)
│   └── /privacidad
└── /inversion — NEW SYSTEM (this initiative)
    ├── /inversion                 (public landing)
    ├── /inversion/como-funciona, /simulador, /riesgos, /legal (public)
    ├── /inversion/app/*           (participant area)
    └── /inversion/admin/*         (admin area)
```

## Current stack (as of this audit)

| Concern | Current state |
|---|---|
| Framework | Next.js 14 (App Router), TypeScript, React 18 |
| Package manager | npm (`package-lock.json` present — do not switch to pnpm/yarn) |
| Styling | Tailwind CSS 3, design tokens in `tailwind.config.ts` (`bg-primary #050505`, `accent #c9a962` gold, `text-*`, `border`), global CSS vars in `src/app/globals.css`, Framer Motion for scroll-reveal (`FadeInSection`) |
| Component library | Hand-rolled, not shadcn/ui — `src/components/ui/{Button,Card,Badge,FadeInSection}.tsx`, `Container` |
| Routing | App Router, one route segment per page (`src/app/<route>/page.tsx`), each page renders `<Navbar/>` + content + `<Footer/>` itself (no shared route-group layout wrapper for marketing pages) |
| Database | Supabase Postgres (project `mdscwjvlihdiflcvghhk`), schema in `supabase/migrations/*.sql`. Tables: `profiles`, `wallets`, `transactions`, `kyc_submissions`, `kyc_documents`, `admin_audit_log`. RLS everywhere, money as `*_cents` integers, mutations only via `SECURITY DEFINER` RPCs (`approve_deposit`, `reject_deposit`, `approve_kyc`, `reject_kyc`) |
| Auth | Supabase Auth (email/password) via `@supabase/ssr`. `src/contexts/AuthContext.tsx` (client), `src/lib/supabase/{client,server}.ts`, root `src/middleware.ts` (session refresh + `/dashboard` and `/admin` route protection). Everything degrades to "signed out" gracefully via `isSupabaseConfigured` when env vars are absent — **do not remove this guard** |
| API model | Next.js Route Handlers under `src/app/api/**/route.ts` (e.g. `src/app/api/admin/kyc/[id]/approve/route.ts`), calling Supabase RPCs with the caller's own session-bound server client |
| Deployment | Render.com (Web Service, Node runtime — confirmed after a build-failure investigation; no `render.yaml` committed, config lives in the Render dashboard). `output: 'export'` was intentionally removed from `next.config.js` for the accounts system — **do not re-add it** |
| Tests | No automated test runner configured yet (no Vitest/Jest, no Playwright config file in the repo — Playwright has been used ad hoc from the agent sandbox for manual visual verification only) |
| Environment vars | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (see `.env.local.example`). Do not rename these |
| Brand assets | `public/images/logo/*.png` (per-business-unit icons, already colour-graded and alpha-cleaned — do not regenerate), `public/images/logo/CTGLOGO.jpeg` (site wordmark) |

## Protected surfaces (must not change without explicit authorization)

- `src/app/page.tsx`, `about/`, `ecosystem/`, `services/`, `rewards/`, `token/`, `contact/` and their section components under `src/components/sections/*`
- `src/components/Navbar.tsx`, `src/components/Footer.tsx` global nav/footer content and structure
- `src/data/content.ts`, `src/lib/constants.ts` (existing business-unit/nav data)
- The existing accounts system: `src/contexts/AuthContext.tsx`, `src/app/(auth)/*`, `src/app/dashboard/*`, `supabase/migrations/0001..0003*.sql`, `src/app/api/admin/{kyc,deposits}/**`
- `tailwind.config.ts` global tokens, `src/app/globals.css`
- `next.config.js`, deployment configuration

## Safe extension points

- New top-level route segment `src/app/inversion/**` — fully additive, does not touch any existing route
- Reuse (do not fork) existing design tokens: `bg-primary`, `bg-secondary`, `accent` (`#c9a962`, gold — already reads as an amber/beer accent, no new global palette needed), `text-*`, `border*`, existing `Button`/`Card`/`Container`/`FadeInSection` components
- Reuse existing Supabase Auth/`profiles` for participant identity (see ADR-011) rather than standing up a second auth system — new investment-domain data lives in separate `investment_*`-namespaced tables/migrations, additive only, no edits to existing migrations
- New Route Handlers under `src/app/api/investment/**`, isolated from `src/app/api/admin/**`
- New migration files `supabase/migrations/0004_investment_*.sql` onward — strictly additive (`create table`, never `alter`/`drop` on existing tables)

## Files intentionally left untouched by this initiative

Everything under "Protected surfaces" above, plus `README.md` (updated only if/when `/inversion` should be publicly announced — not yet, see feature flags in `BUSINESS_MODEL.md`).
