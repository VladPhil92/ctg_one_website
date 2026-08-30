# Closed-Beta Pilot Preflight — CTG Craft Beer Inversión

Status: **TOOLING ONLY — CANONICAL RESULT REMAINS BLOCKED**

This phase adds a deterministic, non-mutating preflight before any real-money closed-beta pilot. It does not approve BR-001..BR-005, does not grant legal/tax/regulatory authorization, does not execute funding, does not settle a lot, does not create a withdrawal and does not promote the Investment capability to LIVE.

`READY` does not authorize a transaction. It means only that the repository can prove all preconditions required for a separate human start review. `automaticExecutionAllowed` is always `false`.

## Why this gate exists

The repository already has operating-evidence capture and release-gate tooling, but a real operating cycle must not begin merely because the software is technically capable of recording one. The pilot needs a barrier *before* external funding occurs.

The preflight therefore separates five forms of authority/evidence that must not be conflated:

1. the exact BR-001..BR-005 candidate has been explicitly approved;
2. those rules have been authoritatively propagated into the runtime/documentation contract and that propagation is `VERIFIED`;
3. a distinct accountable human authorization for one real-money closed-beta pilot is recorded against the same immutable BR candidate;
4. the exact production deployment and schema are verified by a successful production canary;
5. the private pilot manifest demonstrates a VERIFIED participant, current agreement acceptance, lot economics/quantity/serialization/long-stop facts and a manually verified funding rail, without exposing raw identifiers.

None of these implies final LIVE approval.

## Canonical state

`src/data/investment-closed-beta-pilot-governance.mjs` deliberately ships with:

- status `NOT_AUTHORIZED`;
- no reviewer identity;
- no authorization timestamp;
- no authorization evidence reference;
- no reviewed candidate commit/blob attached.

BR-001..BR-005 and authoritative propagation are separately controlled by `investment-business-rule-governance.mjs`. The production canary remains separately controlled by release governance. The final LIVE human decision remains separately controlled by `INVESTMENT_HUMAN_RELEASE_APPROVED`.

As a result, ordinary repository state must return `BLOCKED`.

## Preflight gates

The pure preflight contract returns these gates:

- `manifest` — strict schema, expected migration and redacted digest-only references;
- `production-classification` — synthetic CI fixtures can never satisfy a real pilot;
- `business-rules-and-propagation` — every BR must be `APPROVED` and propagation must be `VERIFIED`;
- `pilot-authorization` — a separate human authorization must be bound to the exact reviewed BR candidate;
- `exact-deployment-readiness` — Render/main/exact commit/schema and production-canary identity must agree;
- `closed-beta-exposure` — public registration, public funding, payment gateway, automatic settlement and automatic withdrawals must remain disabled.

Any failed gate produces `BLOCKED`. There is no partial execution mode.

## Private manifest boundary

Create the working manifest outside the public repository:

```bash
npm run investment:pilot:template -- \
  --out .private-evidence/closed-beta-pilot.investment.json
```

The template is intentionally invalid. Replace placeholders only with redacted facts derived from authorized first-party sources.

The manifest permits only SHA-256 digests for private participant/profile, accepted-agreement and lot references. It does not permit participant IDs, user IDs, order IDs, allocation IDs, names, emails, identity-document data, bank references or payout identifiers. Unknown fields fail closed.

The manifest pins:

- deployment origin/provider/branch/commit;
- repository schema version/name/count;
- KYC state and agreement version;
- planned physical units;
- formula version;
- serialization-plan version;
- contractual long-stop timestamp;
- COP capital target;
- manual bank or manual crypto funding rail.

It deliberately does not restate or invent unresolved BR semantics. Those semantics must come from the separately approved and propagated business-rule contract.

## Run the preflight

For a production-redacted manifest, an explicit operator acknowledgement is required just to inspect it:

```bash
npm run investment:pilot:preflight -- \
  --manifest .private-evidence/closed-beta-pilot.investment.json \
  --report-out .private-evidence/closed-beta-pilot.preflight.json \
  --authorize-production-preflight REVIEW_CLOSED_BETA_PILOT_PREFLIGHT
```

The command performs no network mutation and no financial mutation. It reads the manifest and repository governance, evaluates the gates and emits a safe `READY`/`BLOCKED` report.

A non-zero process exit means the pilot is blocked.

## Required operating sequence after a future READY

A future `READY` result is handed to the accountable human operator for a separate go/no-go decision. Only after that decision may the already-governed manual funding workflow be used. External funds still require independent manual verification; the preflight itself cannot mark funding as verified.

After the pilot completes, the existing `investment:evidence:*` pipeline captures only authorized production-redacted aggregates for human review. A completed pilot does not automatically satisfy LIVE readiness.

## CI contract

CI uses only `scripts/fixtures/investment-closed-beta-pilot.synthetic-v1.json`. Invariants prove that:

- canonical governance remains `BLOCKED`;
- approved BRs without verified propagation remain blocked;
- approved/propagated BRs without separate pilot authorization remain blocked;
- stale or mismatched production-canary evidence remains blocked;
- synthetic classification remains blocked even with otherwise favorable test fixtures;
- raw identifier fields are rejected;
- any public funding/payment or automatic money-movement flag blocks the pilot;
- a fully satisfied in-memory production-shaped fixture can reach `READY` while `automaticExecutionAllowed` remains `false`.

No production credential, participant identity or real financial source is required by CI.
