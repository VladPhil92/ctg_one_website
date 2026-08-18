# Production Readiness Runbook

## Objective

Close the gap between a repository that builds and a system that is demonstrably healthy in production.

## Canonical production chain

GitHub `main` -> GitHub Actions -> Render Web Service -> `ctgone.com` -> Supabase

## Deployment contract

- Production branch: `main`.
- Render must deploy only after GitHub checks pass.
- Build: `npm ci && npm run build`.
- Start: `npm run start`.
- Health path: `/api/health`.
- Canonical public URL: `https://ctgone.com`.
- Do not use Vercel as the production runtime unless an explicit architecture decision changes this contract.

## Required environment variables

Render production must define:

- `NEXT_PUBLIC_SITE_URL=https://ctgone.com`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Never commit secret values. `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never use the `NEXT_PUBLIC_` prefix.

## Health verification

`GET /api/health` is the public liveness/configuration endpoint. The route itself never reads or serializes the service-role secret. A separate `server-only` module may use the service-role client to call the restricted runtime schema compatibility RPC; only a sanitized compatibility result reaches the public response.

In production/Render, a schema mismatch is a health failure and should return HTTP 503. A healthy production release returns HTTP 200 with `status: ok`. A degraded state or schema incompatibility blocks production-readiness sign-off even when the Next.js process itself is alive.

## Release verification checklist

After every material production release:

1. GitHub CI is green for the merged commit.
2. Render reports the same commit as Live.
3. `https://ctgone.com/api/health` returns HTTP 200 and `status: ok`.
4. Home, About, Technology, Products, Ecosystem, AI and Technology Status load without 5xx errors.
5. Registration can reach Supabase Auth (no "Supabase no configurado" state).
6. Login and logout work.
7. Protected dashboard routes reject anonymous access.
8. KYC screens load for an authenticated test user.
9. `/inversion` loads public lots without exposing admin data.
10. Investment/admin routes enforce authorization.
11. Money-moving or withdrawal functionality remains fail-closed unless explicitly enabled and operationally approved.
12. No browser console error reveals credentials, tokens or service-role material.

## Database readiness

Production Supabase must have the repository migrations applied in order. Schema drift must be checked before enabling new financial workflows. Do not infer migration state from a successful frontend build.

CI additionally boots a fresh local Supabase/PostgreSQL database, applies the full migration chain from zero and executes the Golden Path database contract. This proves clean schema reconstruction; it does not prove recovery of production data.

## Dependency risk

CI currently blocks critical production dependency vulnerabilities. High/moderate advisories must be remediated through reviewed dependency upgrades rather than `npm audit fix --force`.

Upgrade procedure:

1. Identify the direct dependency introducing the advisory.
2. Upgrade in a dedicated branch.
3. Run critical invariants, typecheck and production build.
4. Exercise auth and investment flows in a non-production environment.
5. Merge only after compatibility is demonstrated.

## Backup and recovery

The authoritative procedure is `docs/infrastructure/BACKUP_RESTORE.md`.

Current production recovery status must not be inferred from successful migrations or CI. Database data and Storage object recovery remain **UNVERIFIED** until a real production-derived backup is restored to a non-production target and the recovery evidence is recorded.

A backup that has never been restored is not considered verified recovery capability.

## Production sign-off

A release is production-ready only when code, CI, Render deployment, environment configuration, Supabase schema and critical user journeys are all verified. A green build alone is insufficient.

Material financial activation additionally requires the recovery gate in `BACKUP_RESTORE.md` to be satisfied.
