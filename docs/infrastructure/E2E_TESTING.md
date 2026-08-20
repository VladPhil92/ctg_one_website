# Browser E2E Testing

## Purpose

CTG One uses Playwright at two browser-test boundaries:

1. a non-destructive baseline suite that is safe without Supabase credentials;
2. an authenticated critical-journey suite backed by a disposable local Supabase stack inside CI.

Both exercise the production Next.js build (`next build` + `next start`). Neither suite creates data in the hosted production Supabase project.

## Baseline safety boundary

The baseline suite must remain safe even if it is accidentally executed with public Supabase configuration present. `tests/e2e/auth.spec.mjs` intercepts every browser request matching `**/auth/v1/**` and returns a deterministic local `503` response. Real login and signup traffic cannot leave the Playwright browser during that suite.

Local validation tests assert that invalid credentials produce zero auth-network attempts. A valid-looking submission may exercise the application's failure path, but any Supabase auth request is intercepted before it can reach an external project.

`tests/e2e/critical-journeys.spec.mjs` additionally verifies fail-closed navigation for KYC, Investment OS and admin surfaces plus the public health boundary when Supabase is not configured.

Production remains out of scope for browser tests that submit forms or mutate state.

## Authenticated critical-journey boundary

The `Critical authenticated browser journey` CI job starts the repository's own Supabase stack with the pinned CLI, obtains only the local public API URL/anon key, builds Next.js against that disposable stack, and runs `tests/e2e/critical-authenticated.spec.mjs`.

The authenticated suite is skipped unless `E2E_AUTHENTICATED=1`, so the normal baseline job cannot accidentally execute its mutation path.

The initial critical scenario validates the P3.1 KYC transaction boundary end to end:

1. create a disposable local Auth user;
2. sign in through the real CTG One authentication UI;
3. enter `/dashboard/kyc` with a real authenticated browser session;
4. upload the front document successfully;
5. force a deterministic transient failure on the back-document Storage request;
6. assert that the participant remains on an editable KYC state instead of being marked pending;
7. retry the same form;
8. prove that deterministic Storage upsert + idempotent document registration can reuse the existing draft;
9. finalize the draft and expose `Verificación en revisión`;
10. reload the page and prove that the pending state persists and the upload form is no longer available.

This test is intentionally destructive only inside the ephemeral local Supabase instance. No hosted Auth user, KYC record, Storage object, wallet or investment record is manufactured.

## CI contract

The protected `Test, typecheck and build` job performs, in order:

1. `npm ci`;
2. repository safety and migration invariants;
3. production dependency audit;
4. TypeScript validation;
5. `next build`;
6. installation of the pinned Playwright runtime;
7. Chrome/runtime verification;
8. baseline Playwright tests against `next start`.

The `Golden Path clean database contract` job applies the complete migration chain to fresh local Postgres and executes the transactional/schema contracts.

The `Critical authenticated browser journey` job independently starts full local Supabase, applies the same migrations, builds the application with local public credentials and executes the authenticated KYC failure/retry scenario.

The Playwright runtime is pinned in CI as `@playwright/test@1.62.0`. The browser context uses `es-CO` and `America/Bogota` for deterministic product behavior.

## Local execution — baseline

From a clean checkout:

```bash
npm ci
npm run build
npm install --no-save --package-lock=false @playwright/test@1.62.0
npx playwright install chromium
npx playwright test --project=chromium
```

Playwright starts the built application with `npm run start` on port `3100` by default. Set `PLAYWRIGHT_PORT` to change the local port.

## Local execution — authenticated critical suite

A developer may reproduce the CI boundary using only local infrastructure:

```bash
supabase start
eval "$(supabase status -o env)"
export NEXT_PUBLIC_SUPABASE_URL="$API_URL"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY"
export NEXT_PUBLIC_SITE_URL="http://127.0.0.1:3000"
export PLAYWRIGHT_PORT=3000
export E2E_AUTHENTICATED=1
npm run build
npx playwright test tests/e2e/critical-authenticated.spec.mjs --project=chromium
supabase stop --no-backup
```

Do not point this authenticated suite at production. If a future suite requires a hosted environment, it must use a dedicated non-production project with disposable fixtures and explicit authorization.

## Current coverage

Browser coverage now includes:

- login validation and fail-closed provider behavior;
- registration validation and password policy;
- password-recovery privacy behavior;
- language switching and auth navigation;
- public health response and secret non-disclosure;
- unauthenticated KYC and Investment OS return targets;
- unauthenticated admin fail-closed behavior;
- real local signup/login against isolated Supabase;
- KYC partial Storage failure;
- KYC retry through deterministic object keys and Storage upsert;
- durable KYC finalization and persisted pending state after reload.

## Next testing phase

After P3.1 is merged, the same local-stack pattern should be extended incrementally to investment order creation, payment-proof submission, admin review fixtures, production allocation, settlement and withdrawal. Financial acceptance tests must remain isolated from hosted production data.
