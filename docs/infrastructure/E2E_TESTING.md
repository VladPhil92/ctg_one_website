# Browser E2E Testing

## Purpose

CTG One uses Playwright to validate user-visible browser behavior inside the same required GitHub Actions job that protects `main`.

The first suite is intentionally non-destructive. It does not create Supabase users, mutate production data, or require service-role credentials. It exercises the production Next.js build locally in CI and verifies the authentication shell, validation behavior, navigation, fail-closed auth behavior, and the public health contract.

## CI contract

The protected `Test, typecheck and build` job performs, in order:

1. `npm ci`
2. repository safety and migration invariants
3. production dependency audit
4. TypeScript validation
5. `next build`
6. installation of the pinned Playwright test runtime
7. Chromium + Linux browser dependencies
8. Playwright browser tests against `next start`

The Playwright runtime is pinned in CI as `@playwright/test@1.62.0`. During this bootstrap phase it is installed with `--no-save --package-lock=false`, keeping the application dependency lock unchanged while still making the browser-test runtime deterministic. A later testing-hardening phase may promote Playwright into the repository devDependency lock when the broader unit/integration test toolchain is standardized.

## Local execution

From a clean checkout:

```bash
npm ci
npm run build
npm install --no-save --package-lock=false @playwright/test@1.62.0
npx playwright install chromium
npx playwright test --project=chromium
```

Playwright starts the built application with `npm run start` on port `3100` by default. Set `PLAYWRIGHT_PORT` to change the local port.

To exercise an already-running non-production environment instead of starting a local server, set:

```bash
PLAYWRIGHT_TEST_BASE_URL=https://your-test-environment.example
```

Do not point the baseline suite at production unless a test has been explicitly reviewed as read-only.

## Current coverage

`tests/e2e/auth.spec.mjs` currently verifies:

- login page rendering and semantic form submission;
- Zod validation before backend access;
- fail-closed behavior when browser Supabase configuration is absent;
- registration validation without creating a user;
- navigation between login and registration;
- the public `/api/health` response and absence of privileged secret material.

## Next testing phase

The next layer should use an isolated Supabase test environment or a dedicated staging project with disposable fixtures. That phase can safely add real authentication, participant onboarding, investment-order, production, sales, settlement, and withdrawal E2E flows. Production Supabase must not be used to manufacture test users or financial records.
