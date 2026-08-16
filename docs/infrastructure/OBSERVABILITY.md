# CTG One Observability Baseline

## Current baseline

Phase 5 introduces two production-safe primitives without adding an external monitoring vendor:

1. `GET /api/health` — non-cached liveness/configuration endpoint.
2. `src/lib/observability/logger.ts` — structured JSON logging with basic credential redaction.

The health endpoint reports only non-secret configuration state and the short Render commit identifier when available. It must never expose service-role keys, access tokens, cookies or credentials.

## Logging contract

Application logs should use stable event names and structured context rather than free-form strings. Sensitive field names such as password, token, authorization, cookie, secret and service-role values are redacted before serialization.

Recommended event dimensions:

- event name
- severity
- request or correlation ID when available
- authenticated role, never raw credentials
- bounded context
- operation outcome
- latency when measurable
- safe entity identifiers
- Render commit/environment

## Health semantics

`status: ok` means required public Supabase configuration and the canonical site URL are present.

`status: degraded` means one or more of those non-secret settings are absent. The endpoint still returns HTTP 200 because it is a liveness surface and should not create a restart loop merely because a dependent configuration is incomplete.

## Roadmap

- Centralized error capture (for example Sentry or equivalent) after cost/privacy review.
- Request correlation IDs.
- API latency and failure-rate metrics.
- Auth/KYC/investment critical-event telemetry.
- Alert thresholds for repeated authentication failures and transactional errors.
- Render health-check configuration pointing at `/api/health`.
- Trace propagation across future AI and integration services.
