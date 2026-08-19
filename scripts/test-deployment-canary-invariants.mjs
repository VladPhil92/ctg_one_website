import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [workflow, verifier, renderConfig, healthRoute] = await Promise.all([
  read('.github/workflows/post-deploy-health.yml'),
  read('scripts/verify-deployment-health.mjs'),
  read('render.yaml'),
  read('src/app/api/health/route.ts'),
]);

assert.match(workflow, /name:\s*Post-Deploy Health Canary/, 'Deployment canary workflow must have a stable name.');
assert.match(workflow, /\n\s*schedule:\s*\n/, 'Deployment canary must run on a schedule.');
assert.match(workflow, /\n\s*workflow_dispatch:\s*\n/, 'Deployment canary must support explicit manual verification.');
assert.doesNotMatch(workflow, /\n\s*push:\s*\n/, 'Post-deploy canary must not be a push check that can block Render checksPass deployment.');
assert.doesNotMatch(workflow, /\n\s*pull_request:\s*\n/, 'Post-deploy canary must not run on pull requests.');
assert.doesNotMatch(workflow, /\n\s*workflow_run:\s*\n/, 'Post-deploy canary must not create a workflow_run check race with Render checksPass deployment.');
assert.match(workflow, /cron:\s*['"]7,17,27,37,47,57 \* \* \* \*['"]/, 'Scheduled canary cadence must remain bounded and explicit.');
assert.match(workflow, /EXPECTED_DEPLOYMENT_SHA:\s*\$\{\{ github\.event\.inputs\.expected_sha \|\| github\.sha \}\}/, 'Canary must compare production to the exact workflow target SHA.');
assert.match(workflow, /EXPECTED_DEPLOYMENT_BRANCH:\s*main/, 'Production canary must require the main branch.');
assert.match(workflow, /node scripts\/verify-deployment-health\.mjs/, 'Workflow must execute the repository-owned verifier.');
assert.match(workflow, /timeout-minutes:\s*12/, 'Canary must have a bounded workflow timeout.');

assert.match(verifier, /payload\?\.deployment\?\.commit !== expectedSha/, 'Verifier must require exact Render commit identity.');
assert.match(verifier, /payload\?\.deployment\?\.branch !== expectedBranch/, 'Verifier must require the expected deployment branch.');
assert.match(verifier, /payload\?\.deployment\?\.provider !== 'render'/, 'Verifier must prove the response is from a Render runtime.');
assert.match(verifier, /payload\?\.checks\?\.databaseSchemaCompatible !== true/, 'Verifier must require the privileged schema compatibility check.');
assert.match(verifier, /payload\?\.schema\?\.compatible !== true/, 'Verifier must require the health response schema to be compatible.');
assert.match(verifier, /deployment\?\.expectedDatabaseMigration !== expectedMigration/, 'Verifier must compare deployed expected migration to repository metadata.');
assert.match(verifier, /schema\?\.expectedMigrationCount !== expectedMigrationCount/, 'Verifier must compare deployed migration count to repository metadata.');
assert.match(verifier, /attempts > 60/, 'Verifier must cap retry attempts.');
assert.match(verifier, /requestTimeoutMs > 30000/, 'Each network request must have a hard timeout.');
assert.ok(
  verifier.indexOf('body = await response.text();') > -1
    && verifier.indexOf('body = await response.text();') < verifier.indexOf('clearTimeout(timer);'),
  'Request timeout must remain active until the health response body is fully consumed.'
);
assert.match(verifier, /process\.exit\(1\)/, 'Non-convergence must fail the canary.');

assert.match(renderConfig, /healthCheckPath:\s*\/api\/health/, 'Render must use the same authoritative health endpoint.');
assert.match(renderConfig, /autoDeployTrigger:\s*checksPass/, 'Render must remain gated on CI checks before deployment.');
assert.match(renderConfig, /branch:\s*main/, 'Render must deploy the canonical main branch.');

assert.match(healthRoute, /deploymentCommitAvailable/, 'Health endpoint must expose deployment commit availability.');
assert.match(healthRoute, /databaseSchemaCompatible/, 'Health endpoint must expose runtime schema compatibility.');
assert.match(healthRoute, /deployment,\s*\n\s*schema:/, 'Health payload must expose deployment and schema identity together.');
assert.match(healthRoute, /'Cache-Control': 'no-store, max-age=0'/, 'Health endpoint must not be served from stale cache.');

console.log('Post-deploy health canary invariants: PASS');
