# CTG Knowledge — First-Party Evaluation Corpus

Status: **VERSIONED CORPUS/DATASET IMPLEMENTED; REAL RUN EVIDENCE PENDING**

## Purpose

Phase 13 binds CTG Knowledge evaluation to a concrete, reviewable first-party corpus instead of allowing evaluation questions to drift independently from their evidence.

The initial corpus is deliberately narrow. It contains selected sections from public documentation already committed to the CTG One repository. It does not include KYC records, participant data, payment information, credentials, legal privileged material, health data, private business records, or other restricted content.

Repository inclusion means the material is eligible for controlled evaluation after review. It does **not** mean that a synthetic or future captured run automatically becomes operating evidence or that CTG Knowledge can be promoted to LIVE.

## Artifacts

- `scripts/fixtures/knowledge-evaluation-corpus.public-v1.json` — source manifest.
- `scripts/fixtures/knowledge-evaluation-dataset.public-v1.json` — representative question/evidence set.
- `src/lib/ai/evaluation-corpus.mjs` — provenance, drift, section-extraction and dataset validation.
- `scripts/prepare-knowledge-evaluation-corpus.mjs` — deterministic ingestion-package generator.
- `scripts/test-knowledge-evaluation-corpus-invariants.mjs` — CI contract.

## Provenance model

Every corpus source declares:

- a stable evidence ID;
- a repository path;
- an exact Markdown heading;
- the Git blob SHA of the reviewed source file.

The validator recomputes the Git blob identity from the checked-out file. If content changes, validation fails closed until the corpus is deliberately reviewed and re-versioned.

This prevents an old evaluation dataset from silently inheriting new source meaning after documentation changes.

## Allowed source boundary

The v1 manifest allows only reviewed paths under:

- `docs/ai/`
- `docs/architecture/`

The packager rejects absolute paths, parent-directory traversal and sources outside the explicit allow-list. Secrets/configuration files are therefore not valid corpus inputs.

The corpus classification is `public-first-party` and its scope is `evaluation-only`.

## Representative dataset

The v1 dataset contains supported questions, multi-source questions, no-evidence questions and adversarial questions.

Coverage includes:

- current architecture classification;
- financial/operational source-of-truth boundaries;
- capability maturity governance;
- recovery-evidence boundaries;
- CTG Knowledge security and retrieval behavior;
- LIVE promotion criteria;
- human approval for consequential AI actions;
- evaluation-set requirements;
- CTG One OS maturity and delivery architecture;
- abstention for unsupported budget/certification claims;
- adversarial requests to invent production maturity or credentials.

No-evidence cases intentionally contain an empty expected-evidence set. The scorer must reward abstention, not fabricated certainty.

## Stable evaluation evidence IDs

Evaluation evidence IDs are independent from ephemeral `[1]`, `[2]` citation numbers.

The corpus packager emits each reviewed section as a separate document with a stable URI:

```text
ctg-eval://<corpus-version>/<encoded-evidence-id>@<git-blob-sha>
```

A controlled ingestion/capture procedure can later map retrieved source URIs back to the stable evaluation evidence IDs used by the deterministic scorer.

## Preparing the corpus

The command below validates provenance and emits an ingestion-ready JSON package without network or provider calls:

```bash
npm run knowledge:evaluation:prepare-corpus -- \
  --manifest scripts/fixtures/knowledge-evaluation-corpus.public-v1.json \
  --dataset scripts/fixtures/knowledge-evaluation-dataset.public-v1.json \
  --out /tmp/ctg-knowledge-public-corpus-v1.json
```

The generated package is transient evaluation material and does not need to be committed.

## Drift policy

A source edit does not automatically update the evaluation corpus.

When a pinned source changes:

1. CI fails the corpus drift invariant;
2. an engineer reviews whether the semantic evidence changed;
3. affected questions/evidence expectations are reviewed;
4. a new corpus/dataset version is created when meaning changed materially;
5. regression comparisons record the version transition rather than pretending the datasets are identical.

Blindly refreshing blob SHAs without reviewing question/evidence expectations is prohibited.

## What Phase 13 does not do

Phase 13 does not:

- ingest anything into production automatically;
- call OpenAI or Supabase in ordinary CI;
- commit a fabricated passing `authorized-evaluation` run;
- claim semantic correctness without human review;
- claim measured latency or cost;
- promote CTG Knowledge to LIVE.

## Next gate — controlled run capture

The next phase should execute a controlled evaluation against an isolated or explicitly approved CTG Knowledge corpus:

1. materialize the pinned public corpus package;
2. ingest those evaluation documents into the approved evaluation boundary;
3. execute the versioned question set;
4. capture retrieved stable evidence IDs, citations, grounded/abstention behavior, latency and cost;
5. complete human review for correctness, citation entailment and safety;
6. score the captured run with `npm run knowledge:evaluate`;
7. retain the result as evaluation evidence only if the run is genuinely `authorized-evaluation` and all provenance is recorded.

Until that controlled run exists and is reviewed, CTG Knowledge remains `PARTIAL` with public status `BETA`.
