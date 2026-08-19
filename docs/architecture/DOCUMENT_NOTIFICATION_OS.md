# CTG One OS — Document / Notification OS

Status: **P2 FOUNDATION — INTERNAL MATERIALIZATION ONLY**

## Purpose

This layer consumes durable domain events from `system_domain_event_outbox` and turns them into idempotent downstream work. It separates three concerns that must not be conflated:

1. domain fact persistence;
2. notification/document work creation;
3. external transport or document rendering.

The outbox remains the integration boundary. P2.4 adds durable work queues but does not claim that email, WhatsApp, SMS, external webhooks or PDF generation are live.

## Notification model

Authoritative tables:

- `system_notification_templates` — immutable, versioned templates;
- `system_notification_deliveries` — idempotent delivery intents;
- `system_notification_delivery_attempts` — append-only transport-attempt history.

Initial materialization creates only `IN_APP` intents for:

- `investment.payment.reconciled`;
- `investment.payout.confirmed`.

There is intentionally no participant UI in this increment, so an `IN_APP` row is internal work, not proof that a participant has seen anything.

Email and WhatsApp are valid future channel types in the schema but no production template or transport implementation is activated for them.

## Document model

`investment.settlement.completed` materializes an `investment.settlement_summary` job owned by the investment lot. `system_document_jobs` is a renderer queue. A job becomes `READY` only when a service worker supplies both a storage path and a SHA-256 content digest.

No renderer is included in this increment.

## Exactly-once boundary

`materialize_domain_event_work(event_id, lease_token)` verifies the active outbox lease, writes the downstream work with a unique idempotency key and only then marks the outbox event published in the same PostgreSQL transaction.

If work creation fails, the outbox event remains unpublished and can be retried. If the same logical work is encountered again, the unique constraints prevent duplication.

## Worker boundaries

`scripts/materialize-domain-events.mjs` is a service-role-only, on-demand materializer. It:

1. claims outbox events;
2. calls the database materializer;
3. records a bounded retry on failure.

It does not send messages. It is not wired to a cron/scheduler in this increment.

Future notification transports must use:

- `claim_notification_deliveries`;
- `complete_notification_delivery`;
- `fail_notification_delivery`.

Future document renderers must use:

- `claim_document_jobs`;
- `complete_document_job`;
- `fail_document_job`.

All of those RPCs are service-role-only. Browser roles have no table access and no execution privilege on these worker commands.

## Non-goals

This phase does not:

- send email, WhatsApp or SMS;
- expose notification queues to authenticated users;
- render PDFs or other documents;
- mark a message delivered merely because an intent exists;
- let AI approve, execute or mutate financial operations;
- add an external scheduler or provider credential.

## Verification

CI must prove on fresh PostgreSQL that:

- the full 52-migration chain applies cleanly;
- browser roles cannot read queues or execute worker RPCs;
- payment events materialize exactly one notification intent;
- settlement events materialize exactly one document job;
- outbox events publish only after durable materialization;
- delivery leasing records failed and successful attempts without duplication.

See `scripts/document-notification-os-schema-smoke.sql` and `scripts/test-document-notification-os-invariants.mjs`.
