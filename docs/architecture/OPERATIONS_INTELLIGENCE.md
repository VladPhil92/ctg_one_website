# CTG One OS — Operations Intelligence

Status: **P2.5 READ-ONLY FOUNDATION**

## Purpose

Operations Intelligence composes existing authoritative reconciliation and operating facts into one aggregate snapshot for authorized administrators. It is a read model, not a new source of truth.

The database function is `public.get_operations_intelligence_snapshot()` and the authenticated admin endpoint is `GET /api/admin/operations-intelligence`.

## Authorization

The RPC requires the existing `audit.read` investment permission. The HTTP endpoint is narrower: it requires both global `admin` and investment `SUPER_ADMIN` roles.

No anonymous execution is allowed. The endpoint uses the caller's authenticated Supabase session and does not use a service-role client.

## Included evidence

The snapshot aggregates:

- money-rail reconciliation health;
- provider reconciliation health;
- manual bank-verification integrity counts;
- inventory reconciliation counts;
- sales-return reconciliation counts;
- aggregate production/sales financial measures;
- asynchronous outbox, notification and document-work queue counts.

The response intentionally omits participant identifiers, provider references, payout destinations, payment references, document paths and credentials.

## AI boundary

This increment does **not** execute an LLM or autonomous agent. It establishes the evidence surface that a future governed analytical assistant may read.

The returned contract explicitly states `mode = READ_ONLY` and `mutations_allowed = false`. AI or analytical consumers must never approve payments, KYC, bank verification, settlement, inventory mutation, payouts, withdrawals or role changes.

Any future model layer must consume this snapshot as evidence, preserve human decision authority, and remain technically unable to call mutation RPCs.

## Verification

CI enforces that:

- migration numbering and runtime schema expectation remain synchronized;
- the RPC is `STABLE` and requires `audit.read`;
- anonymous execution is revoked;
- the API exposes only GET;
- the route requires admin + SUPER_ADMIN;
- no service-role secret or OpenAI model execution is introduced by this endpoint;
- the snapshot payload does not intentionally expose sensitive identifier/reference fields.

See `scripts/test-operations-intelligence-invariants.mjs`.
