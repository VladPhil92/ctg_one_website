import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const smoke = await read('scripts/rls-permission-hoisting-smoke.sql');
const ci = await read('.github/workflows/ci.yml');

const PERMISSION_FN = '(has_investment_permission|is_investment_admin|is_admin|is_investment_operator|is_investment_sales_operator)';

// Both halves of the hoisting work. 0070 covered the investment tables; 0071
// covered the accounts and knowledge tables under an explicit authorization to
// touch the pre-existing accounts system. Each is pinned to its own scope so a
// later edit cannot quietly widen one of them into the other's territory.
const migrations = [
  {
    path: 'supabase/migrations/0070_investment_rls_permission_hoisting.sql',
    minPolicies: 20,
    allows: (table) => table.startsWith('investment_'),
    scope: 'the investment initiative',
  },
  {
    path: 'supabase/migrations/0071_accounts_rls_permission_hoisting.sql',
    minPolicies: 12,
    allows: (table) => [
      'profiles', 'wallets', 'transactions', 'kyc_submissions', 'kyc_documents',
      'knowledge_documents', 'knowledge_chunks', 'admin_audit_log',
    ].includes(table),
    scope: 'the authorized accounts and knowledge tables',
  },
];

for (const { path, minPolicies, allows, scope } of migrations) {
  const migration = await read(path);

  // These migrations may only move *when* a permission check runs, never
  // whether it runs. Anything that drops privileges, changes ownership or
  // opens a policy up would be a different change wearing this one's name.
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
      `${path} must not contain ${forbidden} — it is an evaluation-frequency change only.`,
    );
  }

  const policyTargets = [...migration.matchAll(/create policy \S+ on public\.(\w+)/g)].map((m) => m[1]);
  assert.ok(
    policyTargets.length >= minPolicies,
    `${path} must rewrite the full set of affected policies.`,
  );
  const outOfScope = [...new Set(policyTargets.filter((table) => !allows(table)))];
  assert.deepEqual(outOfScope, [], `${path} must stay within ${scope}.`);

  // Only the policy predicates count for the hoisting check — the header
  // comment and the fail-closed block both mention these function names as
  // literal text, and matching those would be noise.
  const predicates = [...migration.matchAll(/^ {2}(?:using|with check) \((.*)\);?$/gm)].map((m) => m[1]);
  assert.ok(predicates.length >= minPolicies, `${path} must expose a parseable predicate per policy.`);

  const unhoisted = predicates.filter((predicate) =>
    [...predicate.matchAll(new RegExp(`${PERMISSION_FN}\\(`, 'g'))]
      .some((call) => !predicate.slice(0, call.index).endsWith('( SELECT ')),
  );
  assert.deepEqual(
    unhoisted,
    [],
    `Every permission call in ${path} must sit inside a (select ...) InitPlan.`,
  );

  // Each recreation must drop the old policy first, so the migration replaces
  // rather than adding a second permissive policy that would widen access.
  const drops = (migration.match(/drop policy if exists/g) ?? []).length;
  const creates = (migration.match(/create policy/g) ?? []).length;
  assert.equal(drops, creates, `Each policy recreated in ${path} must drop its previous definition first.`);

  assert.ok(
    migration.includes('raise exception') && migration.includes('re-evaluate a permission function per row'),
    `${path} must fail closed if any policy is left unhoisted.`,
  );
}

// 0071 is the change CLAUDE.md reserves for the accounts system, so it has to
// say so — a reader should not have to reconstruct that from the commit log.
const accounts = await read('supabase/migrations/0071_accounts_rls_permission_hoisting.sql');
assert.match(
  accounts,
  /AUTHORIZATION:/,
  'The accounts migration must record the explicit authorization it relies on.',
);

// The CI contract must guard both regressions, not just the performance one,
// and must now cover the whole schema rather than the investment tables alone.
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
  !smoke.includes("tablename like 'investment%'"),
  'The contract must cover every policy in public, not just the investment tables.',
);
assert.ok(
  ci.includes('-f scripts/rls-permission-hoisting-smoke.sql'),
  'The hoisting contract must run in the Golden Path clean-database job.',
);

console.log('RLS permission-hoisting invariants: PASS');
