import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const logger = await read('src/lib/observability/logger.ts');
const requestContext = await read('src/lib/observability/request-context.ts');
const errorTelemetry = await read('src/lib/observability/error-telemetry.ts');
const healthRoute = await read('src/app/api/health/route.ts');
const knowledgeQuery = await read('src/app/api/knowledge/query/route.ts');
const knowledgeIngest = await read('src/app/api/knowledge/admin/ingest/route.ts');
const runtimeSchema = await read('src/lib/observability/runtime-schema.ts');

for (const field of [
  'telemetry_schema',
  'deployment_provider',
  'deployment_commit',
  'deployment_branch',
  'deployment_service',
  'expected_database_migration',
]) {
  assert.ok(logger.includes(field), `Structured logger must include ${field}.`);
}
assert.ok(
  logger.includes("'ctg.one.telemetry.v2'"),
  'Structured telemetry must expose an explicit schema version for downstream consumers.',
);

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
  requestContext.includes('TRACEPARENT_PATTERN'),
  'Trace correlation must validate inbound W3C traceparent headers.',
);
assert.ok(
  requestContext.includes("trace_flags: '01'"),
  'Locally-created traces must use an explicit sampled trace flag.',
);
assert.ok(
  requestContext.includes('isNonZeroHex(traceId) && isNonZeroHex(parentSpanId)'),
  'All-zero W3C trace/span identifiers must be rejected.',
);
assert.ok(
  requestContext.includes('formatTraceparent'),
  'Observability context must support standards-compatible traceparent propagation.',
);

assert.ok(
  errorTelemetry.includes("createHash('sha256')"),
  'Error intelligence must generate stable opaque fingerprints without publishing raw messages.',
);
assert.ok(
  errorTelemetry.includes("error_fingerprint"),
  'Error telemetry must expose a grouping fingerprint.',
);
assert.ok(
  errorTelemetry.includes("retryable"),
  'Error telemetry must classify whether a failure category is retryable.',
);
assert.ok(
  !errorTelemetry.includes('error_message:'),
  'Safe error telemetry must not emit raw error messages.',
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
  healthRoute.includes('traceparent: formatTraceparent(requestContext)'),
  'Health responses must propagate W3C trace context.',
);
assert.ok(
  healthRoute.includes('...requestContext'),
  'Health log events must include the request correlation context.',
);
assert.ok(
  !healthRoute.includes('SUPABASE_SERVICE_ROLE_KEY'),
  'Public health route must not inspect or expose the Supabase service-role secret.',
);

for (const [name, route] of [
  ['knowledge query', knowledgeQuery],
  ['knowledge ingestion', knowledgeIngest],
]) {
  assert.ok(
    route.includes('traceparent: formatTraceparent(requestContext)'),
    `${name} responses must propagate the same W3C trace context used in logs.`,
  );
  assert.ok(
    route.includes('getSafeErrorTelemetry(error)'),
    `${name} failures must use safe classified error telemetry.`,
  );
  assert.ok(
    !route.includes("error: error instanceof Error ? error.message"),
    `${name} logs must not emit raw exception messages.`,
  );
}

assert.ok(
  runtimeSchema.includes('EXPECTED_DATABASE_MIGRATION,'),
  'Runtime schema compatibility must import the exact logical migration expected by the release.',
);
assert.ok(
  runtimeSchema.includes('const timestampEraMatch = /^(\\d{4})_(.+)$/.exec(name)'),
  'Runtime schema compatibility must parse the logical NNNN_ prefix emitted by timestamp-era migrations.',
);
assert.ok(
  runtimeSchema.includes('logicalVersion !== EXPECTED_DATABASE_MIGRATION'),
  'Runtime schema compatibility must reject a timestamp-era logical version that differs from the release expectation.',
);
assert.ok(
  runtimeSchema.includes('observedLatestMigrationName === EXPECTED_DATABASE_MIGRATION_NAME'),
  'Runtime schema compatibility must compare the validated semantic migration name against the release expectation.',
);

console.log('Observability invariants: PASS');