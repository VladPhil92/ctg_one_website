import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const ci = await read('.github/workflows/ci.yml');
const render = await read('render.yaml');
const health = await read('src/app/api/health/route.ts');
const deployment = await read('src/lib/observability/deployment.ts');
const infrastructureHealth = await read('src/lib/observability/infrastructure-health.ts');
const playwrightConfig = await read('playwright.config.mjs');
const authE2E = await read('tests/e2e/auth.spec.mjs');
const loginPage = await read('src/app/(auth)/iniciar-sesion/page.tsx');
const registrationPage = await read('src/app/(auth)/registro/page.tsx');
const packageJson = JSON.parse(await read('package.json'));

assert.ok(ci.includes('Enforce PR-only changes to main'), 'CI must keep the PR-only main deployment gate.');
assert.ok(ci.includes("github.event_name == 'push' && github.ref == 'refs/heads/main'"), 'PR-only gate must execute on main pushes.');
assert.ok(ci.includes('/commits/${SHA}/pulls'), 'PR-only gate must verify the pushed commit against GitHub associated pull requests.');
assert.ok(ci.includes('merged_at != null and .base.ref == "main"'), 'PR-only gate must require an actually merged PR targeting main.');
assert.ok(ci.includes('pull-requests: read'), 'CI token must have only the pull-request read permission needed by the governance gate.');
assert.ok(render.includes('autoDeployTrigger: checksPass'), 'Render must deploy only after repository checks pass.');

assert.ok(deployment.includes('RENDER_GIT_COMMIT'), 'Deployment metadata must use Render authoritative commit SHA.');
assert.ok(deployment.includes('RENDER_GIT_BRANCH'), 'Deployment metadata must expose the deployed branch.');
assert.ok(deployment.includes('RENDER_GIT_REPO_SLUG'), 'Deployment metadata must expose the deployed repository.');
assert.ok(health.includes('getDeploymentMetadata'), 'Public health must expose deployment identity from the centralized helper.');
assert.ok(!health.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Public health must never use the Supabase service-role key.');

assert.ok(infrastructureHealth.includes("id: 'schema-drift'"), 'Admin System Health must include Git/Supabase migration drift detection.');
assert.ok(infrastructureHealth.includes('EXPECTED_DATABASE_MIGRATION'), 'Schema drift must compare Supabase against the repository expected migration.');
assert.ok(infrastructureHealth.includes("id: 'deployment-identity'"), 'Admin System Health must expose the exact deployment identity.');
assert.ok(packageJson.scripts?.test?.includes('test-migration-integrity.mjs'), 'Migration integrity test must remain part of npm test.');
assert.ok(packageJson.scripts?.test?.includes('test-governance-invariants.mjs'), 'Governance invariants must remain part of npm test.');

// Browser E2E is part of the same required CI job that protects main.
assert.ok(ci.includes('@playwright/test@1.62.0'), 'CI must pin the Playwright test runtime to an explicit version.');
assert.ok(ci.includes('playwright install --with-deps chromium'), 'CI must install Chromium and its Linux dependencies before E2E.');
assert.ok(ci.includes('Run browser E2E tests'), 'The protected CI job must execute browser E2E tests.');
assert.ok(ci.includes('playwright test --project=chromium'), 'CI must run the Chromium project explicitly.');
assert.ok(playwrightConfig.includes("testDir: './tests/e2e'"), 'Playwright must keep browser tests isolated under tests/e2e.');
assert.ok(playwrightConfig.includes('workers: process.env.CI ? 1'), 'CI browser tests must run with one worker for deterministic execution.');
assert.ok(playwrightConfig.includes('npm run start'), 'E2E must exercise the production Next.js server rather than next dev.');
assert.ok(!authE2E.includes('ctgone.com'), 'Baseline browser E2E must not target production directly.');
assert.ok(!authE2E.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Browser E2E must never require the Supabase service-role secret.');
assert.ok(loginPage.includes('<Button type="submit"'), 'Login must use one semantic form-submit path.');
assert.ok(registrationPage.includes('<Button type="submit"'), 'Registration must use one semantic form-submit path.');
assert.ok(!loginPage.includes('onEnter={handleSubmit}'), 'Login must not duplicate form submit through an input key handler.');
assert.ok(!registrationPage.includes('onEnter={handleSubmit}'), 'Registration must not duplicate form submit through an input key handler.');

console.log('Governance invariants: PASS');
