import { readFile } from 'node:fs/promises';

const healthUrl = process.env.HEALTH_URL?.trim() || 'https://ctgone.com/api/health';
const healthOrigin = new URL(healthUrl).origin;
const readinessUrl = process.env.INVESTMENT_READINESS_URL?.trim()
  || `${healthOrigin}/api/investment/readiness`;
const investmentUrl = process.env.INVESTMENT_SURFACE_URL?.trim()
  || `${healthOrigin}/inversion`;
const expectedSha = process.env.EXPECTED_DEPLOYMENT_SHA?.trim() ?? '';
const expectedBranch = process.env.EXPECTED_DEPLOYMENT_BRANCH?.trim() || 'main';
const requestTimeoutMs = Number(process.env.CANARY_REQUEST_TIMEOUT_MS ?? '10000');

if (!/^[0-9a-f]{40}$/i.test(expectedSha)) {
  throw new Error('EXPECTED_DEPLOYMENT_SHA must be a full 40-character Git commit SHA.');
}
if (!Number.isInteger(requestTimeoutMs) || requestTimeoutMs < 1000 || requestTimeoutMs > 30000) {
  throw new Error('CANARY_REQUEST_TIMEOUT_MS must be between 1000 and 30000 milliseconds.');
}

for (const [label, value] of [
  ['HEALTH_URL', healthUrl],
  ['INVESTMENT_READINESS_URL', readinessUrl],
  ['INVESTMENT_SURFACE_URL', investmentUrl],
]) {
  const parsed = new URL(value);
  if (parsed.protocol !== 'https:') throw new Error(`${label} must use HTTPS.`);
  if (parsed.origin !== healthOrigin) {
    throw new Error(`${label} must use the same origin as HEALTH_URL.`);
  }
}

const schemaVersionSource = await readFile(
  new URL('../src/lib/observability/schema-version.ts', import.meta.url),
  'utf8'
);
const migrationMatch = /EXPECTED_DATABASE_MIGRATION\s*=\s*['"](\d{4})['"]/.exec(schemaVersionSource);
const migrationNameMatch = /EXPECTED_DATABASE_MIGRATION_NAME\s*=\s*['"]([^'"]+)['"]/.exec(schemaVersionSource);
const migrationCountMatch = /EXPECTED_DATABASE_MIGRATION_COUNT\s*=\s*(\d+)/.exec(schemaVersionSource);
if (!migrationMatch || !migrationNameMatch || !migrationCountMatch) {
  throw new Error('Unable to resolve expected database migration metadata from schema-version.ts.');
}
const expectedMigration = migrationMatch[1];
const expectedMigrationName = migrationNameMatch[1];
const expectedMigrationCount = Number(migrationCountMatch[1]);

async function fetchWithTimeout(url, accept) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: accept,
        'Cache-Control': 'no-cache',
        'User-Agent': 'ctg-one-investment-production-readiness-canary/1.0',
      },
      cache: 'no-store',
      redirect: 'follow',
      signal: controller.signal,
    });
    const body = await response.text();
    return { response, body };
  } finally {
    clearTimeout(timer);
  }
}

const readinessResult = await fetchWithTimeout(readinessUrl, 'application/json');
let readiness;
try {
  readiness = JSON.parse(readinessResult.body);
} catch {
  throw new Error(`Investment readiness endpoint returned non-JSON content (HTTP ${readinessResult.response.status}).`);
}

