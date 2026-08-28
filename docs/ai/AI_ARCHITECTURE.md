# CTG One AI Architecture

## Status

The shared AI layer remains **IN DEVELOPMENT**. CTG Knowledge is the current bounded **PARTIAL / BETA** pilot.

The repository now contains a real authenticated RAG pilot, provider integration, evaluation tooling and a shared model-gateway foundation. These are meaningful implementation milestones, but they do not establish a general-purpose production agent platform.

## Objective

CTG One should build AI as a governed shared capability inside CTG One OS, not as isolated model calls embedded randomly across business units.

Target flow:

`AUTHORIZED DATA -> CONTEXT -> MODEL GATEWAY -> MODEL -> AGENT -> WORKFLOW -> BUSINESS OPERATION`

Every transition must be bounded by authorization, validation, traceability, evaluation, and fallback behavior.

## Architectural components

### 1. Data Boundary — IN DEVELOPMENT

Responsibilities:

- define allowed data sources;
- classify PII, financial, operational, and public data;
- minimize data sent to models;
- enforce authorization before retrieval or inference;
- prevent cross-unit data leakage;
- document retention and deletion expectations.

### 2. Context Layer — PARTIAL

Current evidence includes the CTG Knowledge curated-document pipeline, pgvector retrieval, business-unit filtering, source metadata and deterministic citation validation.

Target responsibilities remain:

- retrieve only authorized context;
- attach source references where possible;
- preserve domain boundaries;
- support semantic retrieval/RAG;
- record enough provenance to audit why a response was generated.

CTG Knowledge may remain labeled PARTIAL/BETA while controlled evaluation and operating evidence are incomplete.

### 3. Model Gateway — PARTIAL

`src/lib/ai/model-gateway.ts` is now the shared server-only boundary used by CTG Knowledge rather than allowing the product route to depend directly on a provider module.

Current capabilities:

- explicit provider allowlist and fail-closed unsupported-provider behavior;
- versioned AI runtime configuration;
- shared embedding and grounded-response interfaces;
- bounded provider timeout;
- bounded transient-error retry policy;
- model identity, provider request ID, latency, attempt-count and token-usage telemetry;
- server-only credential boundary.

The current provider adapter is OpenAI. Multi-provider routing, automatic failover and durable cost accounting are not implemented, so the gateway remains PARTIAL rather than LIVE.

See `docs/ai/MODEL_GATEWAY.md`.

### 4. Agent Runtime — IN DEVELOPMENT

An agent is not simply a chatbot. A production agent must have:

- a defined job;
- explicit tools;
- limited permissions;
- bounded context;
- deterministic validation around actions;
- human escalation paths;
- audit events for consequential actions.

The first production agents should be narrow rather than autonomous general-purpose agents. CTG Knowledge is retrieval assistance and does not have autonomous business-action privileges.

### 5. Workflow Orchestration — PARTIAL

The current platform already contains deterministic server-side flows, database triggers, domain-event outbox conventions, validation, state transitions and protected actions. These are the appropriate foundation for future AI-assisted workflows.

AI output must feed deterministic application logic rather than bypass it.

### 6. Evaluation & Observability — PARTIAL

Current evidence includes:

- deterministic grounding/citation integrity checks;
- reproducible evaluation harnesses;
- versioned evaluation corpus and controlled capture workflow;
- request correlation on CTG Knowledge queries;
- provider/model/config-version telemetry;
- provider latency, retry count and token-usage capture.

Still missing for a mature shared AI platform:

- centralized traces/metrics/error-monitoring backend;
- durable provider usage/cost ledger;
- production alert thresholds;
- human-reviewed authorized evaluation evidence sufficient for LIVE promotion;
- model/provider regression evidence across multiple runtime configurations.

Before any AI capability becomes LIVE, CTG One should measure:

- task success;
- factuality/groundedness where relevant;
- policy violations;
- refusal/fallback behavior;
- latency;
- provider/model errors;
- token consumption and cost;
- human override rates;
- regression across model/prompt/config changes.

## Initial use-case order

Recommended progression:

1. **Document intelligence** — extraction, classification, summarization, human-reviewed.
2. **Knowledge assistant** — bounded internal knowledge with citations and authorization.
3. **Operational copilot** — recommendations over approved operating data without autonomous execution.
4. **Customer support assistance** — classification and draft responses with escalation.
5. **Action-taking agents** — only after governance, evaluations, permissions, and auditability are mature.

## Production promotion criteria

An AI capability may move to `LIVE` only when all of the following exist:

- production code and configured provider/model;
- approved data boundary;
- authorization model;
- evaluation fixtures and acceptance threshold;
- model/prompt/config version tracking;
- failure and fallback behavior;
- usage/cost measurement;
- observability and error reporting;
- human accountability for consequential outputs;
- documented limitations.

## Non-goals

The AI architecture does not:

- expose API keys;
- add a chatbot merely to claim AI capability;
- implement autonomous financial actions;
- allow AI to bypass RLS or server-side authorization;
- claim the shared agent runtime is already LIVE;
- treat one configured model provider as proof of provider-agnostic production failover.
