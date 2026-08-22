import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [route, verifier, workflow, proof, docs] = await Promise.all([
  read('src/app/api/investment/readiness/route.ts'),
  read('scripts/verify-investment-production-readiness.mjs'),
  read('.github/workflows/post-deploy-health.yml'),
  read('src/data/technology-proof.ts'),
  read('docs/investment/PRODUCTION_READINESS_EVIDENCE.md'),
]);

assert.match(route, /getCapabilityProof\('investment-platform'\)/, 'Readiness route must derive maturity from the canonical capability registry.');
assert.match(route, /getPublicProofStatus\(capability\)/, 'Readiness route must derive public stage from canonical capability truth.');
assert.match(route, /probeRuntimeSchemaCompatibility\(\)/, 'Readiness route must verify runtime schema compatibility.');
assert.match(route, /deployment\.provider === 'render' && Boolean\(deployment\.commit\)/, 'Production readiness must require a real Render deployment identity.');
assert.match(route, /capability\.status === 'PARTIAL'/, 'Technical Investment maturity must remain PARTIAL.');
assert.match(route, /publicStatus === 'BETA'/, 'Public Investment release must remain BETA.');
assert.match(route, /productionOperatingEvidence:\s*'pending'/, 'Deployment readiness must never be mislabeled as real operating evidence.');
assert.match(route, /mutationMode:\s*'read-only'/, 'Readiness evidence must explicitly remain read-only.');
assert.match(route, /'Cache-Control': 'no-store, max-age=0'/, 'Readiness response must not be stale-cached.');
assert.doesNotMatch(route, /\.from\(['"]investment_/i, 'Readiness endpoint must not query Investment domain rows directly.');
assert.doesNotMatch(route, /\b(insert|update|delete)\b/i, 'Readiness endpoint must contain no mutation path.');

assert.match(verifier, /const healthOrigin = new URL\(healthUrl\)\.origin/, 'Verifier must anchor auxiliary probes to HEALTH_URL origin.');
assert.match(verifier, /`\$\{healthOrigin\}\/api\/investment\/readiness`/, 'Readiness URL must derive from the health origin by default.');
assert.match(verifier, /`\$\{healthOrigin\}\/inversion`/, 'Investment surface URL must derive from the health origin by default.');
assert.match(verifier, /parsed\.origin !== healthOrigin/, 'Explicit readiness overrides must remain on the same origin as HEALTH_URL.');
assert.match(verifier, /method:\s*'GET'/, 'Production verifier must be read-only HTTP GET.');
assert.doesNotMatch(verifier, /method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/, 'Production verifier must not issue mutating HTTP methods.');
assert.match(verifier, /capability\?\.technicalStatus !== 'PARTIAL'/, 'Verifier must reject accidental technical maturity promotion.');
assert.match(verifier, /capability\?\.publicStatus !== 'BETA'/, 'Verifier must reject accidental public maturity promotion.');
assert.match(verifier, /productionOperatingEvidence !== 'pending'/, 'Verifier must preserve the operating-evidence boundary.');
assert.match(verifier, /const deploymentCommit = readiness\?\.deployment\?\.commit/, 'Verifier must source observed deployment identity directly from readiness payload.');
assert.match(verifier, /deploymentCommit !== expectedSha/, 'Verifier must require exact deployed Git identity.');
assert.match(verifier, /schema\?\.expectedMigrationCount !== expectedMigrationCount/, 'Verifier must pin deployed schema metadata to repository truth.');
assert.match(verifier, /surfaceResult\.response\.url/, 'Verifier must reject redirects away from the canonical Investment surface.');
assert.match(verifier, /requestTimeoutMs > 30000/, 'Verifier network requests must be bounded.');
assert.match(verifier, /process\.exit\(1\)/, 'Any readiness mismatch must fail closed.');

assert.match(workflow, /node scripts\/verify-investment-production-readiness\.mjs/, 'Post-deploy workflow must execute Investment readiness verification after deployment health.');
assert.match(workflow, /HEALTH_URL:\s*\$\{\{ github\.event\.inputs\.health_url \|\| 'https:\/\/ctgone\.com\/api\/health' \}\}/, 'Workflow must pass the selected health endpoint into both deployment and Investment verification.');
assert.match(workflow, /Investment probes derive from the same origin/i, 'Manual health override must document same-origin Investment probe derivation.');
assert.doesNotMatch(workflow, /INVESTMENT_READINESS_URL:\s*https:\/\/ctgone\.com/i, 'Workflow must not pin readiness to production when HEALTH_URL is overridden.');
assert.doesNotMatch(workflow, /INVESTMENT_SURFACE_URL:\s*https:\/\/ctgone\.com/i, 'Workflow must not pin Investment surface to production when HEALTH_URL is overridden.');
assert.doesNotMatch(workflow, /INVESTMENT.*(?:SERVICE_ROLE|PASSWORD|SECRET)/i, 'Read-only Investment canary must not require new privileged credentials.');

assert.match(proof, /phase:\s*'18'/, 'Technology changelog must record Phase 18.');
assert.match(proof, /Production readiness canary/i, 'Capability evidence must describe the production readiness canary.');
assert.match(docs, /does not promote Investment to LIVE/i, 'Readiness documentation must preserve the maturity boundary.');
assert.match(docs, /read-only/i, 'Readiness documentation must state the non-mutating boundary.');

console.log('Investment production readiness invariants: PASS');
