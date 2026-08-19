import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const logger = await read('src/lib/observability/logger.ts');
const requestContext = await read('src/lib/observability/request-context.ts');
const healthRoute = await read('src/app/api/health/route.ts');

for (const field of [
  'deployment_provider',
  'deployment_commit',
  'deployment_branch',
  'deployment_service',
  'expected_database_migration',
]) {
  assert.ok(logger.includes(field), `Structured logger must include ${field}.`);
}

for (const sensitiveKey of ['password', 'authorization', 'service_role', 'access_token', 'refresh_token']) {
  assert.ok(logger.includes(`'${sensitiveKey}'`), `Sensitive-field redaction must include ${sensitiveKey}.`);
}

assert.ok(
  requestContext.includes("['x-request-id', 'x-correlation-id']"),
  'Request correlation must accept standard request/correlation headers.',
);
assert.ok(
  requestContext.includes('crypto.randomUUID()'),
  'Request correlation must create an ID when upstream did not provide one.',
);
assert.ok(
  requestContext.includes('REQUEST_ID_PATTERN'),
  'Untrusted request IDs must be validated before they enter logs or response headers.',
);

assert.ok(
  healthRoute.includes('getRequestObservabilityContext(request)'),
  'Health checks must participate in request correlation.',
);
assert.ok(
  healthRoute.includes("'X-Request-ID': requestContext.request_id"),
  'Health responses must expose the same safe request ID used for logging.',
);
assert.ok(
  healthRoute.includes('...requestContext'),
  'Health log events must include the request correlation context.',
);
assert.ok(
  !healthRoute.includes('SUPABASE_SERVICE_ROLE_KEY'),
  'Public health route must not inspect or expose the Supabase service-role secret.',
);

console.log('Observability invariants: PASS');
