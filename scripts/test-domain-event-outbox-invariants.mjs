import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const migration = await read('supabase/migrations/0051_domain_event_outbox.sql');

assert.ok(
  migration.includes('create table public.system_domain_event_outbox'),
  'Transactional domain event outbox table must exist.',
);
assert.ok(
  migration.includes('alter table public.system_domain_event_outbox enable row level security'),
  'Outbox must have RLS enabled even though browser roles receive no policies.',
);
assert.ok(
  migration.includes('revoke all on table public.system_domain_event_outbox from public, anon, authenticated, service_role'),
  'Outbox rows must not be directly writable/readable through client or service roles.',
);

for (const rpc of [
  'claim_domain_events',
  'complete_domain_event_delivery',
  'fail_domain_event_delivery',
]) {
  assert.ok(migration.includes(`public.${rpc}`), `Delivery RPC ${rpc} must exist.`);
}
assert.ok(
  migration.includes('for update skip locked'),
  'Outbox claiming must serialize concurrent workers with SKIP LOCKED.',
);
assert.ok(
  migration.includes('lease_token = gen_random_uuid()') && migration.includes('lease_expires_at'),
  'Outbox claiming must use expiring lease tokens.',
);
assert.ok(
  migration.includes('domain event identity and payload are immutable'),
  'Domain event identity and payload must be immutable after append.',
);
assert.ok(
  migration.includes('published domain event cannot be unpublished or republished'),
  'Published events must not be reversible through delivery bookkeeping.',
);

for (const eventType of [
  'investment.payment.reconciled',
  'investment.settlement.completed',
  'investment.payout.confirmed',
]) {
  assert.ok(migration.includes(`'${eventType}'`), `Authoritative event ${eventType} must be emitted.`);
}

assert.ok(
  migration.includes('after insert on public.investment_payment_receipts'),
  'Payment reconciliation event must be in the authoritative receipt transaction.',
);
assert.ok(
  migration.includes('after insert on public.investment_settlements'),
  'Settlement event must be in the authoritative settlement transaction.',
);
assert.ok(
  migration.includes("when (new.event_type = 'CONFIRMED')"),
  'Payout domain event must only emit from authoritative CONFIRMED provider events.',
);
assert.ok(
  !migration.includes("'external_reference', new.external_reference"),
  'Provider external references must not be copied into generic integration payloads.',
);

console.log('Domain event outbox invariants: PASS');
