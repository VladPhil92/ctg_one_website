import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [admin, user, superadmin, dashboardTemplate] = await Promise.all([
  read('src/lib/nvetcareapp/admin.ts'),
  read('src/lib/nvetcareapp/user.ts'),
  read('src/lib/nvetcareapp/superadmin.ts'),
  read('src/app/nvetcareapp/dashboard/template.tsx'),
]);

// A P2 review finding on PR #189: fetch() rejects on network failure
// (unreachable backend, DNS, timeout, connection reset) rather than
// resolving with a non-OK Response. An uncaught rejection there means
// the dashboard page and the BFF route both 500 instead of showing
// their intended graceful "couldn't reach the backend" state.
assert.match(
  admin,
  /try\s*\{[\s\S]*?fetch\(`\$\{getNvetApiUrl\(\)\}\/api\/admin\/metrics`[\s\S]*?\}\s*catch[\s\S]*?status:\s*502/,
  'fetchNvetAdminMetrics must catch fetch() rejections and resolve to a graceful { ok: false, status: 502 } result, not throw.',
);

// A malformed-but-200 response must not throw out of res.json() either.
assert.match(
  admin,
  /res\.json\(\)[\s\S]*?catch[\s\S]*?status:\s*502/,
  'fetchNvetAdminMetrics must catch res.json() parse failures and resolve to a graceful result, not throw.',
);

// A real non-OK response (e.g. 403 from RolesGuard) must still be
// forwarded as-is, not swallowed into the network-failure branch.
assert.match(
  admin,
  /if\s*\(!res\.ok\)\s*\{\s*return\s*\{\s*ok:\s*false,\s*status:\s*res\.status\s*\}/,
  'fetchNvetAdminMetrics must forward the real backend status for a non-OK response, not replace it with 502.',
);

// Canonical SUPERADMIN web projection must be bound to a server-validated
// CTG One session and must not expose the raw Supabase UUID in source.
assert.match(superadmin, /supabase\.auth\.getUser\(\)/, 'Superadmin identity must be validated server-side with Supabase auth.getUser().');
assert.match(superadmin, /createHash\('sha256'\)/, 'Superadmin identity must compare a one-way subject digest.');
assert.doesNotMatch(superadmin, /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i, 'The raw canonical Supabase UUID must not be committed to the web repository.');

// CTG-first provisioning intentionally leaves names nullable. That must not
// turn a valid account into a synthetic 502 on /dashboard.
assert.match(user, /const firstName = cleanName\(raw\.firstName\)/, 'Current-user parsing must tolerate nullable CTG-provisioned firstName.');
assert.doesNotMatch(user, /typeof raw\.firstName !== 'string'[\s\S]*status: 502/, 'Nullable Nvet profile names must not reject an otherwise valid user.');
assert.match(user, /canonicalSuperadmin\s*\?\s*'ADMIN'/, 'Canonical root must route through the existing ADMIN dashboard view model.');

// The SUPERADMIN chrome is a separate root-only surface; ordinary ADMIN/VET/
// CLIENT sessions keep the standard dashboard unchanged.
assert.match(dashboardTemplate, /isCanonicalNvetSuperadminSession\(\)/, 'Dashboard template must verify the canonical root session.');
assert.match(dashboardTemplate, /Superadmin Nvet Care/, 'Canonical root must receive an explicit SUPERADMIN dashboard surface.');
assert.match(dashboardTemplate, /Identidad raíz única/, 'SUPERADMIN dashboard must communicate singleton root authority.');

console.log('Nvet Care admin-metrics + superadmin invariants: PASS');
