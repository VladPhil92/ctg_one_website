# CTG One OS — Transactional Domain Event Outbox

Status: **FOUNDATION — NO EXTERNAL DISPATCHER YET**

## Purpose

The outbox provides a durable integration boundary for events that must be emitted only when an authoritative domain transaction commits. It is not a replacement for the participant ledger, investment audit log, production-event history or provider payout events.

## Authoritative table

`public.system_domain_event_outbox`

Each row contains immutable event identity/payload plus mutable delivery bookkeeping. Browser roles have no direct table access. Future dispatchers use service-role-only leasing RPCs.

## Initial emitted facts

The first increment emits only unambiguous committed facts:

- `investment.payment.reconciled` — after an authoritative `investment_payment_receipts` insert;
- `investment.settlement.completed` — after an immutable `investment_settlements` insert;
- `investment.payout.confirmed` — after a provider payout event with `event_type = CONFIRMED`.

The triggers execute inside the same PostgreSQL transaction as their source facts. If outbox insertion fails, the source transaction also fails; a notification/event can therefore never claim success for a fact that did not commit.

## Delivery protocol

No external delivery process is implemented in this phase. The database contract exists now so later Notification OS/Document OS work can consume events safely.

Service-role-only RPCs:

1. `claim_domain_events(limit, lease_seconds)` — claims available unpublished rows with `FOR UPDATE SKIP LOCKED`, creates an expiring lease token and increments `attempt_count`.
2. `complete_domain_event_delivery(event_id, lease_token)` — marks a currently leased event published and releases the lease.
3. `fail_domain_event_delivery(event_id, lease_token, error, retry_after_seconds)` — records bounded failure detail, releases the lease and schedules retry.

A stale worker cannot complete/fail an event reclaimed by another worker because the lease token must match.

## Immutability

Once appended, the following cannot change:

- event id/type;
- aggregate type/id;
- dedupe key;
- payload;
- occurrence timestamp;
- creation timestamp.

A published event cannot be unpublished. `attempt_count` cannot decrease. Delivery metadata may change only as part of claim/complete/fail processing.

## Data minimization

Generic integration payloads contain identifiers and operational values needed by future consumers. Provider external references and credentials are deliberately not copied into generic outbox payloads. Consumers requiring sensitive provider detail must resolve it through an authorized domain query rather than relying on the event envelope.

## What this phase does not do

It does not:

- send email, SMS or WhatsApp;
- invoke external webhooks;
- publish to Kafka/SQS/Redis or another broker;
- create participant-visible notifications;
- create documents;
- allow AI to execute domain mutations.

Those are separate increments built on top of this durable boundary.

## Verification

CI must prove on a fresh PostgreSQL database that:

- all migrations including the outbox apply cleanly;
- browser roles cannot read/write or claim events;
- service role can use the delivery RPCs;
- source triggers exist;
- append → claim → complete works;
- a completed event is not claimable again.

See `scripts/domain-event-outbox-schema-smoke.sql` and `scripts/test-domain-event-outbox-invariants.mjs`.