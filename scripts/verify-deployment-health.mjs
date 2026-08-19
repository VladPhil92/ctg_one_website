import { readFile } from 'node:fs/promises';

const healthUrl = process.env.HEALTH_URL ?? 'https://ctgone.com/api/health';
const expectedSha = process.env.EXPECTED_DEPLOYMENT_SHA?.trim() ?? '';
const expectedBranch = process.env.EXPECTED_DEPLOYMENT_BRANCH?.trim() || 'main';
const attempts = Number(process.env.CANARY_ATTEMPTS ?? '24');
const intervalMs = Number(process.env.CANARY_INTERVAL_MS ?? '25000');
const requestTimeoutMs = Number(process.env.CANARY_REQUEST_TIMEOUT_MS ?? '10000');

if (!/^[0-9a-f]{40}$/i.test(expectedSha)) {
  throw new Error('EXPECTED_DEPLOYMENT_SHA must be a full 40-character Git commit SHA.');
}
if (!Number.isInteger(attempts) || attempts < 1 || attempts > 60) {
  throw new Error('CANARY_ATTEMPTS must be an integer between 1 and 60.');
}
if (!Number.isInteger(intervalMs) || intervalMs < 1000 || intervalMs > 120000) {
  throw new Error('CANARY_INTERVAL_MS must be between 1000 and 120000 milliseconds.');
}
if (!Number.isInteger(requestTimeoutMs) || requestTimeoutMs < 1000 || requestTimeoutMs > 30000) {
  throw new Error('CANARY_REQUEST_TIMEOUT_MS must be between 1000 and 30000 milliseconds.');
}

const schemaVersionSource = await readFile(
  new URL('../src/lib/observability/schema-version.ts', import.meta.url),
  'utf8'
);
const migrationMatch = /EXPECTED_DATABASE_MIGRATION\s*=\s*['"](\d{4})['"]/.exec(schemaVersionSource);
const migrationCountMatch = /EXPECTED_DATABASE_MIGRATION_COUNT\s*=\s*(\d+)/.exec(schemaVersionSource);
if (!migrationMatch || !migrationCountMatch) {
  throw new Error('Unable to resolve expected database migration metadata from schema-version.ts.');
}
const expectedMigration = migrationMatch[1];
const expectedMigrationCount = Number(migrationCountMatch[1]);

function validatePayload(payload) {
  const failures = [];
  if (payload?.status !== 'ok') failures.push(`status=${String(payload?.status)}`);
  if (payload?.service !== 'ctg-one-web') failures.push(`service=${String(payload?.service)}`);
  if (payload?.deployment?.provider !== 'render') {
    failures.push(`deployment.provider=${String(payload?.deployment?.provider)}`);
  }
  if (payload?.deployment?.commit !== expectedSha) {
    failures.push(`deployment.commit=${String(payload?.deployment?.commit)}`);
  }
  if (payload?.deployment?.branch !== expectedBranch) {
    failures.push(`deployment.branch=${String(payload?.deployment?.branch)}`);
  }
  if (payload?.deployment?.expectedDatabaseMigration !== expectedMigration) {
    failures.push(
      `deployment.expectedDatabaseMigration=${String(payload?.deployment?.expectedDatabaseMigration)}`
    );
  }
  if (payload?.checks?.deploymentCommitAvailable !== true) {
    failures.push('checks.deploymentCommitAvailable!=true');
  }
  if (payload?.checks?.databaseSchemaCompatible !== true) {
    failures.push('checks.databaseSchemaCompatible!=true');
  }
  if (payload?.schema?.compatible !== true) failures.push('schema.compatible!=true');
  if (payload?.schema?.expectedMigrationCount !== expectedMigrationCount) {
    failures.push(`schema.expectedMigrationCount=${String(payload?.schema?.expectedMigrationCount)}`);
  }
  return failures;
}

function summarize(payload, httpStatus) {
  return {
    httpStatus,
    status: payload?.status ?? null,
    deployment: {
      provider: payload?.deployment?.provider ?? null,
      commit: payload?.deployment?.commit ?? null,
      branch: payload?.deployment?.branch ?? null,
      expectedDatabaseMigration: payload?.deployment?.expectedDatabaseMigration ?? null,
    },
    schema: {
      compatible: payload?.schema?.compatible ?? null,
      expectedMigrationCount: payload?.schema?.expectedMigrationCount ?? null,
    },
  };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let lastDiagnostic = null;

for (let attempt = 1; attempt <= attempts; attempt += 1) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
    let response;
    let body;
    try {
      response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Cache-Control': 'no-cache',
          'User-Agent': 'ctg-one-post-deploy-health-canary/1.0',
        },
        cache: 'no-store',
        signal: controller.signal,
      });
      body = await response.text();
    } finally {
      clearTimeout(timer);
    }

    let payload = null;
    try {
      payload = JSON.parse(body);
    } catch {
      lastDiagnostic = {
        attempt,
        error: `Health endpoint returned non-JSON response (HTTP ${response.status}).`,
        bodyPreview: body.slice(0, 240),
      };
    }

    if (payload) {
      const failures = validatePayload(payload);
      lastDiagnostic = {
        attempt,
        ...summarize(payload, response.status),
        failures,
      };
      if (response.ok && failures.length === 0) {
        console.log(JSON.stringify({
          result: 'PASS',
          attempt,
          healthUrl,
          expectedSha,
          expectedBranch,
          expectedMigration,
          expectedMigrationCount,
          observed: summarize(payload, response.status),
        }, null, 2));
        process.exit(0);
      }
    }
  } catch (error) {
    lastDiagnostic = {
      attempt,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  console.log(`Deployment canary attempt ${attempt}/${attempts} not converged yet.`);
  console.log(JSON.stringify(lastDiagnostic, null, 2));
  if (attempt < attempts) await sleep(intervalMs);
}

console.error(JSON.stringify({
  result: 'FAIL',
  message: 'Production did not converge to the expected Git/Render/Supabase identity within the bounded canary window.',
  healthUrl,
  expectedSha,
  expectedBranch,
  expectedMigration,
  expectedMigrationCount,
  lastDiagnostic,
}, null, 2));
process.exit(1);
