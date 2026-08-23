import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const migration = await read('supabase/migrations/0070_investment_rls_permission_hoisting.sql');
const smoke = await read('scripts/investment-rls-permission-hoisting-smoke.sql');
const ci = await read('.github/workflows/ci.yml');

const PERMISSION_FN = '(has_investment_permission|is_investment_admin|is_admin|is_investment_operator|is_investment_sales_operator)';

// The migration may only move *when* a permission check runs, never whether it
// runs. Anything that drops privileges, changes ownership or touches a
// non-investment table would be a different change wearing this one's name.
for (const forbidden of [
  /\bgrant\b/i,
  /\brevoke\b/i,
  /\balter\s+table\b/i,
  /\bdrop\s+table\b/i,
  /security\s+definer/i,
  /\busing\s*\(\s*true\s*\)/i,
]) {
  assert.ok(
    !forbidden.test(migration),
    `RLS hoisting migration must not contain ${forbidden} — it is an evaluation-frequency change only.`,
  );
}

const policyTargets = [...migration.matchAll(/create policy \S+ on public\.(\w+)/g)].map((m) => m[1]);
assert.ok(policyTargets.length >= 20, 'Migration must rewrite the full set of affected investment policies.');
assert.ok(
  policyTargets.every((table) => table.startsWith('investment_')),
  'Migration must not touch policies outside the investment initiative.',
);

// Every permission call the migration writes must be hoisted. Only the policy
// predicates count — the header comment and the fail-closed block both mention
// these function names as literal text, and matching those would be noise.
const predicates = [...migration.matchAll(/^ {2}(?:using|with check) \((.*)\);?$/gm)].map((m) => m[1]);
assert.ok(predicates.length >= 20, 'Every rewritten policy must expose a parseable predicate.');

const unhoisted = predicates.filter((predicate) =>
  [...predicate.matchAll(new RegExp(`${PERMISSION_FN}\\(`, 'g'))]
    .some((call) => !/\( SELECT $/.test(predicate.slice(0, call.index))),
);
assert.deepEqual(
  unhoisted,
  [],
  'Every permission call in the rewritten policies must sit inside a (select ...) InitPlan.',
);

// Each policy recreation must be preceded by dropping the old one, so the
// migration is a replacement rather than an accidental second permissive
// policy that would widen access.
const drops = (migration.match(/drop policy if exists/g) ?? []).length;
const creates = (migration.match(/create policy/g) ?? []).length;
assert.equal(drops, creates, 'Each recreated policy must drop its previous definition first.');

// Self-check inside the migration.
assert.ok(
  migration.includes('raise exception') && migration.includes('re-evaluate a permission function per row'),
  'Migration must fail closed if any investment policy is left unhoisted.',
);

// The CI contract must guard both regressions, not just the performance one.
assert.ok(
  smoke.includes('re-evaluate a permission function per row'),
  'Smoke must catch a policy regressing to per-row permission evaluation.',
);
assert.ok(
  smoke.includes('lost their permission check'),
  'Smoke must catch a rewrite that silently drops a permission check.',
);
assert.ok(
  smoke.includes('now gate on a permission function'),
  'Smoke must catch an unreviewed policy joining the permission-gated set.',
);
assert.ok(
  ci.includes('-f scripts/investment-rls-permission-hoisting-smoke.sql'),
  'The hoisting contract must run in the Golden Path clean-database job.',
);

console.log('Investment RLS permission-hoisting invariants: PASS');
