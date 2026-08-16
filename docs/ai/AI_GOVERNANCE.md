# CTG One AI Governance

## Principle

CTG One should increase AI autonomy only as evidence, controls, and accountability increase.

The governance model applies to any model-assisted feature used by CTG One Technology or its business units.

## 1. Human-in-the-loop

Consequential decisions must not depend exclusively on model output.

Human approval is required, at minimum, for AI-assisted actions involving:

- financial transfers or settlement;
- KYC acceptance/rejection;
- legal conclusions or filings;
- employment or disciplinary decisions;
- medical/veterinary diagnosis or treatment recommendations used operationally;
- irreversible customer/account actions;
- publication of materially sensitive external communications.

Automation may assist preparation, classification, prioritization, or recommendation, but deterministic authorization remains outside the model.

## 2. Data governance

Every use case must define:

- permitted source systems;
- data owner;
- PII classification;
- minimum required fields;
- whether model-provider retention/training is permitted;
- storage and deletion rules;
- cross-business-unit access boundaries.

RLS and server-side authorization remain authoritative. AI tooling must never become an alternate path around them.

## 3. Prompt and configuration control

Production AI behavior should be versioned.

Track, where applicable:

- system/instruction version;
- model/provider/version;
- tool definitions;
- retrieval configuration;
- safety/policy configuration;
- evaluation version;
- release date.

Secrets and sensitive prompts must not be exposed to client-side bundles or public logs.

## 4. Evaluation

Each production use case needs a repeatable evaluation set representing:

- normal tasks;
- ambiguous inputs;
- missing context;
- adversarial/prompt-injection attempts where relevant;
- sensitive data handling;
- refusal/fallback cases;
- regression from model or prompt changes.

Evaluation thresholds must be defined by use case rather than a single universal score.

## 5. Grounding and hallucination controls

When factual grounding matters:

- retrieve from approved sources;
- preserve source references;
- distinguish sourced facts from model inference;
- instruct the system to abstain when evidence is insufficient;
- validate structured outputs before use;
- route uncertain or consequential cases to humans.

## 6. Tools and agent permissions

Agent tools must follow least privilege.

Every tool should define:

- allowed operation;
- allowed resource scope;
- read/write permission;
- input validation;
- rate/usage limits;
- whether confirmation is required;
- audit event emitted after execution.

An agent must not receive broad database/service credentials merely for convenience.

## 7. Failure handling

Every production AI flow must define:

- timeout;
- retry policy;
- invalid-output handling;
- provider/model unavailable path;
- deterministic fallback when possible;
- escalation target;
- user-facing error behavior.

Silent failure or fabricated success is unacceptable.

## 8. Observability and audit

Measure, subject to privacy restrictions:

- request volume;
- model/provider/version;
- latency;
- errors/timeouts;
- token or equivalent usage;
- cost;
- tool/action execution;
- human overrides;
- evaluation/regression status.

Do not log raw sensitive content by default merely for debugging.

## 9. Cost governance

Before broad deployment define:

- per-use-case budget;
- maximum request/input size;
- model selection policy;
- caching strategy where safe;
- abnormal-usage alerts;
- cost per successful task.

The most capable model is not automatically the correct model.

## 10. Security

Threat modeling should include:

- prompt injection;
- indirect prompt injection through retrieved content;
- data exfiltration;
- tool abuse;
- excessive agency;
- secret leakage;
- cross-tenant/business-unit leakage;
- unsafe generated commands or URLs.

Model output is untrusted input until validated.

## 11. Release states

### IN DEVELOPMENT

Architecture/prototype may exist, but the system is not represented as production capability.

### PILOT / PARTIAL

A bounded group may use the capability with monitoring and human controls. Public claims must describe the limitation.

### LIVE

Production use is approved only after data boundaries, authorization, evaluations, monitoring, fallback behavior, cost controls, and accountable ownership are documented.

### SUSPENDED

Any AI capability can be disabled when quality, cost, security, provider behavior, or legal/compliance conditions no longer meet its release criteria.

## Phase 4 decision

At the completion of Phase 4, CTG One's general AI runtime remains **IN DEVELOPMENT**. This is intentional. Phase 4 creates the architectural and governance contract required to build the first narrow production use case responsibly.
