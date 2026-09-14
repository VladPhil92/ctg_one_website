# CTG Rewards Pilot Control Plane v2

## Purpose

Pilot Control Plane v2 creates a governed workspace for designing and testing candidate CTG Rewards economics without activating the commercial program.

It adds candidate ecosystem units, draft rule formulas and auditable simulations so economics can be reviewed before any rule is allowed to affect a user balance.

## Product truth

This phase is **simulation only**.

A unit or rule marked `validated` means that its structure is acceptable for internal analysis. It does **not** mean:

- Rewards earning is active;
- the rule is published to users;
- a purchase or event creates points;
- points can be redeemed;
- points have COP value;
- points can be converted to CTGO;
- the associated business is an active Rewards participant.

There is intentionally no `active`, `live`, `published` or `effective` state in the v2 schema.

## Control-plane model

### `reward_pilot_units`

Represents candidate participating CTG One units or bounded source domains. Lifecycle is limited to `draft`, `validated` and `archived`.

### `reward_rule_drafts`

Stores non-binding earning hypotheses. Foundation v2 supports two bounded simulation formulas:

- `fixed_points`;
- `points_per_cop_block`.

Rules may define a minimum hypothetical transaction amount and an optional points cap. No row authorizes a ledger mutation.

### `reward_rule_simulations`

Append-only simulation evidence containing the input amount, calculated hypothetical points and a snapshot of the rule facts used for that result.

A simulation never creates, reserves, transfers or redeems Rewards points.

## Authority boundary

The control plane is available only to CTG One administrators whose investment role is `SUPER_ADMIN`.

Browser clients never receive direct table grants. The server verifies the normal signed-in user first, verifies both admin authorities, and only then uses server-side `service_role` access for the control-plane tables.

The migration grants **no new privileges** on `reward_accounts` or `reward_ledger_entries` and introduces no Rewards balance mutation RPC.

## Public maturity

CTG Rewards remains `DEVELOPMENT`. The public and member-facing product truth remains Foundation v1: earning and redemption are not active.

Pilot Control Plane v2 is an internal governance capability and does not justify changing Rewards to LIVE, BETA or an active loyalty claim.

## Promotion gate to a real pilot

A later phase must use a new migration and explicit review before any economic effect is possible. At minimum it must establish:

1. approved economics for each participating unit and event;
2. explicit source-event contracts with idempotency and provenance;
3. anti-abuse, refund/reversal and reconciliation rules;
4. accounting treatment and liability ownership;
5. user terms, eligibility and privacy disclosures;
6. end-to-end tests proving exactly-once earn/reversal behavior;
7. operational kill switches and limits;
8. production evidence reconciling emitted events to the immutable Rewards ledger;
9. a deliberate decision on redemption economics;
10. a separate decision before any CTGO interoperability.

Until those gates are satisfied, v2 remains a laboratory for economic design rather than an earning engine.