const failures = [];
if (!readinessResult.response.ok) failures.push(`readiness.http=${readinessResult.response.status}`);
if (readiness?.status !== 'ready') failures.push(`readiness.status=${String(readiness?.status)}`);
if (readiness?.service !== 'ctg-craft-beer-investment') failures.push(`readiness.service=${String(readiness?.service)}`);
if (readiness?.capability?.id !== 'investment-platform') failures.push(`capability.id=${String(readiness?.capability?.id)}`);
if (readiness?.capability?.technicalStatus !== 'PARTIAL') failures.push(`capability.technicalStatus=${String(readiness?.capability?.technicalStatus)}`);
if (readiness?.capability?.publicStatus !== 'BETA') failures.push(`capability.publicStatus=${String(readiness?.capability?.publicStatus)}`);
if (readiness?.deployment?.provider !== 'render') failures.push(`deployment.provider=${String(readiness?.deployment?.provider)}`);
if (readiness?.deployment?.commit !== expectedSha) failures.push(`deployment.commit=${String(readiness?.deployment?.commit)}`);
if (readiness?.deployment?.branch !== expectedBranch) failures.push(`deployment.branch=${String(readiness?.deployment?.branch)}`);
if (readiness?.schema?.compatible !== true) failures.push('schema.compatible!=true');
if (readiness?.schema?.expectedMigration !== expectedMigration) failures.push(`schema.expectedMigration=${String(readiness?.schema?.expectedMigration)}`);
if (readiness?.schema?.expectedMigrationName !== expectedMigrationName) failures.push(`schema.expectedMigrationName=${String(readiness?.schema?.expectedMigrationName)}`);
if (readiness?.schema?.expectedMigrationCount !== expectedMigrationCount) failures.push(`schema.expectedMigrationCount=${String(readiness?.schema?.expectedMigrationCount)}`);
if (readiness?.checks?.databaseSchemaCompatible !== true) failures.push('checks.databaseSchemaCompatible!=true');
if (readiness?.checks?.privilegedSchemaProbeConfigured !== true) failures.push('checks.privilegedSchemaProbeConfigured!=true');
if (readiness?.checks?.productionDeploymentIdentified !== true) failures.push('checks.productionDeploymentIdentified!=true');
if (readiness?.checks?.technicalMaturityHonest !== true) failures.push('checks.technicalMaturityHonest!=true');
if (readiness?.checks?.publicReleaseStageHonest !== true) failures.push('checks.publicReleaseStageHonest!=true');
if (readiness?.evidence?.ciOperationalGoldenJourney !== 'certified') failures.push(`evidence.ciOperationalGoldenJourney=${String(readiness?.evidence?.ciOperationalGoldenJourney)}`);
if (readiness?.evidence?.productionDeploymentReadiness !== 'verified') failures.push(`evidence.productionDeploymentReadiness=${String(readiness?.evidence?.productionDeploymentReadiness)}`);
if (readiness?.evidence?.productionOperatingEvidence !== 'pending') failures.push(`evidence.productionOperatingEvidence=${String(readiness?.evidence?.productionOperatingEvidence)}`);
if (readiness?.evidence?.mutationMode !== 'read-only') failures.push(`evidence.mutationMode=${String(readiness?.evidence?.mutationMode)}`);

const surfaceResult = await fetchWithTimeout(investmentUrl, 'text/html');
const finalSurfaceUrl = new URL(surfaceResult.response.url);
const expectedSurfaceUrl = new URL(investmentUrl);
if (!surfaceResult.response.ok) failures.push(`surface.http=${surfaceResult.response.status}`);
if (!surfaceResult.response.headers.get('content-type')?.toLowerCase().includes('text/html')) {
  failures.push(`surface.contentType=${String(surfaceResult.response.headers.get('content-type'))}`);
}
if (finalSurfaceUrl.origin !== expectedSurfaceUrl.origin || finalSurfaceUrl.pathname !== expectedSurfaceUrl.pathname) {
  failures.push(`surface.finalUrl=${surfaceResult.response.url}`);
}
if (surfaceResult.body.length < 500) failures.push(`surface.bodyLength=${surfaceResult.body.length}`);

const diagnostic = {
  healthUrl,
  readinessUrl,
  investmentUrl,
  expectedSha,
  expectedBranch,
  expectedMigration,
  expectedMigrationName,
  expectedMigrationCount,
  observed: {
    readinessHttp: readinessResult.response.status,
    readinessStatus: readiness?.status ?? null,
    deploymentCommit: readiness?.deployment?.commit ?? null,
    publicStatus: readiness?.capability?.publicStatus ?? null,
    productionOperatingEvidence: readiness?.evidence?.productionOperatingEvidence ?? null,
    surfaceHttp: surfaceResult.response.status,
    surfaceFinalUrl: surfaceResult.response.url,
  },
  failures,
};

if (failures.length > 0) {
  console.error(JSON.stringify({ result: 'FAIL', ...diagnostic }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ result: 'PASS', ...diagnostic }, null, 2));
