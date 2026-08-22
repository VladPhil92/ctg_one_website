import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import {
  createInvestmentProductionReadinessEvidence,
} from '../src/lib/investment/production-readiness-evidence.mjs';

const healthUrl = process.env.HEALTH_URL?.trim() || 'https://ctgone.com/api/health';
const healthOrigin = new URL(healthUrl).origin;
const readinessUrl = process.env.INVESTMENT_READINESS_URL?.trim()
  || `${healthOrigin}/api/investment/readiness`;
const investmentUrl = process.env.INVESTMENT_SURFACE_URL?.trim()
  || `${healthOrigin}/inversion`;
const expectedSha = process.env.EXPECTED_DEPLOYMENT_SHA?.trim() ?? '';
const expectedBranch = process.env.EXPECTED_DEPLOYMENT_BRANCH?.trim() || 'main';
const requestTimeoutMs = Number(process.env.CANARY_REQUEST_TIMEOUT_MS ?? '10000');
const attempts = Number(process.env.INVESTMENT_CANARY_ATTEMPTS ?? '3');
const intervalMs = Number(process.env.INVESTMENT_CANARY_INTERVAL_MS ?? '5000');
const evidencePath = process.env.INVESTMENT_CANARY_EVIDENCE_PATH?.trim() || null;

