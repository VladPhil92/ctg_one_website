# CTG One AI — Evaluation

## Purpose

AI capabilities are not promoted to LIVE because demos look convincing. Release decisions require reproducible evaluation.

## Core dimensions

- Accuracy
- Groundedness
- Citation correctness
- Retrieval quality
- Safety and policy compliance
- Latency
- Cost
- Task completion

## Release pipeline

`corpus -> dataset -> run -> score -> human review -> compare -> release decision`

Evaluation datasets should represent real, authorized use cases while minimizing unnecessary personal or sensitive data.

## Grounding integrity baseline

CTG Knowledge applies a deterministic post-generation integrity gate before a response may be returned as `grounded: true`.

The gate verifies that:

- the generated answer contains at least one numeric citation;
- every numeric citation points to a source that was actually supplied to the model for that request;
- a mixture of valid and fabricated citations fails closed;
- validation is provider-independent and does not require an additional model call;
- rejection telemetry records citation/source counts and invalid citation identifiers, but never logs the generated answer text.

If the gate fails, the API returns the standard insufficient-evidence response with `grounded: false` and no source list. This prevents fabricated source identifiers or uncited model output from being represented as grounded knowledge.

This is an integrity control, not a semantic truth oracle. It does not prove that each cited source actually entails every generated claim.

## Reproducible evaluation harness

CTG Knowledge has a provider-independent scoring harness for already-captured evaluation runs. The detailed scoring contract is defined in `docs/ai/CTG_KNOWLEDGE_EVALUATION.md`.

The harness measures retrieval recall/ranking, citation validity/relevance, no-evidence abstention, reviewed grounded-case quality, safety, human-review coverage, latency and estimated cost when supplied.

Synthetic CI fixtures validate the scorer itself but are categorically ineligible to become release evidence. Real semantic groundedness, citation entailment and operating quality still require an authorized representative dataset, captured real runs, and human-reviewed scoring before any LIVE promotion.

The scorer produces regression evidence only. It does not mutate `Technology Proof`, deploy a model, or automatically promote a capability.

## Versioned corpus provenance

A representative dataset must also be bound to reviewed evidence rather than floating over whatever documents happen to exist at execution time.

The first-party public corpus contract is defined in `docs/ai/CTG_KNOWLEDGE_EVALUATION_CORPUS.md`. Its source manifest pins exact Git blob identities and Markdown sections. CI recomputes those identities and fails closed when source content drifts.

The corpus packager is provider-independent and emits stable evaluation source URIs. It does not ingest data, call a model, or create operating evidence. A real captured run is a separate controlled step.

## Regression discipline

Material changes to corpus, dataset, model, prompt, retrieval, tool policy, grounding validation or system configuration should be evaluated against deliberately versioned fixtures before production promotion.

Source changes that alter evaluation meaning require corpus/dataset review and versioning. Blob SHAs must never be refreshed blindly merely to make CI green.

Deterministic grounding, corpus-provenance and evaluation invariants are part of the repository CI suite and must remain provider-independent so ordinary pull requests do not consume paid model calls.

## LIVE gate

A production AI capability requires explicit acceptance thresholds, regression results, known failure modes, fallback behavior, observability, an authorized evaluation corpus, captured human-reviewed semantic evidence, measured operating behavior, and an accountable release owner.
