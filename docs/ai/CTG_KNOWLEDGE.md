# CTG Knowledge

## Product intent

CTG Knowledge is the first candidate AI product intended to move from architecture to verifiable operation.

Its purpose is to answer questions over authorized CTG One knowledge with source-grounded responses and explicit access boundaries.

## Status

IN DEVELOPMENT. No production RAG runtime is claimed by this document.

## Initial scope

Start with low-risk corporate and operational documents that are suitable for internal retrieval. Sensitive financial, legal, identity, or personal datasets require separate approval and controls.

## Target architecture

`authorized documents -> ingestion -> parsing -> chunking -> embeddings -> vector index -> permission-aware retrieval -> model -> answer -> citations -> feedback/evaluation`

## Product requirements

- Server-side provider access only.
- Identity and role-aware retrieval.
- Business-unit/document scope.
- Citation-first responses.
- Clear no-answer/fallback behavior when evidence is insufficient.
- Evaluation fixtures covering groundedness, retrieval, citations, safety, latency, and cost.
- Human feedback path.
- Structured observability without indiscriminate PII retention.

## v0.1 success criterion

CTG Knowledge may be considered for LIVE only after a controlled pilot can answer a bounded set of questions with reproducible source citations, acceptable evaluation results, correct authorization, measured cost/latency, and documented failure behavior.
