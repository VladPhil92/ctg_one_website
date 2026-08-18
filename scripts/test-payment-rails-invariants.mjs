import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const migration = await read('supabase/migrations/0031_payment_reconciliation_payout_rails.sql');
const orderAdmin = await read('src/app/inversion/admin/orders/page.tsx');
const payoutAdmin = await read('src/app/admin/finance/rails/page.tsx');
const liquidity = await read('src/components/inversion/InvestmentLiquidityPanel.tsx');
const nav = await read('src/components/admin/AdminNav.tsx');
const schemaVersion = await read('src/lib/observability/schema-version.ts');

assert.ok(
  migration.includes('payment rails cutover requires explicit monetary-history backfill first'),
  'Money-rail cutover must fail closed if monetary history appears before migration.',
);
assert.ok(
  migration.includes('create table public.investment_payment_receipts')
    && migration.includes('unique(provider_code,external_reference)'),
  'Inbound funding must be backed by an authoritative receipt with unique provider reference.',
);
assert.ok(
  migration.includes('receipt must equal exact order capital requirement')
    && migration.includes('reconciled rail must match participant payment claim'),
  'Receipt amount and rail must match the authoritative order/payment claim.',
);
assert.ok(
  migration.includes('payment receipt / payout history is append-only')
    && migration.includes('investment_payment_receipts_immutable')
    && migration.includes('investment_payouts_immutable')
    && migration.includes('investment_payout_events_immutable'),
  'Receipt, payout and payout-event history must be append-only.',
);
assert.ok(
  migration.includes('source_payment_receipt_id uuid')
    && migration.includes('source_payout_id uuid')
    && migration.includes('investment_money_rail_ledger_guard'),
  'Ledger funding/withdrawal facts must retain authoritative money-rail genealogy.',
);
assert.ok(
  migration.includes("new.entry_type in ('FUNDING_RECEIVED','CAPITAL_COMMITTED')")
    && migration.includes("new.entry_type='WITHDRAWAL_DEBIT'"),
  'Ledger guard must separately enforce inbound funding and outbound payout facts.',
);
assert.ok(
  migration.includes('WITHDRAWAL_DEBIT requires confirmed payout')
    && migration.includes("event_type='CONFIRMED'"),
  'Withdrawal debit must not exist before payout confirmation.',
);
assert.ok(
  migration.includes('create or replace function public.reconcile_investment_order_payment')
    && migration.includes("'FUNDING_RECEIVED',v_order.capital_required_cents")
    && migration.includes("'CAPITAL_COMMITTED',v_order.capital_required_cents"),
  'Inbound reconciliation must atomically create receipt-backed allocation ledger facts.',
);
assert.ok(
  migration.includes('legacy manual payment approval disabled')
    && migration.includes('direct participant funding allocation disabled'),
  'Legacy funding paths must fail closed instead of bypassing receipts.',
);
assert.ok(
  migration.includes('register a payout destination before requesting withdrawal')
    && migration.includes('payout destination cannot change while a withdrawal is active'),
  'Withdrawals require a frozen registered payout destination.',
);
assert.ok(
  migration.includes('create table public.investment_payouts')
    && migration.includes('create table public.investment_payout_events')
    && migration.includes("event_type in ('PROCESSING','CONFIRMED','FAILED')"),
  'Outbound rails require an immutable payout document and append-only provider lifecycle.',
);
assert.ok(
  migration.includes('first payout event must be PROCESSING')
    && migration.includes('confirmed payout is terminal'),
  'Payout provider events must follow a guarded state machine.',
);
assert.ok(
  migration.includes('create or replace function public.confirm_investment_payout')
    && migration.includes("set status='PAID'")
    && migration.includes("'WITHDRAWAL_DEBIT',-v_payout.amount_cents"),
  'PAID and WITHDRAWAL_DEBIT must be produced together by payout confirmation.',
);
assert.ok(
  migration.includes('legacy mark_withdrawal_paid disabled'),
  'Legacy direct PAID transition must be disabled.',
);
assert.ok(
  migration.includes('create or replace function public.get_investment_money_rail_health')
    && migration.includes('allocated_orders_without_receipt')
    && migration.includes('paid_withdrawals_without_confirmed_payout'),
  'Money rails must expose explicit health/reconciliation mismatch counters.',
);

assert.ok(
  orderAdmin.includes("rpc('reconcile_investment_order_payment'")
    && !orderAdmin.includes("rpc('approve_investment_order'"),
  'Investment order admin must reconcile receipts instead of manually approving evidence.',
);
assert.ok(
  payoutAdmin.includes("rpc('initiate_investment_payout'")
    && payoutAdmin.includes("rpc('confirm_investment_payout'")
    && payoutAdmin.includes("rpc('fail_investment_payout'"),
  'Finance Admin OS must operate the payout lifecycle through authoritative RPCs.',
);
assert.ok(
  liquidity.includes("rpc('set_investment_payout_destination'")
    && liquidity.includes("rpc('request_withdrawal'"),
  'Participant liquidity UI must register a masked destination before withdrawal requests.',
);
assert.ok(
  liquidity.includes("crypto.subtle.digest('SHA-256'")
    && liquidity.includes('No escribas el número completo de cuenta'),
  'Participant UI must derive a non-secret fingerprint and explicitly avoid raw bank account storage.',
);
assert.ok(nav.includes("href: '/admin/finance/rails'"), 'Payment Rails console must be reachable from Admin OS.');
assert.ok(schemaVersion.includes("'0031'"), 'Runtime expected migration must advance to 0031.');

console.log('Payment reconciliation & payout rail invariants: PASS');
