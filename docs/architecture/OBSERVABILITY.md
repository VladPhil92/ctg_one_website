# CTG One Observability v0.2

Status: **PARTIAL — implemented shared telemetry foundation, external monitoring/alerting not yet centralized**

## Purpose

CTG One observability must make production behavior diagnosable without leaking credentials, private documents, prompts, payment evidence or participant data.

The v0.2 foundation standardizes correlation and error grouping across server boundaries while keeping provider-neutral external monitoring as a future integration decision.

## Correlation model

Critical server routes use two complementary identifiers:

- `X-Request-ID` — human/support correlation identifier. A validated inbound value is preserved; otherwise the server generates one.
- W3C `traceparent` — machine-compatible distributed trace context.

For a valid inbound W3C `traceparent`, CTG One preserves the trace ID and incoming span as `parent_span_id`, then creates a new server span. Invalid or all-zero trace/span identifiers are rejected and replaced with a new local trace.

Current critical adoption:

- `/api/health`;
- CTG Knowledge query;
- CTG Knowledge admin ingestion.

Structured logs include `request_id`, `trace_id`, `span_id`, optional `parent_span_id`, method and pathname where available. Responses expose the current request ID and traceparent so downstream systems can correlate without parsing log text.

## Structured telemetry schema

Logs emitted by `src/lib/observability/logger.ts` carry:

`telemetry_schema = ctg.one.telemetry.v2`

The explicit schema version protects future log consumers from silent shape drift.

Every structured log also carries deployment identity and expected database migration metadata. Sensitive keys remain recursively redacted.

## Safe error intelligence

`src/lib/observability/error-telemetry.ts` converts exceptions into a bounded diagnostic envelope:

- `error_class`;
- `error_type`;
- safe `error_code` when present;
- opaque SHA-256-derived `error_fingerprint`;
- `retryable` classification.

The fingerprint may incorporate a normalized error message internally, but the message itself is **never emitted** by this helper. UUIDs and numeric instances are normalized before hashing so equivalent failures group together more reliably without publishing runtime data.

Current classes are:

- timeout;
- rate limit;
- validation;
- authentication;
- authorization;
- database;
- upstream;
- internal.

This is diagnostic grouping, not automated remediation. The classification cannot authorize retries of financial or other consequential operations by itself.

## Security rules

Observability must not log:

- passwords, tokens, cookies, authorization headers or service-role secrets;
- raw KYC/payment evidence;
- full RAG prompts or retrieved document content;
- generated answer bodies merely for debugging;
- database connection strings;
- arbitrary exception messages when a safe error envelope can be used.

Trace and request identifiers are operational metadata, not authorization credentials.

## Current limitations

v0.2 does not yet provide:

- centralized OpenTelemetry collector/exporter;
- durable metrics/time-series backend;
- centralized exception-monitoring SaaS;
- SLO/error-budget automation;
- paging/on-call alerting;
- distributed traces across every bounded context;
- automated remediation.

Therefore Observability is **PARTIAL**, not LIVE as a complete shared platform capability.

## Next promotion steps

1. expand trace-context adoption across critical mutation APIs;
2. define service-level indicators for auth, investment checkout, payment reconciliation and AI query paths;
3. select or implement a centralized telemetry sink without weakening privacy boundaries;
4. add alert thresholds based on measured production baselines;
5. demonstrate incident diagnosis and recovery using retained production-safe evidence;
6. document retention/access controls for centralized telemetry before broader rollout.
