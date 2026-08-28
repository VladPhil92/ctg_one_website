# CTG One AI Model Gateway

Status: **PARTIAL — shared runtime foundation, not a general production agent platform**

## Purpose

The model gateway is the server-only boundary between CTG One application code and external AI model providers. Business routes must depend on this boundary instead of importing a provider implementation directly.

Current first consumer: **CTG Knowledge v0.2**.

## Current contract

`src/lib/ai/model-gateway.ts` owns:

- provider selection through an explicit allowlist;
- configuration version identity;
- provider readiness checks;
- provider-independent embedding and grounded-response entry points;
- safe telemetry propagation to application observability.

`src/lib/ai/openai.ts` is the current provider adapter. It owns:

- OpenAI authentication on the server only;
- embedding and Responses API payloads;
- bounded request timeout;
- bounded retry policy for transient failures;
- provider request-ID capture;
- token-usage capture;
- model identity.

## Resilience policy

The OpenAI adapter currently enforces:

- timeout default: 15 seconds;
- timeout clamp: 1–60 seconds;
- attempts default: 2;
- attempts clamp: 1–3;
- retries only for transport timeouts/errors and retryable HTTP responses (`408`, `409`, `429`, `5xx`);
- bounded exponential delay between retries;
- no retry loop without a hard attempt ceiling.

Operators may tune the bounded values with `OPENAI_REQUEST_TIMEOUT_MS` and `OPENAI_MAX_ATTEMPTS`. The application does not accept arbitrary unbounded values.

## Observability

Knowledge-query logs may contain:

- request/correlation ID;
- provider name;
- configuration version;
- model identity;
- provider request ID;
- attempt count;
- latency;
- input/output/total token counts;
- retrieval source count, citation count and top similarity.

They must **not** log API keys, full prompts, retrieved source content, generated answer text or document bodies.

Provider token usage is measured. Monetary cost is deliberately **not** estimated from hard-coded prices because provider pricing is external and can change. A future cost ledger must use explicitly versioned pricing data or provider billing evidence.

## Security boundary

- `OPENAI_API_KEY` is server-only and must never use a `NEXT_PUBLIC_` prefix.
- Unsupported `CTG_AI_PROVIDER` values fail closed; the gateway does not silently fall back to another provider.
- Model output cannot bypass deterministic grounding validation, RLS, server-side authorization or business-state transitions.
- OpenAI response storage remains disabled (`store: false`) for CTG Knowledge generation.
- Source documents remain untrusted data; prompt instructions embedded inside them are not executable instructions.

## Current limitations

This gateway does **not** yet provide:

- a second production provider;
- cross-provider automatic failover;
- provider health scoring;
- durable usage/cost ledgering;
- centralized traces/metrics backend;
- autonomous tool execution;
- a general-purpose agent runtime.

Therefore the shared AI layer remains **IN DEVELOPMENT** and CTG Knowledge remains **PARTIAL / BETA**.

## Promotion path

A future promotion requires production evidence for:

1. provider/model configuration and authorization;
2. evaluation thresholds and regression evidence;
3. latency/error/token telemetry;
4. explicit cost-accounting policy;
5. data-boundary review;
6. human accountability for consequential outputs;
7. failure/fallback behavior;
8. no cross-business-unit authorization leakage.
