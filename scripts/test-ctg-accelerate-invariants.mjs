import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [migration, api, dashboard, registration, homepage, simulator, version] = await Promise.all([
  read('supabase/migrations/20261102113000_0160_ctg_accelerate_referral_attribution.sql'),
  read('src/app/api/accelerate/summary/route.ts'),
  read('src/app/dashboard/accelerate/page.tsx'),
  read('src/app/(auth)/registro/page.tsx'),
  read('src/components/dashboard/InvestorDashboard.tsx'),
  read('src/lib/accelerate/simulation.ts'),
  read('src/lib/observability/schema-version.ts'),
]);

const moduleExports = {};
const emitted = ts.transpileModule(simulator, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(emitted.diagnostics?.length ?? 0, 0, 'Simulation must transpile without errors.');
vm.runInNewContext(emitted.outputText, { exports: moduleExports, BigInt, Number, Object, RangeError }, { timeout: 2000 });

const calculate = moduleExports.simulateAcceleration;
assert.equal(typeof calculate, 'function');
const scenario = calculate({
  capitalMinor: 100_000,
  qualifiedReferrals: 10,
  hypotheticalRewardMinorEach: 2_000,
  termMonths: 12,
});
assert.equal(scenario.hypotheticalRewardMinor, '20000');
assert.equal(scenario.potentialPrincipalRecoveryMinor, 20_000);
assert.equal(scenario.remainingPrincipalMinor, 80_000);
assert.equal(scenario.originalTermMonths, 12);
assert.equal(scenario.contractMaturityUnchanged, true);
assert.equal(scenario.binding, false);

const capped = calculate({
  capitalMinor: 1_000,
  qualifiedReferrals: 1000,
  hypotheticalRewardMinorEach: 2_000,
  termMonths: 60,
});
assert.equal(capped.potentialPrincipalRecoveryMinor, 1_000);
assert.equal(capped.remainingPrincipalMinor, 0);
assert.throws(() => calculate({ capitalMinor: -1, qualifiedReferrals: 1, hypotheticalRewardMinorEach: 2, termMonths: 12 }), /Invalid capitalMinor/);
assert.throws(() => calculate({ capitalMinor: 100, qualifiedReferrals: 2.5, hypotheticalRewardMinorEach: 2, termMonths: 12 }), /Invalid qualifiedReferrals/);
assert.throws(() => calculate({ capitalMinor: 100, qualifiedReferrals: 3, hypotheticalRewardMinorEach: 2, termMonths: 9 }), /Invalid term/);

for(const table of ['ctg_accelerate_referral_codes', 'ctg_accelerate_referral_attributions']) {
  assert.match(migration, new RegExp(`create table public\\.${table}`));
  assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
}
assert.match(migration, /after insert on auth\.users/, 'Original signup is the attribution trust boundary.');
assert.match(migration, /on conflict \(referred_user_id\) do nothing/, 'Attribution must be one-time.');
assert.match(migration, /referrer_user_id <> referred_user_id/, 'Self-referrals must not be accepted.');
assert.match(migration, /ipp\.kyc_status = 'VERIFIED'/, 'Qualifying requires canonical investment KYC.');
assert.match(migration, /io\.status = 'ALLOCATED'/, 'Qualifying requires allocated investment order.');
assert.match(migration, /io\.allocation_id is not null/, 'Qualifying requires durable allocation evidence.');
assert.match(migration, /grant execute on function public\.ctg_accelerate_referral_stats\(uuid\) to service_role/);
assert.doesNotMatch(migration, /grant\s+(?:insert|update|delete)[\s\S]*?\s+to\s+authenticated/i, 'No authenticated client writes.');
assert.doesNotMatch(migration, /insert into public\.(?:investment_ledger_entries|reward_ledger_entries|wallets)/, 'Referral tracking must never credit a financial ledger.');

assert.match(api, /createAuthenticatedRequestContext\(request\)/);
assert.match(api, /\.eq\('user_id', context\.user\.id\)/);
assert.match(api, /p_referrer: context\.user\.id/);
assert.match(api, /cashBalanceCredits: false/);
assert.match(api, /principalRecoveryCredits: false/);
assert.match(api, /'private, no-store'/);
assert.doesNotMatch(api, /export async function POST/, 'Participants cannot create money events.');
assert.match(registration, /ctg_referral_code: referralCode/, 'Signup must pass validated invitation code.');
assert.match(dashboard, /credentials: 'same-origin'/);
assert.ok(dashboard.includes('/registro?ref='), 'Invite link must point to canonical signup.');
assert.match(homepage, /href="\/dashboard\/accelerate"/);
assert.match(version, /EXPECTED_DATABASE_MIGRATION = '0160'/);
console.log('CTG Accelerate referral MVP invariants: PASS');
