import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const migration = await read('supabase/migrations/0022_closed_loop_integrity.sql');
const operations = await read('src/app/admin/operations/page.tsx');
const summaryHook = await read('src/hooks/useInvestmentSummary.ts');

assert.ok(
  migration.includes('revoke execute on function public.create_funding_allocation'),
  'Participants must not be able to bypass Order/Payment by creating allocations directly.',
);
assert.ok(
  migration.includes('revoke execute on function public.record_bottle_sales'),
  'Legacy bottle-sale RPC must not remain client executable.',
);
assert.ok(
  operations.includes("rpc('record_bottle_sale_document'"),
  'Production OS must use the authoritative Sales OS document RPC.',
);
assert.ok(
  !operations.includes("rpc('record_bottle_sales'"),
  'Production OS must not call the legacy unit-sale RPC.',
);
assert.ok(
  operations.includes("const FINANCIAL_TYPES = ['PRODUCTION_COST', 'COMMERCIAL_COST', 'ADJUSTMENT']"),
  'Manual financial UI must not expose REVENUE or TAX.',
);
assert.ok(
  migration.includes('source_sale_id uuid'),
  'Sales-backed financial facts must retain a source sale foreign key.',
);
assert.ok(
  migration.includes("manual REVENUE/TAX is prohibited; use Sales OS"),
  'Database must reject manual sales revenue/tax facts.',
);

assert.ok(
  migration.includes("hashtextextended('ctg-sale-idempotency:'"),
  'Sales idempotency must serialize concurrent callers.',
);
assert.ok(
  migration.includes('idempotency key already used with a different sale payload'),
  'Reused idempotency keys with different payloads must fail closed.',
);

assert.ok(
  migration.includes("when 'SETTLEMENT_PENDING' then array[]::text[]"),
  'Generic state transitions must not be able to mark a lot SETTLED.',
);
assert.ok(
  migration.includes('finalize_settlement() is the'),
  'Settlement must be the only path to SETTLED.',
);
assert.ok(
  migration.includes('lot cannot be FUNDED until allocations cover all cases'),
  'FUNDED must require full allocation coverage.',
);
assert.ok(
  migration.includes('SOLD bottle units without authoritative sale documents'),
  'SOLD_OUT must reject unbacked physical sales.',
);
assert.ok(
  migration.includes('settlement allocation coverage mismatch'),
  'Settlement must independently verify full allocation coverage.',
);
assert.ok(
  migration.includes('floor(exact_ndlp)::bigint'),
  'Settlement remainder distribution must conserve positive and negative NDLP.',
);
assert.ok(
  migration.includes('settlement requires exactly one formula version across the lot'),
  'A lot settlement must use one pinned FormulaVersion.',
);

assert.ok(
  migration.includes('allocation would consume reserved capacity'),
  'Allocations must respect active order reservations.',
);
assert.ok(
  migration.includes('capital committed does not match lot snapshot'),
  'Allocation capital must match the immutable lot snapshot.',
);

assert.ok(
  migration.includes("hashtextextended('ctg-investment-spend:'"),
  'Withdrawal/reinvestment operations must serialize against a participant financial pool.',
);
assert.ok(
  migration.includes('public._investment_reserved_spend'),
  'Pending withdrawal/reinvestment requests must reserve spendable balance.',
);
assert.ok(
  migration.includes('source settlement does not contain an eligible participant credit'),
  'Reinvestment must prove genealogy back to the participant source settlement.',
);
assert.ok(
  summaryHook.includes("rpc('get_investment_spendable_balance'"),
  'Participant dashboard must display spendable balance after reservations.',
);

console.log('Closed-loop invariants: PASS');
