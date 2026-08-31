import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

async function walkFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(absolutePath)));
    } else if (entry.isFile()) {
      files.push(absolutePath);
    }
  }

  return files;
}

const [
  admin,
  user,
  superadmin,
  session,
  requestHeaders,
  requireSuperadmin,
  dashboardTemplate,
  dashboardPage,
  dashboardLayout,
  continueWithCtg,
  roleModeRoute,
  roleSwitch,
  appointments,
  clientBooking,
  clientFulfillment,
  chat,
] = await Promise.all([
  read('src/lib/nvetcareapp/admin.ts'),
  read('src/lib/nvetcareapp/user.ts'),
  read('src/lib/nvetcareapp/superadmin.ts'),
  read('src/lib/nvetcareapp/session.ts'),
  read('src/lib/nvetcareapp/request.ts'),
  read('src/lib/nvetcareapp/require-superadmin.ts'),
  read('src/app/nvetcareapp/dashboard/template.tsx'),
  read('src/app/nvetcareapp/dashboard/page.tsx'),
  read('src/app/nvetcareapp/dashboard/layout.tsx'),
  read('src/app/nvetcareapp/iniciar-sesion/continue-with-ctg-button.tsx'),
  read('src/app/api/nvetcareapp/auth/role-mode/route.ts'),
  read('src/app/nvetcareapp/dashboard/superadmin-role-switch.tsx'),
  read('src/lib/nvetcareapp/appointments.ts'),
  read('src/lib/nvetcareapp/client-booking.ts'),
  read('src/lib/nvetcareapp/client-fulfillment.ts'),
  read('src/lib/nvetcareapp/chat.ts'),
]);

const nvetAppRoot = fileURLToPath(new URL('../src/app/nvetcareapp/', import.meta.url));
const nvetAppFiles = await walkFiles(nvetAppRoot);
const nvetSourceFiles = nvetAppFiles.filter((path) => /\.(?:ts|tsx|js|jsx)$/i.test(path));
const nvetRoutePaths = nvetSourceFiles.map((path) => relative(nvetAppRoot, path).replaceAll('\\', '/'));
const nvetSourceCorpus = (await Promise.all(nvetSourceFiles.map((path) => readFile(path, 'utf8')))).join('\n');

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

// Root UI requires both ends of the bridge to match the canonical subject:
// a validated CTG One cookie plus the protected Nvet user's ctgUserId link.
assert.match(user, /canonicalSession\s*&&\s*canonicalNvetLink/, 'Root projection must dual-bind the CTG One session and the Nvet identity link.');
assert.match(user, /typeof raw\.ctgUserId === 'string'/, 'Nvet current-user parsing must read the server-returned ctgUserId link.');
assert.match(user, /isCanonicalNvetSuperadminSubject\(raw\.ctgUserId\)/, 'The Nvet identity link must match the pinned canonical subject.');
assert.match(user, /isSuperadmin:\s*canonicalSuperadmin/, 'Current-user result must carry the dual-bound root marker.');

// The canonical root may temporarily operate as CLIENT, but the identity root
// marker remains intact. This is an effective-role mode, never a database role
// rewrite and never a path to VET/ADMIN/SUPERADMIN escalation.
assert.match(
  user,
  /const rootClientMode = canonicalSuperadmin && upstreamRole === 'CLIENT'/,
  'Canonical root CLIENT mode must be derived from the backend effective role, not from browser-only presentation state.',
);
assert.match(
  user,
  /canonicalSuperadmin\s*\?\s*rootClientMode\s*\?\s*'CLIENT'\s*:\s*'ADMIN'/,
  'Canonical root must project to CLIENT only while the backend confirms client mode, otherwise to the admin dashboard model.',
);
assert.match(user, /isClientMode:\s*rootClientMode/, 'Current-user result must expose the root client-mode state explicitly.');
assert.match(session, /NVET_ROLE_MODE_COOKIE = 'nvet_role_mode'/, 'Root role mode must use a dedicated session cookie.');
assert.match(session, /setNvetRoleModeCookie[\s\S]*?httpOnly:\s*true/, 'Role-mode cookie must be httpOnly.');
assert.match(session, /clearNvetSessionCookies[\s\S]*?clearNvetRoleModeCookie/, 'Logout must clear root role mode with the Nvet session.');
assert.match(
  requestHeaders,
  /roleMode === 'CLIENT'\s*\?\s*\{ 'X-Nvet-Acting-Role': 'CLIENT' \}\s*:\s*\{\}/,
  'Only CLIENT may be forwarded as the root acting-role hint.',
);
assert.doesNotMatch(requestHeaders, /X-Nvet-Acting-Role['"]?:\s*['"](?:ADMIN|VET|SUPERADMIN)['"]/, 'Web BFF must never forward a privileged acting-role hint.');

