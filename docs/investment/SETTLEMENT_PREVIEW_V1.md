# Settlement Preview v1

Status: **NON-AUTHORITATIVE DEVELOPMENT CONTROL**

This component exists only to validate deterministic settlement arithmetic proposed by the closed-beta BR decision package. It does not approve BR-001..BR-005, classify persisted production costs/losses, authorize a real-money transaction, replace `finalize_settlement`, create ledger credits, move lot state, enable funding, or change LIVE readiness.

## Inputs

The pure helper receives only already-reconciled inputs:

- non-negative `lotAvailableCents`;
- participant profit share in `[0,1]`;
- explicit allocation identities, recipient classification, eligible case-equivalent units and committed capital.

It deliberately does **not** infer `FINANCED_CAPITAL_COST` vs `NON_CAPITAL_DEDUCTION` from the current historical financial-entry schema and does not infer participant-borne loss classification. Those mappings remain blocked until the business decision is explicitly approved and the persisted authoritative model is extended.

## Deterministic properties proved

The helper enforces:

- participant-backed allocation: non-internal + participant recipient;
- CTG-internal allocation: internal + no participant recipient;
- unique allocation IDs and positive units;
- largest-remainder allocation of the reconciled lot pool using UUID ascending as the deterministic tie-break;
- capital recovery capped by the allocation's available economics;
- unrecovered capital represented as shortfall, never as a negative participant balance;
- participant profit pool calculated only over participant-backed profit bases;
- non-negative half-up pool rounding via `floor(x + 0.5)`;
- largest-remainder participant-profit reconciliation;
- CTG-internal allocations cannot create participant credit;
- exact cent conservation across participant capital recovery, CTG capital recovery, participant profit and CTG profit.

## Security / operational boundary

`public._investment_settlement_preview_v1(bigint,numeric,jsonb)` is immutable and non-mutating. Execute privilege is revoked from `public`, `anon` and `authenticated`. The CI contract invokes it only from the isolated local database owner context.

The production finalizer remains unchanged and migration 0075 remains the defense-in-depth fail-closed control for unresolved negative economics. No production migration from this development branch should be applied manually outside the governed merge/deploy process.

## Promotion path

After explicit BR approval, a separate implementation must:

1. pin the approval commit and formula/agreement version;
2. model authoritative cost/loss classifications instead of inferring them from legacy entry types;
3. map reconciled production facts to the pure arithmetic contract;
4. update the authoritative finalizer, state machine and evidence model;
5. pass full/partial/zero recovery, loss, terminal inventory, rounding, recipient-isolation and conservation tests;
6. remain fail-closed until deployment and operating-evidence review are complete.
