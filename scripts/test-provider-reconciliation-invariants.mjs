import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const migration = await read('supabase/migrations/0034_provider_reconciliation_engine.sql');
const hardening = await read('supabase/migrations/0035_provider_reconciliation_target_hardening.sql');
const importApi = await read('src/app/api/investment/admin/finance/events/import/route.ts');
const page = await read('src/app/admin/finance/reconciliation/page.tsx');
const adapter = await read('src/lib/investment/provider-adapter.ts');
const nav = await read('src/components/admin/AdminNav.tsx');
const schemaVersion = await read('src/lib/observability/schema-version.ts');

assert.ok(migration.includes('create table public.investment_financial_provider_events'), 'Provider events require a dedicated normalized event store.');
assert.ok(migration.includes('payload_sha256 text not null') && !migration.includes('raw_payload'), 'Provider events must persist a hash, not raw bank/provider payloads.');
assert.ok(migration.includes('investment_financial_provider_events_immutable') && migration.includes('investment_financial_event_matches_immutable'), 'Provider events and matching decisions must be append-only.');
assert.ok(migration.includes("source text not null default 'ADMIN_IMPORT' check (source = 'ADMIN_IMPORT')"), 'Initial ingestion source must remain admin-import only until a signed provider adapter exists.');
assert.ok(migration.includes("upper(trim(o.payment_reference))=upper(trim(v_event.external_reference))"), 'Inbound auto-match must require exact external-reference identity in addition to rail/amount.');
assert.ok(migration.includes("p.id::text=v_event.merchant_reference or p.idempotency_key=v_event.merchant_reference"), 'Outbound auto-match must require the provider to echo the payout UUID or idempotency key.');
assert.ok(migration.includes("w.status='PAYMENT_PROCESSING'") && migration.includes("='PROCESSING'"), 'Outbound auto-match must only act on a processing authoritative payout.');
assert.ok(migration.includes('reconcile_investment_order_payment(') && migration.includes('confirm_investment_payout(') && migration.includes('fail_investment_payout('), 'Provider matching must reuse authoritative money-rail RPCs instead of writing ledger facts directly.');
assert.ok(!migration.includes("'FUNDING_RECEIVED'") && !migration.includes("'WITHDRAWAL_DEBIT'"), 'Provider engine must not bypass payment-rail ledger genealogy by inserting funding/withdrawal ledger facts itself.');
assert.ok(migration.includes('create unique index investment_financial_event_matches_terminal_unique'), 'Each provider event may have at most one terminal reconciliation outcome.');
assert.ok(migration.includes('create or replace function public.resolve_investment_financial_event'), 'Ambiguous/no-match provider events require an explicit manual resolution path.');
assert.ok(migration.includes('create or replace function public.auto_match_pending_investment_financial_events'), 'Finance must be able to reprocess unresolved events deterministically.');
assert.ok(migration.includes('create or replace function public.get_investment_provider_reconciliation_health'), 'Provider reconciliation must expose health mismatch counters.');
assert.ok(migration.includes("(select public.has_investment_permission('finance.read'))"), 'New RLS policies must use statement initplans from their first migration.');
assert.ok(migration.includes('revoke all on public.investment_financial_provider_events from anon') && migration.includes('revoke all on function public.ingest_investment_financial_event'), 'Anonymous clients must not ingest or mutate provider reconciliation data.');

assert.ok(hardening.includes('select * into v_payout from public.investment_payouts where id=p_payout_id for share'), 'Manual outbound resolution must load the selected authoritative payout before acting.');
assert.ok(hardening.includes('v_payout.provider_code<>v_event.provider_code') && hardening.includes('selected payout provider does not match provider event'), 'Manual outbound resolution must reject a payout from another provider.');
assert.ok(hardening.includes('v_payout.payout_rail<>v_event.payment_rail') && hardening.includes('selected payout rail does not match provider event'), 'Manual outbound resolution must reject a payout on another rail.');
assert.ok(hardening.includes('v_payout.amount_cents<>v_event.amount_cents') && hardening.includes('selected payout amount does not match provider event'), 'Manual outbound resolution must reject a payout with a different amount.');
assert.ok(hardening.includes('confirm_investment_payout(') && hardening.includes('fail_investment_payout('), 'Target hardening must still delegate lifecycle mutation to authoritative payout RPCs.');

assert.ok(importApi.includes("createHash('sha256')") && importApi.includes("rpc('ingest_investment_financial_event'"), 'Import API must hash normalized payloads and ingest through the domain RPC.');
assert.ok(importApi.includes("rpc('auto_match_investment_financial_event'"), 'Import API must invoke deterministic auto-match after ingestion.');
assert.ok(!importApi.includes('createAdminClient'), 'Unsigned/manual import must remain user-session + finance.manage scoped, not service-role bypassed.');
assert.ok(page.includes("rpc('get_investment_financial_reconciliation_inbox'") && page.includes("rpc('resolve_investment_financial_event'"), 'Finance UI must expose the reconciliation inbox and manual resolution.');
assert.ok(page.includes('No pegues extractos completos ni números de cuenta'), 'Finance UI must explicitly forbid raw statement/account credential entry.');
assert.ok(adapter.includes('InvestmentFinancialProviderAdapter') && adapter.includes('NormalizedFinancialProviderEventInput'), 'Future providers must implement the normalized adapter contract.');
assert.ok(nav.includes("href: '/admin/finance/reconciliation'"), 'Provider Reconciliation must be reachable from Admin OS.');
assert.ok(schemaVersion.includes("'0035'"), 'Runtime expected migration must advance to 0035 after target hardening.');

console.log('Provider integration & automated reconciliation invariants: PASS');
