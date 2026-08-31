import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [
  dashboardPage,
  template,
  requireRoot,
  roleSwitch,
  governanceModel,
  governancePage,
  usersPage,
  userStatusRoute,
  vetVerificationRoute,
  vetStatusRoute,
  auditPage,
  appointmentsPage,
  transactionsPage,
  exportRoute,
] = await Promise.all([
  read('src/app/nvetcareapp/dashboard/page.tsx'),
  read('src/app/nvetcareapp/dashboard/template.tsx'),
  read('src/lib/nvetcareapp/require-superadmin.ts'),
  read('src/app/nvetcareapp/dashboard/superadmin-role-switch.tsx'),
  read('src/lib/nvetcareapp/governance.ts'),
  read('src/app/nvetcareapp/dashboard/gobernanza/page.tsx'),
  read('src/app/nvetcareapp/dashboard/usuarios/page.tsx'),
  read('src/app/api/nvetcareapp/admin/governance/users/[id]/status/route.ts'),
  read('src/app/api/nvetcareapp/admin/governance/veterinarians/[id]/verification/route.ts'),
  read('src/app/api/nvetcareapp/admin/governance/veterinarians/[id]/status/route.ts'),
  read('src/app/nvetcareapp/dashboard/auditoria/page.tsx'),
  read('src/app/nvetcareapp/dashboard/citas-admin/page.tsx'),
  read('src/app/nvetcareapp/dashboard/transacciones/page.tsx'),
  read('src/app/api/nvetcareapp/admin/governance/exports/transactions/route.ts'),
]);

assert.match(
  dashboardPage,
  /userResult\.user\.isSuperadmin\s*&&\s*!userResult\.user\.isClientMode[\s\S]*redirect\('\/nvetcareapp\/dashboard\/gobernanza'\)/,
  'Canonical root must land on governance only while operating with effective SUPERADMIN authority.',
);

assert.match(requireRoot, /userResult\.user\.isSuperadmin/, 'Privileged governance pages must share the canonical SUPERADMIN guard.');
assert.match(requireRoot, /redirect\('\/nvetcareapp\/dashboard'\)/, 'Non-root authenticated users must fail closed back to their ordinary dashboard.');
assert.match(
  requireRoot,
  /userResult\.user\.isClientMode[\s\S]*redirect\('\/nvetcareapp\/dashboard\/citas'\)/,
  'Canonical root acting as CLIENT must leave privileged governance pages through a CLIENT-safe landing route instead of looping through /dashboard.',
);
assert.match(roleSwitch, /targetMode === 'CLIENT'[\s\S]*\/nvetcareapp\/dashboard\/citas/, 'Switching into CLIENT mode must land on the client appointment surface.');
assert.match(roleSwitch, /\/nvetcareapp\/dashboard\/gobernanza/, 'Switching back to SUPERADMIN must land on governance.');
assert.match(roleSwitch, /router\.replace\(landingPath\)/, 'Role transitions must replace stale privileged history rather than pushing a loop-prone entry.');

for (const [href, label] of [
  ['/nvetcareapp/dashboard/gobernanza', 'governance hub'],
  ['/nvetcareapp/dashboard/usuarios', 'user governance'],
  ['/nvetcareapp/dashboard/veterinarios', 'vet governance'],
  ['/nvetcareapp/dashboard/citas-admin', 'global appointment governance'],
  ['/nvetcareapp/dashboard/transacciones', 'transaction governance'],
  ['/nvetcareapp/dashboard/contabilidad', 'financial exceptions'],
  ['/nvetcareapp/dashboard/auditoria', 'audit governance'],
]) {
  assert.ok(template.includes(href), `SUPERADMIN navigation must expose ${label}.`);
}

assert.match(governancePage, /Centro de gobierno de Nvet Care/, 'Root dashboard must be a governance command center.');
assert.match(governancePage, /Usuarios y acceso/, 'Governance hub must expose identity and access governance.');
assert.match(governancePage, /Auditoría y seguridad/, 'Governance hub must expose audit and security governance.');
assert.match(usersPage, /twoFactorEnabled/, 'User governance must surface MFA posture.');
assert.match(usersPage, /ctgLinked/, 'User governance may surface only whether a CTG identity is linked.');
assert.doesNotMatch(usersPage, /ctgUserId/, 'User governance UI must never expose the raw CTG/Supabase subject.');

for (const [name, source] of [
  ['user lifecycle BFF', userStatusRoute],
  ['vet verification BFF', vetVerificationRoute],
  ['vet lifecycle BFF', vetStatusRoute],
  ['transaction export BFF', exportRoute],
]) {
  assert.match(source, /NVET_ACCESS_COOKIE/, `${name} must use the server-held Nvet session cookie.`);
  assert.match(source, /userResult\.user\.isSuperadmin/, `${name} must double-check canonical root authority before forwarding.`);
  assert.doesNotMatch(source, /request\.headers\.get\(['"]authorization['"]\)/i, `${name} must not accept a browser-supplied bearer token as its identity source.`);
}

assert.match(userStatusRoute, /body\.reason\.trim\(\)\.length < 10/, 'Account lifecycle changes must require a governance reason.');
assert.match(vetVerificationRoute, /DECISIONS\.includes/, 'Vet verification must be constrained to an explicit decision allow-list.');
assert.match(vetStatusRoute, /body\.reason\.trim\(\)\.length < 10/, 'Vet suspension/reactivation must require a governance reason.');

assert.match(auditPage, /CRITICAL/, 'Audit surface must support critical-event review.');
assert.match(appointmentsPage, /Operación global de citas/, 'Root must have a global appointment operations surface.');
assert.match(transactionsPage, /Tesorería y transacciones/, 'Root must have a complete transaction ledger surface.');
assert.match(transactionsPage, /Exportar CSV/, 'Root transaction governance must expose the audited backend export path.');

assert.match(governanceModel, /\/api\/admin\/governance\/overview/, 'Web governance model must use the backend SUPERADMIN control plane.');
assert.match(governanceModel, /\/api\/admin\/governance\/audit-log/, 'Web governance model must use the backend audit control plane.');

console.log('Nvet Care SUPERADMIN governance invariants: PASS');
