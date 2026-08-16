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

## Regression discipline

Material changes to model, prompt, retrieval, tool policy, or system configuration should be evaluated against the same representative fixtures before production promotion.

## LIVE gate

A production AI capability requires explicit acceptance thresholds, regression results, known failure modes, fallback behavior, observability, and an accountable release owner.
