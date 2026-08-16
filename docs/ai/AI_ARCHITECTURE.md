# CTG One AI Architecture

## Status

Phase 4 architecture definition. The AI layer is **IN DEVELOPMENT**.

No production model runtime, agent framework, embeddings pipeline, vector retrieval system, or RAG implementation was verified in the repository at the start of this phase. This document therefore defines the target architecture and promotion criteria without presenting roadmap functionality as live.

## Objective

CTG One should build AI as a governed shared capability inside CTG One OS, not as isolated model calls embedded randomly across business units.

Target flow:

`AUTHORIZED DATA -> CONTEXT -> MODEL -> AGENT -> WORKFLOW -> BUSINESS OPERATION`

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

### 2. Context Layer — IN DEVELOPMENT

Target responsibilities:

- retrieve only authorized context;
- attach source references where possible;
- preserve domain boundaries;
- support future semantic retrieval/RAG;
- record enough provenance to audit why a response was generated.

RAG must not be described as LIVE until retrieval, indexing/embedding strategy, authorization, evaluation, and production deployment are implemented.

### 3. Model Gateway — ROADMAP

A future shared gateway should abstract:

- provider;
- model family/version;
- inference parameters;
- policy configuration;
- timeout/retry behavior;
- token and cost accounting;
- model allowlists by use case;
- fallback selection.

Business code should avoid hard-coding a single provider throughout the application.

### 4. Agent Runtime — IN DEVELOPMENT

An agent is not simply a chatbot. A production agent must have:

- a defined job;
- explicit tools;
- limited permissions;
- bounded context;
- deterministic validation around actions;
- human escalation paths;
- audit events for consequential actions.

The first production agents should be narrow rather than autonomous general-purpose agents.

### 5. Workflow Orchestration — PARTIAL

The current platform already contains deterministic server-side flows, database triggers, validation, state transitions, and protected actions. These are the appropriate foundation for future AI-assisted workflows.

AI output must feed deterministic application logic rather than bypass it.

### 6. Evaluation & Observability — ROADMAP

Before any AI capability becomes LIVE, CTG One should measure:

- task success;
- factuality/groundedness where relevant;
- policy violations;
- refusal/fallback behavior;
- latency;
- provider/model errors;
- token consumption and cost;
- human override rates;
- regression across model/prompt changes.

## Initial use-case order

Recommended progression:

1. **Document intelligence** — extraction, classification, summarization, human-reviewed.
2. **Knowledge assistant** — bounded internal knowledge with citations and authorization.
3. **Operational copilot** — recommendations over approved operating data without autonomous execution.
4. **Customer support assistance** — classification and draft responses with escalation.
5. **Action-taking agents** — only after governance, evaluations, permissions, and auditability are mature.

## Production promotion criteria

An AI capability may move from `IN DEVELOPMENT` to `LIVE` only when all of the following exist:

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

## Non-goals for Phase 4

Phase 4 does not:

- select or lock CTG One into a specific model provider;
- expose API keys;
- add a chatbot merely to claim AI capability;
- implement autonomous financial actions;
- allow AI to bypass RLS or server-side authorization;
- claim RAG or agents are already live.
