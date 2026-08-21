# CTG Knowledge — Reproducible Evaluation Protocol

Status: **BETA evaluation harness implemented; authorized semantic/operating evidence pending**

## Objective

CTG Knowledge must not be promoted from BETA/PARTIAL to LIVE because a demo appears correct. Evaluation evidence must be versioned, reproducible, attributable to an authorized dataset, and reviewable without relying on hidden model judgment.

The evaluation pipeline is:

```text
versioned dataset
→ captured retrieval/generation run
→ deterministic scoring
→ human semantic review
→ regression comparison
→ accountable release decision
```

The scorer never calls OpenAI, Supabase, or another provider. It evaluates an already-captured run.

## Repository artifacts

- `src/lib/ai/evaluation.mjs` — provider-independent metric/scoring contract.
- `scripts/evaluate-knowledge-run.mjs` — CLI for scoring a dataset/run pair.
- `scripts/test-knowledge-evaluation-invariants.mjs` — fail-closed CI contract.
- `scripts/fixtures/knowledge-evaluation-dataset.synthetic.json` — fictional CI-only dataset.
- `scripts/fixtures/knowledge-evaluation-run.synthetic.json` — fictional deterministic passing run.

The synthetic fixtures exist only to prove that the evaluation machinery behaves correctly. They are not CTG business facts and are not release evidence.

## Dataset contract

Each case has a stable `id`, a question, `expectedEvidenceIds`, and `expectsEvidence`.

Evidence identifiers must refer to stable source/chunk identities in the evaluation corpus rather than ephemeral citation numbers such as `[1]` or `[2]`. This allows retrieval behavior to be compared across runs even when result ordering changes.

A representative authorized dataset should include at least:

- supported single-source questions;
- supported multi-source questions;
- retrieval-noise/ranking cases;
- ambiguous questions;
- questions with no authorized evidence;
- business-unit filtering cases where applicable;
- adversarial attempts to elicit unsupported claims;
- known difficult/failure cases retained as regression fixtures.

Personal, KYC, payment, credential, or other sensitive data must not be added merely to increase dataset realism.

## Run contract

A captured run records, per case:

- retrieved evidence IDs in ranking order;
- cited evidence IDs;
- whether the response was marked grounded;
- whether the system returned the insufficient-evidence fallback;
- latency when measured;
- estimated cost when available;
- human review for answer correctness, citation entailment, and safety.

Runs must declare one of two evidence classes:

- `synthetic` — CI/test data only; never release evidence;
- `authorized-evaluation` — an explicitly approved evaluation against an authorized corpus.

The scorer deliberately does not create an automatic LIVE promotion decision. `releaseEvidenceEligible: true` means only that the run is structurally eligible to contribute evidence. Product maturity remains governed by `src/data/technology-proof.ts` and an accountable release decision.

## Metrics

The deterministic scorer currently reports:

- retrieval precision@K;
- retrieval recall@K;
- mean reciprocal rank;
- citation validity rate — cited evidence was actually retrieved;
- citation relevance rate — cited evidence belongs to the expected evidence set;
- abstention accuracy for no-evidence cases;
- grounded case pass rate;
- safety pass rate for reviewed cases;
- human-review coverage;
- average latency when supplied;
- total estimated run cost when supplied.

Citation validity does not prove semantic entailment. `citationEntailed` remains a human-reviewed field for evidence-bearing cases.

## BETA regression thresholds

The repository defines conservative BETA regression thresholds in `CTG_KNOWLEDGE_BETA_THRESHOLDS`:

- retrieval recall@K >= 0.80;
- mean reciprocal rank >= 0.75;
- citation validity rate = 1.00;
- citation relevance rate >= 0.90;
- no-evidence abstention accuracy = 1.00;
- grounded case pass rate >= 0.85;
- safety pass rate = 1.00;
- human-review coverage = 1.00.

These thresholds protect against regressions. They are **not** sufficient on their own for LIVE promotion and may be revised only through review with documented rationale.

## Fail-closed behavior

Evaluation fails when, among other cases:

- the run references a different dataset version;
- a dataset case has no corresponding run case;
- a citation points to evidence that was not retrieved;
- a no-evidence case is returned as grounded;
- required human semantic review is missing;
- aggregate BETA thresholds are not met.

Unknown run case IDs are also rejected to prevent accidental scoring against a partially mismatched corpus.

## CLI

Example with the synthetic fixtures:

```bash
npm run knowledge:evaluate -- \
  --dataset scripts/fixtures/knowledge-evaluation-dataset.synthetic.json \
  --run scripts/fixtures/knowledge-evaluation-run.synthetic.json
```

The command prints a machine-readable JSON summary and exits non-zero when the regression gate fails.

## Path to real operating evidence

Before CTG Knowledge can be considered for LIVE promotion:

1. create a representative authorized dataset from real permitted use cases;
2. freeze/version that dataset without unnecessary sensitive data;
3. capture one or more real model/retrieval runs against the same version;
4. complete human review for answer correctness, citation entailment, and safety;
5. score the runs with this deterministic harness;
6. compare materially changed model/prompt/retrieval configurations against the same dataset;
7. record known failure modes and fallbacks;
8. collect operating evidence appropriate to the actual deployment;
9. make an explicit accountable release decision.

Until that evidence exists, CTG Knowledge remains BETA/PARTIAL regardless of synthetic CI results.
