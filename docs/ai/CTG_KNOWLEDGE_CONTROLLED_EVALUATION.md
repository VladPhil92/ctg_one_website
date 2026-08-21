# CTG Knowledge — Controlled Evaluation Capture

Status: **Phase 14 capture pipeline implemented; first authorized human-reviewed run still pending**

## Purpose

Phase 14 turns the versioned evaluation corpus and deterministic scorer into an operationally controlled capture process. The goal is to obtain reproducible evidence from a real retrieval/generation run without contaminating production knowledge, leaking credentials, or allowing CI to consume model/provider calls.

The controlled path is:

```text
pinned first-party corpus
→ prepare corpus package
→ seed isolated evaluation environment
→ capture real retrieval/generation responses
→ generate human review worksheet
→ human semantic/safety review
→ finalize authorized run
→ deterministic scoring
→ accountable release decision
```

A passing evaluation run is evidence. It is not an automatic maturity promotion.

## Safety boundary

**Production is a prohibited evaluation target.**

The seeding and capture CLIs reject the known CTG One production hosts, including `ctgone.com` and the Render production service URL. The evaluation corpus must be loaded only into a disposable local environment or a separately isolated remote environment.

This prevents evaluation-only documents from entering the normal CTG Knowledge retrieval pool. After a run, the isolated environment should be reset or discarded rather than reused as an operating knowledge store.

Remote isolated environments must use HTTPS and must be pinned with `--expected-commit`. Local loopback environments may run over HTTP.

## Provider-call authorization

No provider-backed command runs in CI.

Two commands can consume existing provider/API capacity and therefore require exact manual authorization tokens:

- corpus seeding: `--authorize-provider-calls SEED_AUTHORIZED_EVALUATION`;
- evaluation capture: `--authorize-provider-calls RUN_AUTHORIZED_EVALUATION`.

Without those exact values the commands refuse to run. They are intentionally not part of `npm test`, GitHub Actions CI, Render deployment, or any scheduled workflow.

The authenticated session is supplied only through the `CTG_KNOWLEDGE_EVALUATION_COOKIE` environment variable. The cookie is never written into receipts, captures, review files, scored runs, or logs emitted by these scripts.

## Step 1 — Prepare the pinned corpus package

Use the Phase 13 manifest and dataset:

```bash
npm run knowledge:evaluation:prepare-corpus -- \
  --manifest scripts/fixtures/knowledge-evaluation-corpus.public-v1.json \
  --dataset scripts/fixtures/knowledge-evaluation-dataset.public-v1.json \
  --out /tmp/ctg-knowledge-corpus-package.json
```

The package contains the exact reviewed Markdown sections, stable evidence IDs, and `ctg-eval://` source URIs derived from Git-blob-pinned sources.

## Step 2 — Seed an isolated evaluation environment

Use a clean local or separately isolated CTG One environment. The authenticated user represented by the evaluation cookie must be an admin because the normal admin ingestion endpoint is reused.

Example:

```bash
export CTG_KNOWLEDGE_EVALUATION_COOKIE='...'

npm run knowledge:evaluation:seed -- \
  --package /tmp/ctg-knowledge-corpus-package.json \
  --base-url http://127.0.0.1:3000 \
  --business-unit ctg_eval_public_v1 \
  --out /tmp/ctg-knowledge-seed-receipt.json \
  --authorize-provider-calls SEED_AUTHORIZED_EVALUATION
```

For an isolated remote environment, add `--expected-commit <full-sha>`. A commit mismatch fails closed.

The seed receipt records only safe document IDs, source URIs, chunk counts, model identifiers returned by ingestion, environment identity, and timestamps.

## Step 3 — Capture the real evaluation run

Use the same isolated environment and exact evaluation business unit:

```bash
npm run knowledge:evaluation:capture -- \
  --dataset scripts/fixtures/knowledge-evaluation-dataset.public-v1.json \
  --base-url http://127.0.0.1:3000 \
  --business-unit ctg_eval_public_v1 \
  --out /tmp/ctg-knowledge-capture.json \
  --authorize-provider-calls RUN_AUTHORIZED_EVALUATION
```

The capture process executes every dataset question sequentially through the real authenticated `/api/knowledge/query` route. It records:

- exact question/case identity;
- returned answer for later human review;
- grounded/fallback outcome;
- stable source URIs and citation identifiers;
- similarity values returned by the API;
- request IDs;
- measured round-trip latency;
- safe environment/deployment identity.

Any non-2xx response, malformed payload, partial case set, or remote commit mismatch aborts the run instead of creating partial evidence.

## Step 4 — Generate the human review worksheet

```bash
npm run knowledge:evaluation:review-template -- \
  --dataset scripts/fixtures/knowledge-evaluation-dataset.public-v1.json \
  --package /tmp/ctg-knowledge-corpus-package.json \
  --capture /tmp/ctg-knowledge-capture.json \
  --out /tmp/ctg-knowledge-human-review.json
```

For every case, a reviewer must explicitly decide:

- `answerCorrect` — whether the answer is substantively correct;
- `citationEntailed` — for evidence-bearing cases, whether the cited evidence actually supports the claim;
- `safetyPass` — whether the answer respects the safety/governance boundary;
- `estimatedCostUsd` — optional; populate only from a defensible provider/billing estimate, otherwise leave null;
- `notes` — optional reviewer rationale.

A valid citation identifier is not enough to set `citationEntailed: true`.

## Step 5 — Finalize and score

```bash
npm run knowledge:evaluation:finalize -- \
  --dataset scripts/fixtures/knowledge-evaluation-dataset.public-v1.json \
  --package /tmp/ctg-knowledge-corpus-package.json \
  --capture /tmp/ctg-knowledge-capture.json \
  --review /tmp/ctg-knowledge-human-review.json \
  --run-out /tmp/ctg-knowledge-authorized-run.json \
  --report-out /tmp/ctg-knowledge-evaluation-report.json
```

Finalization fails closed when:

- any dataset/corpus/capture identity differs;
- a retrieved source URI is outside the pinned corpus;
- a generated answer cites a source not present in retrieval;
- a grounded answer has no authorized evidence;
- an ungrounded answer retains sources/citations;
- any required human judgment is missing;
- a cost value is negative or malformed.

The finalized run intentionally strips generated answer text. It retains only the evidence IDs, grounded/fallback state, latency, optional cost estimate, environment metadata, and human-review booleans required by the deterministic scorer.

The scorer then applies the Phase 12 BETA thresholds. A failed regression exits non-zero.

## Evidence interpretation

`evidenceClass: authorized-evaluation` and `releaseEvidenceEligible: true` mean only that the run is structurally acceptable as release evidence. They do **not** mean CTG Knowledge is LIVE.

Before any maturity promotion, the accountable release decision must also consider:

- the actual report metrics and failed cases;
- known failure modes;
- observed latency;
- defensible cost evidence when available;
- fallback behavior;
- operational observability;
- whether the evaluation environment/configuration is representative of the intended release;
- any later production operating evidence required by governance.

Until a real authorized run is captured, fully human-reviewed, scored, and accepted, CTG Knowledge remains `BETA` publicly and `PARTIAL` technically.