if (!/^[0-9a-f]{40}$/.test(expectedSha)) {
  throw new Error('EXPECTED_DEPLOYMENT_SHA must be a lowercase full 40-character Git commit SHA.');
}
if (!Number.isInteger(requestTimeoutMs) || requestTimeoutMs < 1000 || requestTimeoutMs > 30000) {
  throw new Error('CANARY_REQUEST_TIMEOUT_MS must be between 1000 and 30000 milliseconds.');
}
if (!Number.isInteger(attempts) || attempts < 1 || attempts > 6) {
  throw new Error('INVESTMENT_CANARY_ATTEMPTS must be an integer between 1 and 6.');
}
if (!Number.isInteger(intervalMs) || intervalMs < 1000 || intervalMs > 30000) {
  throw new Error('INVESTMENT_CANARY_INTERVAL_MS must be between 1000 and 30000 milliseconds.');
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
const classification = healthOrigin === 'https://ctgone.com'
  ? 'production-canary'
  : 'non-production-canary';

async function fetchWithTimeout(url, accept) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: accept,
        'Cache-Control': 'no-cache',
        'User-Agent': 'ctg-one-investment-production-readiness-canary/2.0',
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

function safeScalar(value) {
  if (value === null || value === undefined) return 'null';
  return String(value).replace(/\s+/g, ' ').slice(0, 80);
}

function mismatch(failures, key, value) {
  failures.push(`${key}=${safeScalar(value)}`);
}

function emptyObserved() {
  return {
    readinessHttp: null,
    readinessStatus: null,
    deploymentCommit: null,
    publicStatus: null,
    productionOperatingEvidence: null,
    surfaceHttp: null,
    surfaceFinalUrl: null,
  };
}

async function runProbe() {
  const failures = [];
  const observed = emptyObserved();

  try {
    const readinessResult = await fetchWithTimeout(readinessUrl, 'application/json');
    observed.readinessHttp = readinessResult.response.status;
    let readiness = null;
    try {
      readiness = JSON.parse(readinessResult.body);
    } catch {
      failures.push(`readiness.non_json_http_${readinessResult.response.status}`);
    }

    if (readiness) {
      observed.readinessStatus = typeof readiness?.status === 'string' ? readiness.status.slice(0, 80) : null;
      const deploymentCommit = readiness?.deployment?.commit;
      observed.deploymentCommit = typeof deploymentCommit === 'string' && /^[0-9a-f]{40}$/.test(deploymentCommit)
        ? deploymentCommit
        : null;
      observed.publicStatus = typeof readiness?.capability?.publicStatus === 'string'
        ? readiness.capability.publicStatus.slice(0, 80)
        : null;
      observed.productionOperatingEvidence = typeof readiness?.evidence?.productionOperatingEvidence === 'string'
        ? readiness.evidence.productionOperatingEvidence.slice(0, 80)
        : null;

      if (!readinessResult.response.ok) mismatch(failures, 'readiness.http', readinessResult.response.status);
      if (readiness?.status !== 'ready') mismatch(failures, 'readiness.status', readiness?.status);
      if (readiness?.service !== 'ctg-craft-beer-investment') mismatch(failures, 'readiness.service', readiness?.service);
      if (readiness?.capability?.id !== 'investment-platform') mismatch(failures, 'capability.id', readiness?.capability?.id);
      if (readiness?.capability?.technicalStatus !== 'PARTIAL') mismatch(failures, 'capability.technicalStatus', readiness?.capability?.technicalStatus);
      if (readiness?.capability?.publicStatus !== 'BETA') mismatch(failures, 'capability.publicStatus', readiness?.capability?.publicStatus);
      if (readiness?.deployment?.provider !== 'render') mismatch(failures, 'deployment.provider', readiness?.deployment?.provider);
      if (deploymentCommit !== expectedSha) mismatch(failures, 'deployment.commit', deploymentCommit);
      if (readiness?.deployment?.branch !== expectedBranch) mismatch(failures, 'deployment.branch', readiness?.deployment?.branch);
      if (readiness?.schema?.compatible !== true) failures.push('schema.compatible!=true');
      if (readiness?.schema?.expectedMigration !== expectedMigration) mismatch(failures, 'schema.expectedMigration', readiness?.schema?.expectedMigration);
      if (readiness?.schema?.expectedMigrationName !== expectedMigrationName) mismatch(failures, 'schema.expectedMigrationName', readiness?.schema?.expectedMigrationName);
      if (readiness?.schema?.expectedMigrationCount !== expectedMigrationCount) mismatch(failures, 'schema.expectedMigrationCount', readiness?.schema?.expectedMigrationCount);
      if (readiness?.checks?.databaseSchemaCompatible !== true) failures.push('checks.databaseSchemaCompatible!=true');
      if (readiness?.checks?.privilegedSchemaProbeConfigured !== true) failures.push('checks.privilegedSchemaProbeConfigured!=true');
      if (readiness?.checks?.productionDeploymentIdentified !== true) failures.push('checks.productionDeploymentIdentified!=true');
      if (readiness?.checks?.technicalMaturityHonest !== true) failures.push('checks.technicalMaturityHonest!=true');
      if (readiness?.checks?.publicReleaseStageHonest !== true) failures.push('checks.publicReleaseStageHonest!=true');
      if (readiness?.evidence?.ciOperationalGoldenJourney !== 'certified') mismatch(failures, 'evidence.ciOperationalGoldenJourney', readiness?.evidence?.ciOperationalGoldenJourney);
      if (readiness?.evidence?.productionDeploymentReadiness !== 'verified') mismatch(failures, 'evidence.productionDeploymentReadiness', readiness?.evidence?.productionDeploymentReadiness);
      if (readiness?.evidence?.productionOperatingEvidence !== 'pending') mismatch(failures, 'evidence.productionOperatingEvidence', readiness?.evidence?.productionOperatingEvidence);
      if (readiness?.evidence?.mutationMode !== 'read-only') mismatch(failures, 'evidence.mutationMode', readiness?.evidence?.mutationMode);
    }
  } catch (error) {
    failures.push(`readiness.request_error=${error instanceof Error ? error.name : 'UnknownError'}`);
  }

  try {
    const surfaceResult = await fetchWithTimeout(investmentUrl, 'text/html');
    observed.surfaceHttp = surfaceResult.response.status;
    const finalSurfaceUrl = new URL(surfaceResult.response.url);
    const expectedSurfaceUrl = new URL(investmentUrl);
    observed.surfaceFinalUrl = finalSurfaceUrl.protocol === 'https:' ? finalSurfaceUrl.href : null;
    if (!surfaceResult.response.ok) mismatch(failures, 'surface.http', surfaceResult.response.status);
    if (!surfaceResult.response.headers.get('content-type')?.toLowerCase().includes('text/html')) {
      mismatch(failures, 'surface.contentType', surfaceResult.response.headers.get('content-type'));
    }
    if (
      finalSurfaceUrl.protocol !== 'https:'
      || finalSurfaceUrl.origin !== expectedSurfaceUrl.origin
      || finalSurfaceUrl.pathname !== expectedSurfaceUrl.pathname
      || finalSurfaceUrl.search !== ''
    ) {
      mismatch(failures, 'surface.finalPath', `${finalSurfaceUrl.origin}${finalSurfaceUrl.pathname}${finalSurfaceUrl.search}`);
    }
    if (surfaceResult.body.length < 500) mismatch(failures, 'surface.bodyLength', surfaceResult.body.length);
  } catch (error) {
    failures.push(`surface.request_error=${error instanceof Error ? error.name : 'UnknownError'}`);
  }

  return { observed, failures };
}

function buildEvidence(result, observed, failures) {
  return createInvestmentProductionReadinessEvidence({
    classification,
    origin: healthOrigin,
    result,
    expectedSha,
    expectedBranch,
    expectedMigration,
    expectedMigrationName,
    expectedMigrationCount,
    observed,
    failures,
  });
}

async function persistEvidence(evidence) {
  if (!evidencePath) return;
  await mkdir(dirname(evidencePath), { recursive: true });
  await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let lastProbe = { observed: emptyObserved(), failures: ['canary.not_run'] };

for (let attempt = 1; attempt <= attempts; attempt += 1) {
  lastProbe = await runProbe();
  if (lastProbe.failures.length === 0) {
    const evidence = buildEvidence('PASS', lastProbe.observed, []);
    await persistEvidence(evidence);
    console.log(JSON.stringify({ attempt, ...evidence }, null, 2));
    process.exit(0);
  }

  console.log(JSON.stringify({
    result: 'RETRY',
    attempt,
    attempts,
    observed: lastProbe.observed,
    failures: lastProbe.failures,
  }, null, 2));
  if (attempt < attempts) await sleep(intervalMs);
}

const failureReasons = lastProbe.failures.length > 0 ? lastProbe.failures : ['canary.unknown_failure'];
const evidence = buildEvidence('FAIL', lastProbe.observed, failureReasons);
await persistEvidence(evidence);
console.error(JSON.stringify(evidence, null, 2));
process.exit(1);
