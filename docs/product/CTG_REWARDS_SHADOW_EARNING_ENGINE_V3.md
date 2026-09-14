# CTG Rewards Shadow Earning Engine v3

## Purpose

Shadow Earning Engine v3 moves CTG Rewards from static economic simulation to controlled event processing without activating commercial earning.

The system can ingest a manually replayed source event, match it against a validated pilot unit and validated rule, apply runtime safety limits, and persist an auditable hypothetical decision. It can also model a source reversal.

Every result remains **shadow-only**.

## Product truth

A shadow decision of `eligible` means:

> If this event contract, identity, rule and runtime configuration were approved for a real pilot, this event would have produced the calculated number of points.

It does **not** mean:

- points were credited;
- the user's Rewards balance changed;
- earning is live;
- the participating unit is commercially active in Rewards;
- redemption is available;
- points have COP value;
- points can be converted to CTGO.

The user-facing Rewards product remains `DEVELOPMENT` and commercially inactive.

## New v3 controls

### Source-event idempotency

`reward_shadow_events` enforces a unique `(source_domain, external_event_id)` contract. Replaying the same key with the same canonical facts returns the existing result. Reusing the same key with different facts is an idempotency conflict.

### Exactly one validated rule

A partial unique index permits at most one `validated` rule for each `(pilot_unit_id, event_code)`. Drafts may coexist, but the shadow engine never has to guess which validated earning rule applies.

### Kill switch

`reward_shadow_runtime_config.processing_enabled` defaults to `false` in migration 0135.

Turning it on enables only shadow evaluation. It grants no ledger authority and has no customer-visible effect.

### Runtime limits

The shadow runtime has independent caps for:

- maximum source-event amount;
- maximum hypothetical points per event;
- maximum original events per subject per UTC day.

These are fail-closed safety controls that apply in addition to rule-level minimums and caps.

### Reversal contract

An original source event can have at most one reversal. The reversal stores a hypothetical debit direction equal to the original hypothetical credit when applicable.

Reversals bypass the shadow kill switch by design so safety corrections are always representable. They still do not debit a real Rewards account.

## Data model

### `reward_shadow_runtime_config`

Singleton server-managed safety configuration. Browser roles receive no direct privileges.

### `reward_shadow_events`

Append-only event envelopes containing bounded event facts, CTG user UUID snapshot, amount, source provenance digest and event/reversal lineage.

The raw source payload is intentionally not stored. Only its SHA-256 digest is retained.

### `reward_shadow_evaluations`

Append-only decisions with one evaluation per source event, optional matched unit/rule, non-negative hypothetical points and snapshots of the runtime/rule facts used.

## Authority boundary

The v3 HTTP surface is `/api/admin/rewards/shadow-engine` and is available only after all of these checks:

1. normal Supabase user authentication;
2. `profiles.role = admin`;
3. `investment_participant_profiles.investment_role = SUPER_ADMIN`;
4. only then may the server instantiate service-role authority.

The v3 endpoint does not query or mutate `reward_accounts` or `reward_ledger_entries`.

Migration 0135 grants no new privilege on either table.

## Ingestion boundary

v3 intentionally supports `admin_replay_only`.

There is no public webhook and no service-to-service ingestion secret yet. This prevents an ecosystem business from becoming an economic authority merely because it can emit an HTTP request.

## Promotion gate to v4

The next meaningful advance is **Signed Source Connectors & Reconciliation v4**.

Before any automatic business event can enter the shadow engine, v4 should add:

1. registered source applications and key rotation;
2. HMAC or asymmetric request signing;
3. timestamp/nonce replay protection;
4. source-specific event allowlists and amount semantics;
5. delivery acknowledgement and retry contracts;
6. reconciliation between source exports and shadow events;
7. alerting for idempotency conflicts, missing reversals and volume anomalies;
8. per-source kill switches;
9. production evidence from at least one real bounded source domain;
10. no ledger bridge until shadow reconciliation has demonstrated acceptable error rates.

Only after signed connectors and reconciliation are proven should CTG One consider a separate **Closed Earning Pilot** migration that can write an immutable Rewards ledger entry.