// Mode switch BFF must revalidate canonical root identity before writing the
// httpOnly mode cookie, and the control must always provide a one-click return.
assert.match(roleModeRoute, /new Set<NvetRootRoleMode>\(\['SUPERADMIN', 'CLIENT'\]\)/, 'Role-mode BFF must accept only SUPERADMIN and CLIENT modes.');
assert.match(roleModeRoute, /!currentUser\.user\.isSuperadmin/, 'Role-mode BFF must reject every non-canonical user.');
assert.match(roleModeRoute, /setNvetRoleModeCookie\(response, body\.mode\)/, 'Validated mode changes must be stored only after canonical-root verification.');
assert.doesNotMatch(roleModeRoute, /users?\.role|update[^\n]*role|\/api\/admin\/users/i, 'Role-mode BFF must not mutate the persistent user role.');
assert.match(roleSwitch, /Cambiar a usuario/, 'SUPERADMIN chrome must expose one-click CLIENT mode.');
assert.match(roleSwitch, /Volver a SUPERADMIN/, 'CLIENT mode must expose one-click return to SUPERADMIN.');
assert.match(roleSwitch, /\/api\/nvetcareapp\/auth\/role-mode/, 'Role switch UI must call the protected role-mode BFF.');

// The root identity remains visible in client mode only so it can safely
// restore authority; privileged navigation and privileged pages must be
// disabled while the effective role is CLIENT.
assert.match(dashboardTemplate, /userResult\.user\.isSuperadmin/, 'Dashboard template must render root chrome only from the dual-bound user result.');
assert.doesNotMatch(dashboardTemplate, /isCanonicalNvetSuperadminSession/, 'Dashboard template must not independently infer root authority from the CTG cookie alone.');
assert.match(dashboardTemplate, /Superadmin Nvet Care/, 'Canonical root must receive an explicit SUPERADMIN dashboard surface.');
assert.match(dashboardTemplate, /Identidad raíz única/, 'SUPERADMIN dashboard must communicate singleton root authority.');
assert.match(dashboardTemplate, /Modo usuario/, 'Root chrome must clearly disclose when CLIENT mode is active.');
assert.match(dashboardTemplate, /Modo SUPERADMIN/, 'Root chrome must clearly disclose when privileged mode is active.');
assert.match(dashboardTemplate, /!isClientMode\s*&&\s*\(/, 'Privileged root navigation must be hidden while CLIENT mode is active.');
assert.match(requireSuperadmin, /userResult\.user\.isClientMode/, 'Privileged pages must reject the canonical root while it is intentionally operating as CLIENT.');

// Unified dashboard access contract. All personas enter the same dashboard;
// the server-resolved Nvet role selects the surface after authentication.
assert.match(
  dashboardPage,
  /redirect\('\/nvetcareapp\/iniciar-sesion'\)/,
  'Unauthenticated dashboard access must return to the one public Nvet login.',
);
assert.match(dashboardPage, /if \(role === 'ADMIN'\)/, 'ADMIN/SUPERADMIN projection must render the administrative dashboard read-model.');
assert.match(dashboardPage, /if \(role === 'CLIENT'\)/, 'CLIENT must render the user care dashboard.');
assert.match(
  user,
  /upstreamRole === 'ADMIN' \|\| upstreamRole === 'VET' \|\| upstreamRole === 'CLIENT'/,
  'Only the known ADMIN, VET and CLIENT roles may reach the shared dashboard router after root projection.',
);
assert.match(
  dashboardPage,
  /\/\/ role === 'VET'[\s\S]*?const result = await fetchNvetAppointments\(accessToken\);[\s\S]*?return\s*\([\s\S]*?<DashboardShell title="Mi agenda"[\s\S]*?<VetAgendaPanel\b/,
  'After ADMIN and CLIENT are handled, the executable VET fallback must fetch appointments and return the veterinarian agenda panel.',
);

// Persona-specific affordances must remain scoped to the effective role and
// must not leak admin controls into the public login or ordinary dashboards.
assert.match(dashboardLayout, /role === 'CLIENT'/, 'CLIENT must receive client-only dashboard actions.');
assert.match(dashboardLayout, /Solicitar atención/, 'CLIENT dashboard must expose the provider-aware attention-request entry point.');
assert.match(dashboardLayout, /role === 'VET'/, 'VET must receive veterinarian-only dashboard actions.');
assert.match(dashboardLayout, /Operar servicios/, 'VET dashboard must expose service operations.');

// All authenticated user-facing flows that a root may exercise in CLIENT mode
// must forward the server-side mode hint so backend ownership/RolesGuard rules
// are actually enforced rather than merely changing the UI.
assert.match(appointments, /getNvetAuthorizationHeaders\(accessToken\)/, 'Appointment reads must honor active CLIENT mode at the backend boundary.');
assert.match(clientBooking, /getNvetAuthorizationHeaders\(accessToken/, 'Pet and booking requests must honor active CLIENT mode at the backend boundary.');
assert.match(clientFulfillment, /getNvetAuthorizationHeaders\(accessToken/, 'Payments and reviews must honor active CLIENT mode at the backend boundary.');
assert.match(chat, /getNvetAuthorizationHeaders\(accessToken/, 'Chat participation must honor active CLIENT mode at the backend boundary.');

// Route-tree invariant: there must be no separate public privileged login
// anywhere under the Nvet App Router tree, and no Nvet route source may link
// users to one. Superadmin must enter through the same public login as every
// other persona and be recognized only after authentication.
const privilegedLoginRoute = nvetRoutePaths.find((path) => {
  const segments = path.toLowerCase().split('/');
  const hasAdminSegment = segments.includes('admin') || segments.includes('administrador');
  const hasLoginSegment = segments.includes('login') || segments.includes('iniciar-sesion');
  return hasAdminSegment && hasLoginSegment && /^page\.(?:ts|tsx|js|jsx)$/i.test(segments.at(-1) ?? '');
});
assert.equal(
  privilegedLoginRoute,
  undefined,
  `Nvet must not expose a separate public admin login route; found ${privilegedLoginRoute ?? 'none'}.`,
);
assert.doesNotMatch(
  nvetSourceCorpus,
  /\/nvetcareapp\/(?:admin|administrador)\/(?:login|iniciar-sesion)|\/nvetcareapp\/(?:login|iniciar-sesion)\/(?:admin|administrador)/i,
  'No Nvet route or navigation source may point to a separate privileged login path.',
);

// CTG One SSO is additive to the same public login and lands on the requested
// dashboard path only after a successful server-side identity exchange.
assert.match(continueWithCtg, /\/api\/nvetcareapp\/auth\/ctg-identity-exchange/, 'CTG One continuation must use the server-side Nvet identity-exchange BFF.');
assert.match(
  continueWithCtg,
  /if\s*\(!res\.ok\)\s*\{[\s\S]*?setError\(data\?\.message \|\| 'No se pudo continuar con tu cuenta CTG One\.'\);[\s\S]*?return;\s*\}\s*router\.push\(next\);/,
  'A non-OK identity exchange must return before router.push(next); only a successful exchange may enter the dashboard.',
);
assert.doesNotMatch(continueWithCtg, /\/admin\/login/, 'CTG One continuation must not reveal a separate privileged login path.');

console.log('Nvet Care admin-metrics + unified dashboard + canonical root client-mode invariants: PASS');
