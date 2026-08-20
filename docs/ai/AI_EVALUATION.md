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

`dataset -> run -> score -> human review -> compare -> release decision`

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

This is an integrity control, not a semantic truth oracle. It does not prove that each cited source actually entails every generated claim. Semantic groundedness, retrieval quality and citation entailment still require representative evaluation datasets and human-reviewed scoring before any LIVE promotion.

## Regression discipline

Material changes to model, prompt, retrieval, tool policy, grounding validation or system configuration should be evaluated against the same representative fixtures before production promotion.

Deterministic grounding invariants are part of the repository CI suite and must remain provider-independent so ordinary pull requests do not consume paid model calls.

## LIVE gate

A production AI capability requires explicit acceptance thresholds, regression results, known failure modes, fallback behavior, observability, and an accountable release owner.
