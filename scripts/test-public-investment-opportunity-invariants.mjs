import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [migration, queries, lotsPage, lotCard, schemaVersion] = await Promise.all([
  read('supabase/migrations/0060_public_investment_opportunity_read_model.sql'),
  read('src/lib/investment/queries.ts'),
  read('src/app/inversion/lotes/page.tsx'),
  read('src/components/inversion/LotCard.tsx'),
  read('src/lib/observability/schema-version.ts'),
]);

assert.match(
  migration,
  /create policy investment_production_lots_public_select[\s\S]*?to anon, authenticated[\s\S]*?status <> 'DRAFT'/i,
  'Anonymous and ordinary participant reads must exclude DRAFT lots at RLS.',
);
assert.match(
  migration,
  /create policy investment_production_lots_ops_select[\s\S]*?to authenticated[\s\S]*?has_investment_permission\('ops\.read'\)/i,
  'ops.read actors must retain internal DRAFT visibility through a separate policy.',
);
assert.match(
  migration,
  /create or replace function public\.get_public_investment_lot_funding\(p_lot_id uuid default null\)/i,
  'Public funding progress must have one reviewed aggregate read model.',
);
assert.match(migration, /security definer[\s\S]*?set search_path = public/i, 'Public aggregate bypass must pin search_path.');
assert.match(migration, /l\.status <> 'DRAFT'/, 'Public funding aggregate must exclude draft lots independently of RLS bypass.');
assert.match(migration, /sum\(a\.case_equivalent_units\)/, 'Funding progress must derive from authoritative allocation case equivalents.');
assert.match(migration, /grant execute on function public\.get_public_investment_lot_funding\(uuid\) to anon, authenticated/i);
assert.doesNotMatch(
  migration,
  /(participant_user_id|capital_committed_cents|external_reference|payment_proof_storage_path|bank_verified_reference)/,
  'The anonymous funding read model must not reference participant/payment fields.',
);

assert.match(queries, /\.neq\('status', 'DRAFT'\)/, 'Public lot queries need defense-in-depth DRAFT filtering.');
assert.match(queries, /rpc\('get_public_investment_lot_funding'/, 'Public funding must use the aggregate RPC.');
assert.doesNotMatch(
  queries,
  /\.from\('investment_funding_allocations'\)/,
  'Public server helpers must never derive global funding truth from participant-scoped allocation RLS.',
);
assert.match(queries, /getPublicLotFundingSummaries/, 'Lot listing must support one bulk funding read instead of N+1 allocation reads.');

assert.match(lotsPage, /Promise\.all\(\[[\s\S]*getPublicLots\(\)[\s\S]*getPublicLotFundingSummaries\(\)/, 'Lot listing must load lots and aggregate funding with bounded query count.');
assert.doesNotMatch(lotsPage, /lots\.map\(getLotFundingSummary\)/, 'Lot listing must not regress to one funding query per lot.');
assert.match(lotsPage, /lot\.status === 'FUNDING_OPEN'/, 'Open-opportunity count must be driven by authoritative lot status.');
assert.match(lotsPage, /No hay financiación abierta en este momento/, 'No-open-lot state must be explicit rather than presented as generic beta closure.');
assert.doesNotMatch(lotsPage, /beta cerrada/i, 'Public lot availability must not be hardcoded as a global closed beta.');

assert.match(lotCard, /lot\.status === 'FUNDING_OPEN'/, 'Lot card availability wording must depend on funding state.');
assert.match(lotCard, /cajas equivalentes no asignadas/, 'Non-open lots must describe residual capacity as unassigned, not investable.');
assert.match(lotCard, /Math\.min\(Math\.max\(funding\.fundedPercent, 0\), 100\)/, 'Public progress rendering must remain visually bounded to 0..100%.');

assert.match(schemaVersion, /EXPECTED_DATABASE_MIGRATION\s*=\s*'0060'/);
assert.match(schemaVersion, /EXPECTED_DATABASE_MIGRATION_COUNT\s*=\s*60/);

console.log('Public investment opportunity truth invariants: PASS');
