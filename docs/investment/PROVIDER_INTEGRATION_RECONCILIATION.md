# Provider Integration & Automated Reconciliation — CTG Craft Beer Investment OS

Status: provider-neutral foundation in `0034_provider_reconciliation_engine.sql`, with manual-target hardening in `0035_provider_reconciliation_target_hardening.sql`.

## Objective

Payment Rails established authoritative inbound receipts and outbound payouts. This phase adds the boundary between those rails and external financial providers without making CTG One dependent on one bank, processor or payment network.

```text
BANK / PSE / BRE-B / PROCESSOR
        ↓ provider-specific adapter
NORMALIZED FINANCIAL EVENT
        ↓ immutable provider event store
DETERMINISTIC MATCHING
        ├─ exact strong identity → authoritative rail RPC
        └─ ambiguous / missing identity → Finance Reconciliation Inbox
```

The provider engine never writes `FUNDING_RECEIVED`, `CAPITAL_COMMITTED`, `PAID` or `WITHDRAWAL_DEBIT` directly. It reuses the authoritative Payment Rails RPCs introduced in `0031`–`0032`.

## Privacy boundary

CTG One deliberately does not persist raw statements or webhook payloads in this phase. The provider event store retains only normalized reconciliation fields:

- provider code and provider event key;
- direction and event type;
- rail;
- amount in COP cents;
- external reference;
- merchant reference when the provider echoes one;
- provider business timestamp;
- SHA-256 digest of the normalized payload;
- ingest actor and timestamp.

No raw account number, full statement body or banking credential belongs in `investment_financial_provider_events`.

## Adapter contract

Future provider-specific code implements `InvestmentFinancialProviderAdapter<TPayload>` from `src/lib/investment/provider-adapter.ts` and returns `NormalizedFinancialProviderEventInput[]`.

A future adapter is responsible for provider-specific concerns before persistence, including:

```text
signature verification
→ provider schema validation
→ duplicate-event identity extraction
→ sensitive-field minimization
→ normalized event emission
```

The adapter may inspect the provider payload in memory. Persistent storage receives only normalized fields and a digest.

## Initial ingestion channel

`0034` intentionally permits only `ADMIN_IMPORT` as persisted source. The current API uses an authenticated CTG One session and the database requires `finance.manage`.

This means there is no generic unauthenticated webhook endpoint in this phase. A provider webhook must not be enabled until its real signature scheme, replay rules and credentials are known.

`POST /api/investment/admin/finance/events/import` accepts up to 100 normalized events and calculates the SHA-256 digest server-side before calling `ingest_investment_financial_event()`.

## Inbound deterministic match

An `INBOUND / SETTLED` event is auto-reconciled only if exactly one order satisfies all of the following:

```text
order.status = PAYMENT_SUBMITTED
order.payment_method = provider event rail
order.capital_required_cents = provider event amount
normalize(order.payment_reference) = normalize(provider external_reference)
```

The user-entered reference is not trusted by itself. It becomes useful only because the external provider independently reports the same reference.

If there are zero exact candidates, the event becomes `NO_MATCH`. If there are multiple exact candidates, it becomes `CONFLICT`. Neither state moves money.

A unique candidate is passed to `reconcile_investment_order_payment()`, preserving all KYC, amount, rail, receipt, allocation and ledger guards already enforced by Payment Rails.

## Outbound deterministic match

An outbound provider event can be `CONFIRMED` or `FAILED`.

Automatic payout matching requires exactly one payout where:

```text
provider matches
rail matches
amount matches
withdrawal = PAYMENT_PROCESSING
latest payout event = PROCESSING
merchant_reference = payout UUID OR payout idempotency key
```

This design gives future payment-provider adapters a stable merchant reference to send when initiating a transfer.

A confirmed provider event calls `confirm_investment_payout()`. A failed provider event calls `fail_investment_payout()`. The provider engine never debits the participant ledger directly.

## Reconciliation decisions

`investment_financial_event_matches` is append-only and records:

- auto exact-reference matches;
- auto merchant-reference matches;
- manual resolutions;
- no-match findings;
- conflicts;
- ignored events.

A partial unique index permits only one terminal outcome per provider event:

```text
RECONCILED
CONFIRMED
FAILED
IGNORED
```

`NO_MATCH` and `CONFLICT` are non-terminal so Finance can resolve the event later.

## Manual resolution

`resolve_investment_financial_event()` handles events that cannot be safely automated.

Inbound events may be manually attached to an order and still pass through `reconcile_investment_order_payment()`.

Outbound events may be manually attached to a payout, but `0035` first loads the selected authoritative payout and requires all three financial identities to match the provider event:

```text
selected payout provider = event provider
selected payout rail = event rail
selected payout amount = event amount
```

Only after those checks does the resolver delegate to `confirm_investment_payout()` or `fail_investment_payout()`. Pasting the UUID of an unrelated processing payout therefore cannot cause that payout to be confirmed or failed from a different provider event.

Finance can also mark an event `IGNORED`, which is terminal and auditable.

## Reprocessing

`auto_match_pending_investment_financial_events()` re-runs deterministic matching over unresolved events. This is useful when an event arrived before its corresponding order/payout was ready.

The function is bounded to at most 500 events per invocation and returns counts for processed, reconciled, confirmed, failed, unmatched and conflict outcomes.

A future scheduler may call the same domain operation; no new reconciliation algorithm is required.

## Finance Admin OS

`/admin/finance/reconciliation` provides:

- provider-event health metrics;
- single normalized-event entry;
- normalized JSON batch import;
- auto-match of unresolved events;
- reconciliation inbox;
- manual order/payout resolution;
- explicit ignore flow.

The UI warns operators not to paste full statements or account numbers.

## Health

`get_investment_provider_reconciliation_health()` exposes:

- total provider events;
- unresolved events;
- latest no-match count;
- latest conflict count;
- reconciled receipt mismatches;
- confirmed payout mismatches;
- failed payout mismatches.

## Migration sequence

1. `0034_provider_reconciliation_engine.sql` — normalized provider-event store, decision genealogy, ingestion, deterministic matching, manual inbox and health.
2. `0035_provider_reconciliation_target_hardening.sql` — validate provider, rail and amount before any manual outbound payout resolution.

## Next provider-specific step

Once a real provider is selected, add an adapter-specific route/function that:

1. verifies that provider's cryptographic signature or authenticated API response;
2. enforces replay protection using the provider event key;
3. normalizes the payload through the adapter contract;
4. ingests the normalized event;
5. invokes deterministic auto-match.

Do not expose a generic webhook or use the service-role client as a substitute for provider authentication.
