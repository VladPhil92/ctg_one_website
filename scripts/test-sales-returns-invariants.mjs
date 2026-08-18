import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const migration = await read('supabase/migrations/0028_sales_returns_credit_notes.sql');
const hardening = await read('supabase/migrations/0029_sales_returns_hardening.sql');
const returnsPage = await read('src/app/admin/operations/returns/page.tsx');
const settlementPage = await read('src/app/admin/operations/settlement/page.tsx');
const nav = await read('src/components/admin/AdminNav.tsx');

assert.ok(
  migration.includes('sales returns cutover requires an explicit customer-custody backfill'),
  'Customer-custody cutover must fail closed when historical sales already exist.',
);
assert.ok(
  migration.includes("'CUSTOMER_POSSESSION','Cliente final · fuera de inventario vendible','CUSTOMER',true"),
  'Sold units must move to a canonical customer-custody location.',
);
assert.ok(
  migration.includes('create table public.investment_sales_credit_notes')
    && migration.includes('create table public.investment_sales_credit_note_items'),
  'Commercial returns require immutable document and unit-item tables.',
);
assert.ok(
  migration.includes('sales return / credit-note history is append-only'),
  'Credit-note history must be append-only.',
);
assert.ok(
  migration.includes('create or replace function public._sale_item_tax_share'),
  'Tax credits must derive from deterministic per-sale-item allocation.',
);
assert.ok(
  migration.includes('physical return must credit the full original sale-item gross'),
  'A physical unit return must credit the authoritative original sale-item gross.',
);
assert.ok(
  migration.includes('create constraint trigger investment_sales_credit_note_totals_guard')
    && hardening.includes('investment_sales_credit_note_item_parent_totals_guard'),
  'Credit-note parent/item totals must be enforced at transaction commit from both insertion paths.',
);

assert.ok(
  migration.includes('source_credit_note_id uuid')
    && migration.includes("'SALE_RETURNED'"),
  'Inventory return genealogy must retain the authoritative credit note.',
);
assert.ok(
  migration.includes("p_lot_id,'SOLD',v_source_location_id,v_customer_location_id"),
  'Sales OS must transfer custody from sale source to CUSTOMER_POSSESSION.',
);
assert.ok(
  migration.includes("b.status in ('WAREHOUSE','DISPATCHED','IN_MARKET')")
    && migration.includes('were previously sold'),
  'Returned or previously sold bottles must not be commercially sold again.',
);
assert.ok(
  migration.includes('create or replace function public.record_sale_return_credit_note'),
  'Customer returns must execute through one authoritative RPC.',
);
assert.ok(
  migration.includes("b.status = 'SOLD'")
    && migration.includes('one or more sale items were already credited'),
  'Return RPC must require SOLD units from the selected sale and prohibit duplicate crediting.',
);
assert.ok(
  migration.includes("'REVENUE_REVERSAL'") && migration.includes("'TAX_REVERSAL'"),
  'Credit notes must create explicit revenue/tax reversal facts.',
);
assert.ok(
  hardening.includes('REVENUE_REVERSAL must equal authoritative credit-note gross')
    && hardening.includes('TAX_REVERSAL must equal authoritative credit-note tax'),
  'Financial reversals must equal their authoritative credit-note amounts.',
);

assert.ok(
  migration.includes('create or replace function public.get_sales_return_reconciliation'),
  'Sales Returns OS must expose a reconciliation read model.',
);
assert.ok(
  migration.includes("m.movement_type = 'SALE_RETURNED'")
    && migration.includes("fe.entry_type='REVENUE_REVERSAL'"),
  'Return reconciliation must verify both physical and financial genealogy.',
);
assert.ok(
  hardening.includes("when exists (\n          select 1 from public.investment_sale_items"),
  'Stock read model must classify any previously sold bottle as non-sellable.',
);

assert.ok(
  migration.includes("- coalesce(sum(amount_cents) filter (where entry_type='REVENUE_REVERSAL'),0)")
    && migration.includes("+ coalesce(sum(amount_cents) filter (where entry_type='TAX_REVERSAL'),0)"),
  'Settlement NDLP must subtract credited revenue and reverse credited tax liability.',
);
assert.ok(
  migration.includes('credit-note/finance revenue reversal mismatch')
    && migration.includes('credit-note/finance tax reversal mismatch'),
  'Settlement must reconcile credit-note totals against financial reversals.',
);

assert.ok(
  returnsPage.includes("rpc('record_sale_return_credit_note'")
    && returnsPage.includes("rpc('get_sales_return_reconciliation'"),
  'Admin returns console must use authoritative mutation and reconciliation RPCs.',
);
assert.ok(
  settlementPage.includes("sum('REVENUE_REVERSAL')")
    && settlementPage.includes("sum('TAX_REVERSAL')"),
  'Settlement UI must display net facts after credit-note reversals.',
);
assert.ok(
  nav.includes("href: '/admin/operations/returns'"),
  'Sales Returns must be reachable from Admin OS.',
);

console.log('Sales returns & credit-note invariants: PASS');
