import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [template, page, panel, route, adapter, types] = await Promise.all([
  read('src/app/nvetcareapp/dashboard/template.tsx'),
  read('src/app/nvetcareapp/dashboard/beta/page.tsx'),
  read('src/app/nvetcareapp/dashboard/beta/beta-operations-panel.tsx'),
  read('src/app/api/nvetcareapp/admin/beta/[...path]/route.ts'),
  read('src/lib/nvetcareapp/beta-operations.ts'),
  read('src/lib/nvetcareapp/beta-types.ts'),
]);

assert.match(template, /\/nvetcareapp\/dashboard\/beta/, 'SUPERADMIN navigation must expose the canonical Beta Cartagena control plane.');
assert.match(page, /requireNvetSuperadmin\(\)/, 'Beta operations page must reject CLIENT and Vet Tester modes before reading privileged state.');
assert.match(page, /fetchNvetBetaOperations\(accessToken\)/, 'Beta operations page must load the canonical backend snapshot server-side.');
assert.doesNotMatch(page, /demo|mock|fixture/i, 'Canonical beta operations must not fall back to simulated production state.');

for (const path of ['readiness', 'cohort', 'activation', 'evidence/summary', 'evidence/history']) {
  assert.match(adapter, new RegExp(`['"]${path.replace('/', '\\/')}['"]`), `Server adapter must read beta/${path}.`);
}
assert.match(adapter, /cache:\s*'no-store'/, 'Privileged beta reads must never be shared through cache.');
assert.match(adapter, /Authorization:\s*`Bearer \$\{accessToken\}`/, 'Backend beta reads must stay server-to-server with the Nvet bearer session.');

assert.match(route, /GET_PATHS = new Set/, 'Beta BFF must use an explicit GET allowlist.');
assert.match(route, /POST_STATIC_PATHS = new Set/, 'Beta BFF must use an explicit POST allowlist.');
assert.match(route, /DYNAMIC_POST_PATH/, 'Dynamic evidence/cohort mutations must be constrained by a bounded path contract.');
assert.match(route, /!currentUser\.user\.isSuperadmin/, 'Mutation BFF must revalidate canonical root authority.');
assert.match(route, /currentUser\.user\.isClientMode/, 'Mutation BFF must reject root CLIENT mode.');
assert.match(route, /currentUser\.user\.isVetTesterMode/, 'Mutation BFF must reject Vet Tester mode.');
assert.match(route, /MAX_BODY_BYTES = 8_000/, 'Mutation BFF must bound JSON request size.');
assert.match(route, /getNvetAuthorizationHeaders\(authorization\.accessToken/, 'Mutation BFF must construct authorization server-side.');
assert.doesNotMatch(route, /X-Nvet-Acting-Role['"]?:\s*['"](?:ADMIN|VET|SUPERADMIN|VET_TESTER)['"]/, 'Beta BFF must not synthesize privileged acting-role headers.');

for (const path of [
  'cohort/invite',
  'activation/authorize',
  'activation/revoke',
  'evidence',
]) {
  assert.match(panel, new RegExp(path.replace('/', '\\/')), `Beta panel must expose ${path} through the protected BFF.`);
}
assert.match(panel, /router\.refresh\(\)/, 'Successful beta mutations must refresh authoritative server state.');
assert.match(panel, /window\.confirm/, 'High-impact beta mutations must require an explicit operator confirmation.');
assert.match(panel, /commercialLaunchAuthorized|Frontera de activación/, 'UI must preserve the boundary between operator authorization and commercial launch approval.');

assert.match(types, /commercialLaunchAuthorized:\s*false/, 'Client contracts must preserve commercialLaunchAuthorized=false as an invariant.');
assert.match(types, /requiredEnvironment:\s*'production'/, 'Evidence contracts must preserve production-only promotion authority.');

console.log('Nvet canonical beta operations invariants: PASS');
