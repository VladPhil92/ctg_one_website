import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [
  admin,
  user,
  superadmin,
  dashboardTemplate,
  dashboardPage,
  dashboardLayout,
  continueWithCtg,
] = await Promise.all([
  read('src/lib/nvetcareapp/admin.ts'),
  read('src/lib/nvetcareapp/user.ts'),
  read('src/lib/nvetcareapp/superadmin.ts'),
  read('src/app/nvetcareapp/dashboard/template.tsx'),
  read('src/app/nvetcareapp/dashboard/page.tsx'),
  read('src/app/nvetcareapp/dashboard/layout.tsx'),
  read('src/app/nvetcareapp/iniciar-sesion/continue-with-ctg-button.tsx'),
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
assert.match(superadmin, /isCanonicalNvetSuperadminSubject/, 'The canonical subject verifier must be reusable for the Nvet identity link.');
assert.doesNotMatch(superadmin, /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i, 'The raw canonical Supabase UUID must not be committed to the web repository.');

// CTG-first provisioning intentionally leaves names nullable. That must not
// turn a valid account into a synthetic 502 on /dashboard.
assert.match(user, /const firstName = cleanName\(raw\.firstName\)/, 'Current-user parsing must tolerate nullable CTG-provisioned firstName.');
assert.doesNotMatch(user, /typeof raw\.firstName !== 'string'[\s\S]*status: 502/, 'Nullable Nvet profile names must not reject an otherwise valid user.');
assert.match(user, /canonicalSuperadmin\s*\?\s*'ADMIN'/, 'Canonical root must route through the existing ADMIN dashboard view model.');

// Root UI requires both ends of the bridge to match the canonical subject:
// a validated CTG One cookie plus the protected Nvet user's ctgUserId link.
assert.match(user, /canonicalSession\s*&&\s*canonicalNvetLink/, 'Root projection must dual-bind the CTG One session and the Nvet identity link.');
assert.match(user, /typeof raw\.ctgUserId === 'string'/, 'Nvet current-user parsing must read the server-returned ctgUserId link.');
assert.match(user, /isCanonicalNvetSuperadminSubject\(raw\.ctgUserId\)/, 'The Nvet identity link must match the pinned canonical subject.');
assert.match(user, /isSuperadmin:\s*canonicalSuperadmin/, 'Current-user result must carry the dual-bound root marker.');

// The SUPERADMIN chrome is a separate root-only surface; ordinary ADMIN/VET/
// CLIENT sessions keep the standard dashboard unchanged.
assert.match(dashboardTemplate, /userResult\.user\.isSuperadmin/, 'Dashboard template must render root chrome only from the dual-bound user result.');
assert.doesNotMatch(dashboardTemplate, /isCanonicalNvetSuperadminSession/, 'Dashboard template must not independently infer root authority from the CTG cookie alone.');
assert.match(dashboardTemplate, /Superadmin Nvet Care/, 'Canonical root must receive an explicit SUPERADMIN dashboard surface.');
assert.match(dashboardTemplate, /Identidad raíz única/, 'SUPERADMIN dashboard must communicate singleton root authority.');

// Unified dashboard access contract. All personas enter the same dashboard;
// the server-resolved Nvet role selects the surface after authentication.
assert.match(
  dashboardPage,
  /redirect\('\/nvetcareapp\/iniciar-sesion'\)/,
  'Unauthenticated dashboard access must return to the one public Nvet login.',
);
assert.match(dashboardPage, /if \(role === 'ADMIN'\)/, 'ADMIN/SUPERADMIN projection must render the administrative dashboard read-model.');
assert.match(dashboardPage, /if \(role === 'CLIENT'\)/, 'CLIENT must render the user appointment dashboard.');
assert.match(dashboardPage, /\/\/ role === 'VET'/, 'The remaining allowed VET role must enter the veterinarian dashboard branch.');
assert.match(dashboardPage, /VetAgendaPanel/, 'VET must receive the veterinarian agenda surface.');

// Persona-specific affordances must remain scoped to the effective role and
// must not leak admin controls into the public login or ordinary dashboards.
assert.match(dashboardLayout, /role === 'CLIENT'/, 'CLIENT must receive client-only dashboard actions.');
assert.match(dashboardLayout, /Agendar cita/, 'CLIENT dashboard must expose appointment booking.');
assert.match(dashboardLayout, /role === 'VET'/, 'VET must receive veterinarian-only dashboard actions.');
assert.match(dashboardLayout, /Operar servicios/, 'VET dashboard must expose service operations.');
assert.doesNotMatch(dashboardPage, /\/admin\/login/, 'The shared Nvet dashboard must not expose a separate admin login route.');

// CTG One SSO is additive to the same public login and lands on the requested
// dashboard path only after a successful server-side identity exchange.
assert.match(continueWithCtg, /\/api\/nvetcareapp\/auth\/ctg-identity-exchange/, 'CTG One continuation must use the server-side Nvet identity-exchange BFF.');
assert.match(continueWithCtg, /router\.push\(next\)/, 'Successful CTG One exchange must continue to the requested dashboard route.');
assert.doesNotMatch(continueWithCtg, /\/admin\/login/, 'CTG One continuation must not reveal a separate privileged login path.');

console.log('Nvet Care admin-metrics + unified dashboard role invariants: PASS');
