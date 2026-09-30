import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [allowlistText, migration] = await Promise.all([
  readFile('scripts/security-definer-authenticated-allowlist.txt', 'utf8'),
  readFile('supabase/migrations/20260930131500_0156_security_definer_governance_registry.sql', 'utf8'),
]);

const allowlist = new Set(
  allowlistText
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean),
);

const classifications = new Map();
const rowPattern = /\('([^']+)',\s*'(PUBLIC_INTENTIONAL|AUTHENTICATED_SELF_SERVICE|PRIVILEGED_WITH_INTERNAL_GUARD|SERVER_ONLY)',\s*'[^']*'\)/gu;
for (const match of migration.matchAll(rowPattern)) {
  const [, signature, classification] = match;
  assert.ok(!classifications.has(signature), `duplicate SECURITY DEFINER governance entry: ${signature}`);
  classifications.set(signature, classification);
}

assert.equal(
  classifications.size,
  allowlist.size,
  'governance registry and authenticated SECURITY DEFINER allowlist must have identical cardinality',
);

for (const signature of allowlist) {
  assert.ok(classifications.has(signature), `allowlisted SECURITY DEFINER lacks governance classification: ${signature}`);
}
for (const signature of classifications.keys()) {
  assert.ok(allowlist.has(signature), `governance registry contains stale/unexposed SECURITY DEFINER: ${signature}`);
}

const expectedPublic = new Set([
  'public.get_public_bottle_trace(p_serial_code text)',
  'public.get_public_investment_lot_funding(p_lot_id uuid)',
  'public.get_public_investment_lot_operations(p_lot_id uuid)',
]);
const actualPublic = new Set(
  [...classifications.entries()]
    .filter(([, classification]) => classification === 'PUBLIC_INTENTIONAL')
    .map(([signature]) => signature),
);
assert.deepEqual(actualPublic, expectedPublic, 'anonymous SECURITY DEFINER surface must remain the three reviewed public read models');

for (const [signature, classification] of classifications) {
  if (expectedPublic.has(signature)) continue;
  assert.ok(
    classification === 'AUTHENTICATED_SELF_SERVICE' || classification === 'PRIVILEGED_WITH_INTERNAL_GUARD',
    `authenticated executable surface has invalid governance class: ${signature} -> ${classification}`,
  );
}

assert.match(
  migration,
  /revoke all on table private\.security_definer_governance_registry from public, anon, authenticated;/iu,
  'governance metadata must not be browser-readable',
);
assert.match(
  migration,
  /grant select on table private\.security_definer_governance_registry to service_role;/iu,
  'governance metadata must remain inspectable by the trusted service boundary',
);
assert.match(
  migration,
  /insert into private\.rls_governance_registry\(schema_name, table_name, classification, rationale\)/iu,
  'new private governance table must be recorded in the existing RLS governance inventory',
);

for (const signature of expectedPublic) {
  const functionName = signature.slice('public.'.length, signature.indexOf('('));
  assert.ok(
    migration.includes(`comment on function public.${functionName}`),
    `public intentional RPC must carry an explicit database comment: ${functionName}`,
  );
}

console.log('SECURITY DEFINER governance invariants: PASS');
