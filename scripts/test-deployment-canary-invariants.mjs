import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [workflow, verifier, publicSurfaceVerifier, renderConfig, healthRoute] = await Promise.all([
  read('.github/workflows/post-deploy-health.yml'),
  read('scripts/verify-deployment-health.mjs'),
  read('scripts/verify-public-surface-reliability.mjs'),
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
assert.match(workflow, /name:\s*Resolve deployment target/, 'Scheduled canary must resolve the currently live deployment before checkout.');
assert.match(workflow, /REQUESTED_SHA:\s*\$\{\{ github\.event\.inputs\.expected_sha \|\| '' \}\}/, 'Only an explicit workflow_dispatch SHA may request strict convergence.');
assert.match(workflow, /TARGET_SHA=.*deployment.*commit/s, 'Without an explicit SHA, the canary must derive its target from the live health endpoint.');
assert.match(workflow, /mode=\$MODE/, 'Target resolution must expose whether the run is strict or live-release verification.');
assert.match(workflow, /ref:\s*\$\{\{ steps\.target\.outputs\.sha \}\}/, 'Canary must checkout the exact release it is validating.');
assert.match(workflow, /EXPECTED_DEPLOYMENT_SHA:\s*\$\{\{ steps\.target\.outputs\.sha \}\}/, 'Canary verifier must compare production to the resolved deployment SHA.');
assert.doesNotMatch(workflow, /expected_sha \|\| github\.sha/, 'Scheduled canary must never treat latest main as deployed before Render has converged.');
assert.match(workflow, /EXPECTED_DEPLOYMENT_BRANCH:\s*main/, 'Production canary must require the main branch.');
assert.match(workflow, /node scripts\/verify-deployment-health\.mjs/, 'Workflow must execute the repository-owned verifier.');
assert.match(workflow, /node scripts\/verify-public-surface-reliability\.mjs/, 'Workflow must verify public surfaces after deployment identity converges.');
assert.ok(
  workflow.indexOf('node scripts/verify-public-surface-reliability.mjs')
    > workflow.indexOf('node scripts/verify-deployment-health.mjs'),
  'Public surface verification must run only after the expected Render deployment identity is proven.',
);
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

assert.match(publicSurfaceVerifier, /const pagePaths = \['\/jpvalderrama'\]/, 'Public canary must verify the JP Valderrama landing page.');
for (const asset of [
  'books-desk',
  'thought-map',
  'philosophy-money',
  'waveform',
  'conference-hero',
  'philosophy-technology',
  'conference-poster',
  'jp-icon',
  'ideas-button',
]) {
  assert.ok(
    publicSurfaceVerifier.includes(`/api/jpvalderrama/assets/${asset}`),
    `Public canary must verify semantic JP asset ${asset}.`,
  );
}
assert.match(publicSurfaceVerifier, /image\/webp/, 'Public asset canary must require the expected image media type.');
assert.match(publicSurfaceVerifier, /missing ETag/, 'Public asset canary must require ETag support.');
assert.match(publicSurfaceVerifier, /If-None-Match/, 'Public asset canary must exercise conditional revalidation.');
assert.match(publicSurfaceVerifier, /expected 304/, 'Public asset canary must require successful ETag revalidation.');
assert.match(publicSurfaceVerifier, /must-revalidate/i, 'Public asset canary must require a revalidating cache contract.');
assert.match(publicSurfaceVerifier, /semantic URL must not be immutable/, 'Public asset canary must reject immutable caching for semantic URLs.');
assert.match(publicSurfaceVerifier, /requestTimeoutMs > 30000/, 'Public surface network requests must have a hard timeout.');
assert.ok(
  publicSurfaceVerifier.indexOf('const body = await consume(response);') > -1
    && publicSurfaceVerifier.indexOf('const body = await consume(response);') < publicSurfaceVerifier.indexOf('clearTimeout(timer);'),
  'Public surface timeout must remain active until response bodies are fully consumed.',
);
assert.match(publicSurfaceVerifier, /process\.exit\(1\)/, 'Any public surface reliability failure must fail the production canary.');

assert.match(renderConfig, /healthCheckPath:\s*\/api\/health/, 'Render must use the same authoritative health endpoint.');
assert.match(renderConfig, /autoDeployTrigger:\s*checksPass/, 'Render must remain gated on CI checks before deployment.');
assert.match(renderConfig, /branch:\s*main/, 'Render must deploy the canonical main branch.');

assert.match(healthRoute, /deploymentCommitAvailable/, 'Health endpoint must expose deployment commit availability.');
assert.match(healthRoute, /databaseSchemaCompatible/, 'Health endpoint must expose runtime schema compatibility.');
assert.match(healthRoute, /deployment,\s*\n\s*schema:/, 'Health payload must expose deployment and schema identity together.');
assert.match(healthRoute, /'Cache-Control': 'no-store, max-age=0'/, 'Health endpoint must not be served from stale cache.');

console.log('Post-deploy health canary invariants: PASS');
