# Production Readiness Evidence Capture

Status: **IMPLEMENTED; ACCEPTANCE REMAINS HUMAN-GOVERNED**

## Purpose

Phase 21 turns the existing read-only Investment post-deploy canary into a reproducible evidence source without creating a second deployment workflow and without promoting CTG Craft Beer Investment beyond `PARTIAL / BETA`.

The existing `Post-Deploy Health Canary` continues to verify deployment identity first. Only after that step succeeds does the Investment verifier inspect `/api/investment/readiness` and `/inversion`.

## Versioned artifact

When the Investment canary is attempted, it writes:

`canary-evidence/investment-production-readiness.json`

The workflow archives that file for 14 days as an Actions artifact whose name contains the expected deployment SHA.

The artifact contains only public-safe diagnostic fields:

- evidence contract version;
- classification;
- capture timestamp;
- public origin;
- `PASS` or `FAIL`;
- expected Git SHA and branch;
- expected migration version/name/count;
- readiness HTTP/status;
- observed deployment SHA;
- public maturity stage;
- production-operating-evidence boundary;
- canonical Investment surface HTTP/final URL;
- bounded failure codes.

It does **not** contain cookies, auth headers, participant data, KYC data, database credentials, service-role keys, raw response bodies or private operating evidence.

## Classifications

- `production-canary`: only `https://ctgone.com`, targeting `main`;
- `non-production-canary`: manual same-origin verification of another HTTPS environment;
- `synthetic-ci`: repository-only test evidence.

Only a structurally valid `production-canary` artifact can ever qualify as production-readiness evidence, and even then only when its expected and observed SHA exactly match the Render deployment under review.

Synthetic or non-production evidence can never satisfy the release gate.

## PASS contract

A `PASS` artifact requires all of the following:

1. no recorded failures;
2. readiness HTTP 200;
3. readiness status `ready`;
4. observed deployment SHA equals the expected SHA;
5. public status remains `BETA`;
6. production operating evidence remains `pending`;
7. canonical Investment surface returns HTTP 200;
8. final surface resolves to `/inversion` on the same origin;
9. expected migration identity is present in the artifact.

The production release matrix separately requires provider `render`, branch `main`, compatible runtime schema and exact SHA agreement with this artifact.

## Bounded retry behavior

Deployment convergence remains governed by the existing bounded health canary. After it succeeds, the Investment probe receives a small independent retry budget:

- default attempts: 3;
- maximum attempts: 6;
- default interval: 5 seconds;
- maximum interval: 30 seconds;
- per-request timeout: at most 30 seconds.

This handles short route/CDN propagation without duplicating the long Render convergence loop or extending the workflow indefinitely.

## Artifact archival behavior

The workflow archives the artifact with `if: always()` only when the Investment canary step was actually attempted. Therefore:

- PASS → PASS artifact retained;
- controlled Investment verification failure → FAIL artifact retained;
- earlier deployment-identity failure → Investment step and artifact upload remain skipped, preserving the original failure as the authoritative signal;
- attempted canary without an artifact → upload step fails loudly (`if-no-files-found: error`).

## Validation

Downloaded evidence can be checked without any production credentials:

```bash
npm run investment:readiness-evidence:validate -- --file <artifact.json>
```

To require that the artifact qualifies as successful production evidence for its deployment:

```bash
npm run investment:readiness-evidence:validate -- --file <artifact.json> --expected-sha <40-char-sha> --require-production
```

Validation is read-only.

## Release-governance boundary

Creating or archiving an artifact does **not** accept it into the release matrix.

`INVESTMENT_PRODUCTION_READINESS_CANARY` remains `null` until a separate explicit governance change reviews and selects a real artifact. The artifact itself cannot edit that pointer, change feature flags, enable funding, approve withdrawals or modify capability maturity.

The release matrix imports the same shared evidence validator used by capture tooling. This prevents the artifact producer and the release consumer from silently drifting into different definitions of a valid canary.

Even after a canary is accepted, LIVE promotion remains blocked by the other Phase 20 gates, including reviewed production operating evidence, BR-001 through BR-005, fail-closed exposure and explicit human LIVE approval.

`automaticPromotionAllowed` remains `false`.
