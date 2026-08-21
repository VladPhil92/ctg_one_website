# Investment Operating Evidence Capture

Status: **TOOLING IMPLEMENTED; REAL PRODUCTION EVIDENCE NOT YET CAPTURED**

## Purpose

Phase 19 creates a controlled evidence pipeline for CTG Craft Beer Investment so real operating maturity can eventually be reviewed without placing participant identities, KYC data, bank details, order identifiers, payout identifiers or raw operational exports in the public repository.

This phase does **not** assert that a real production operating cycle has already been captured. It provides the structure, validation, redaction and human-review controls required before such evidence may be considered.

## Evidence boundary

The pipeline recognizes two classifications only:

- `synthetic-ci`: deterministic test evidence used to prove the tooling itself. It can never count as production operating evidence.
- `production-redacted`: manually prepared aggregates derived from authorized first-party production sources after redaction. It is only a candidate for human release review.

No classification can automatically change `src/data/technology-proof.ts`. Capability promotion remains an explicit human governance decision.

## Private source handling

Raw first-party exports and operator working files must remain outside the public repository. The repository ignores the following working conventions:

- `.private-evidence/`
- `evidence/investment/private/`
- `*.investment-operating-evidence.capture.json`
- `*.investment-operating-evidence.review.json`

The capture format stores only aggregate operational facts plus SHA-256 digests of private source material and private lot identifiers. The private source bytes are not copied into the capture.

## Prohibited content

The validator fails closed on prohibited fields and identifier-like values, including:

- names and direct identity fields;
- emails and phone numbers;
- identity-document and passport fields;
- bank account/reference fields;
- participant, user, order, allocation, withdrawal and payout identifiers;
- UUID-like identifiers;
- long numeric identifiers;
- cookies, authorization values, tokens, secrets and passwords;
- private Storage paths.

A production capture must identify `https://ctgone.com`, Render, branch `main`, the exact 40-character deployment commit and the current repository schema identity. Production readiness and schema compatibility must already be verified.

## Financial and operational invariants

For every redacted lot observation, the validator requires:

1. funding sources exactly equal allocated capital;
2. a reconciled lot has no unbacked external capital;
3. terminal physical units never exceed serialized units;
4. documented sold units never exceed serialized units;
5. returned units never exceed documented sold units;
6. pre-settlement liquidity is zero;
7. approved reinvestment plus confirmed withdrawal debit never exceeds participant settlement credit;
8. source and lot digests are unique and valid SHA-256 values;
9. runtime schema identity matches the repository exactly.

The validator deliberately does not invent unresolved business rules such as loss allocation, unsold-inventory treatment, final contractual capital-recovery terms or alternate lot-closing policy.

## Workflow

### 1. Create a private template

```bash
npm run investment:evidence:template -- --out .private-evidence/lot-cycle.investment-operating-evidence.capture.json
```

The generated file is intentionally invalid. Every placeholder must be replaced with redacted, first-party evidence.

### 2. Validate the redacted capture

```bash
npm run investment:evidence:validate -- \
  --evidence .private-evidence/lot-cycle.investment-operating-evidence.capture.json \
  --authorize-production-evidence REVIEW_PRODUCTION_REDACTED_EVIDENCE
```

An optional `--summary-out` may write an aggregate-only validation summary.

### 3. Generate the human review worksheet

```bash
npm run investment:evidence:review-template -- \
  --evidence .private-evidence/lot-cycle.investment-operating-evidence.capture.json \
  --out .private-evidence/lot-cycle.investment-operating-evidence.review.json \
  --authorize-production-evidence REVIEW_PRODUCTION_REDACTED_EVIDENCE
```

The worksheet is incomplete until a reviewer explicitly supplies a reviewer handle, review timestamp and boolean judgment for every control.

### 4. Finalize a safe report

```bash
npm run investment:evidence:finalize -- \
  --evidence .private-evidence/lot-cycle.investment-operating-evidence.capture.json \
  --review .private-evidence/lot-cycle.investment-operating-evidence.review.json \
  --out investment-operating-evidence-report.json \
  --authorize-production-evidence FINALIZE_PRODUCTION_REDACTED_EVIDENCE
```

The final report contains aggregate metrics, deployment/schema identity, the capture hash and review result. It does not contain the source digests or lot digests themselves.

## Release-evidence eligibility

A production-redacted report is only **structurally eligible for human release review** when all of the following hold:

- classification is `production-redacted`;
- all human judgments are explicitly `true`;
- no unbacked external capital remains;
- no return-genealogy mismatch remains;
- at least one reconciled lot demonstrates funding, production, documented sales, finalized settlement and subsequent approved reinvestment or confirmed withdrawal.

Even then:

- `capabilityPromotionAllowed` remains `false`;
- pending business/legal decisions remain separate blockers;
- no LIVE promotion occurs automatically;
- reviewers must evaluate whether the evidence is representative and sufficient.

## CI boundary

CI uses only `scripts/fixtures/investment-operating-evidence.synthetic-v1.json`. The invariant suite verifies the validator, redaction controls, schema pinning, liquidity conservation and finalization behavior while proving that synthetic evidence remains ineligible for production release evidence.

No production source, production credential or production participant data is required by ordinary PR CI.
