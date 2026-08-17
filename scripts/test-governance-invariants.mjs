import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const ci = await read('.github/workflows/ci.yml');
const render = await read('render.yaml');
const health = await read('src/app/api/health/route.ts');
const deployment = await read('src/lib/observability/deployment.ts');
const infrastructureHealth = await read('src/lib/observability/infrastructure-health.ts');
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

console.log('Governance invariants: PASS');
