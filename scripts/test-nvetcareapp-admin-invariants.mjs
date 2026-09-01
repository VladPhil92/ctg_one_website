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
  vetTesterDashboard,
  vetWorkspace,
  vetWorkspacePage,
  vetDashboard,
  vetAvailabilityRoute,
  vetPricesRoute,
  vetPriceRoute,
  vetScheduleRoute,
  signInForm,
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
  read('src/app/nvetcareapp/dashboard/vet-tester-dashboard.tsx'),
  read('src/app/nvetcareapp/dashboard/vet-workspace.tsx'),
  read('src/app/nvetcareapp/dashboard/veterinario/page.tsx'),
  read('src/lib/nvetcareapp/vet-dashboard.ts'),
  read('src/app/api/nvetcareapp/vet/availability/route.ts'),
  read('src/app/api/nvetcareapp/vet/prices/route.ts'),
  read('src/app/api/nvetcareapp/vet/prices/[id]/route.ts'),
  read('src/app/api/nvetcareapp/vet/schedule/exceptions/[date]/route.ts'),
  read('src/app/nvetcareapp/iniciar-sesion/sign-in-form.tsx'),
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

// Admin reads must fail gracefully on transport or malformed-response failures.
assert.match(
  admin,
  /try\s*\{[\s\S]*?fetch\(`\$\{getNvetApiUrl\(\)\}\/api\/admin\/metrics`[\s\S]*?\}\s*catch[\s\S]*?status:\s*502/,
  'fetchNvetAdminMetrics must catch fetch() rejections and resolve to a graceful { ok: false, status: 502 } result, not throw.',
);
assert.match(
  admin,
  /res\.json\(\)[\s\S]*?catch[\s\S]*?status:\s*502/,
  'fetchNvetAdminMetrics must catch res.json() parse failures and resolve to a graceful result, not throw.',
);
assert.match(
  admin,
  /if\s*\(!res\.ok\)\s*\{\s*return\s*\{\s*ok:\s*false,\s*status:\s*res\.status\s*\}/,
  'fetchNvetAdminMetrics must forward the real backend status for a non-OK response, not replace it with 502.',
);

// Canonical SUPERADMIN web projection must be dual-bound to CTG One + Nvet.
assert.match(superadmin, /supabase\.auth\.getUser\(\)/, 'Superadmin identity must be validated server-side with Supabase auth.getUser().');
assert.match(superadmin, /createHash\('sha256'\)/, 'Superadmin identity must compare a one-way subject digest.');
assert.match(superadmin, /isCanonicalNvetSuperadminSubject/, 'The canonical subject verifier must be reusable for the Nvet identity link.');
assert.doesNotMatch(superadmin, /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i, 'The raw canonical Supabase UUID must not be committed to the web repository.');
assert.match(user, /const firstName = cleanName\(raw\.firstName\)/, 'Current-user parsing must tolerate nullable CTG-provisioned firstName.');
assert.doesNotMatch(user, /typeof raw\.firstName !== 'string'[\s\S]*status: 502/, 'Nullable Nvet profile names must not reject an otherwise valid user.');
assert.match(user, /canonicalSession\s*&&\s*canonicalNvetLink/, 'Root projection must dual-bind the CTG One session and the Nvet identity link.');
assert.match(user, /typeof raw\.ctgUserId === 'string'/, 'Nvet current-user parsing must read the server-returned ctgUserId link.');
assert.match(user, /isCanonicalNvetSuperadminSubject\(raw\.ctgUserId\)/, 'The Nvet identity link must match the pinned canonical subject.');
assert.match(user, /isSuperadmin:\s*canonicalSuperadmin/, 'Current-user result must carry the dual-bound root marker.');

// CLIENT is an effective backend role; VET_TESTER is presentation-only.
assert.match(
  user,
  /const rootClientMode = canonicalSuperadmin && upstreamRole === 'CLIENT'/,
  'Canonical root CLIENT mode must be derived from the backend effective role.',
);
assert.match(
  user,
  /requestedMode === 'VET_TESTER'/,
  'Vet Tester mode must be derived from the dedicated root mode cookie only after canonical identity validation.',
);
assert.match(
  user,
  /canonicalSuperadmin\s*&&\s*!rootClientMode\s*&&[\s\S]*?requestedMode === 'VET_TESTER'/,
  'Vet Tester must be impossible for non-root or active CLIENT sessions.',
);
assert.match(
  user,
  /canonicalSuperadmin\s*\?\s*rootClientMode\s*\?\s*'CLIENT'\s*:\s*'ADMIN'/,
  'Vet Tester must not synthesize VET authority; canonical root remains ADMIN unless backend-confirmed CLIENT mode is active.',
);
assert.match(user, /isClientMode:\s*rootClientMode/, 'Current-user result must expose root client-mode state explicitly.');
assert.match(user, /isVetTesterMode:\s*rootVetTesterMode/, 'Current-user result must expose root Vet Tester presentation state explicitly.');
assert.match(session, /NvetRootRoleMode = 'SUPERADMIN' \| 'CLIENT' \| 'VET_TESTER'/, 'Session model must explicitly enumerate the isolated Vet Tester mode.');
assert.match(session, /NVET_ROLE_MODE_COOKIE = 'nvet_role_mode'/, 'Root role mode must use a dedicated session cookie.');
assert.match(session, /setNvetRoleModeCookie[\s\S]*?httpOnly:\s*true/, 'Role-mode cookie must be httpOnly.');
assert.match(session, /clearNvetSessionCookies[\s\S]*?clearNvetRoleModeCookie/, 'Logout must clear root role mode with the Nvet session.');
assert.match(
  requestHeaders,
  /roleMode === 'CLIENT'\s*\?\s*\{ 'X-Nvet-Acting-Role': 'CLIENT' \}\s*:\s*\{\}/,
  'Only CLIENT may be forwarded as the root acting-role hint.',
);
assert.doesNotMatch(requestHeaders, /X-Nvet-Acting-Role['"]?:\s*['"](?:ADMIN|VET|SUPERADMIN|VET_TESTER)['"]/, 'Web BFF must never forward a privileged or tester acting-role hint.');

// Root mode switch must revalidate identity and isolate Vet Tester from backend authority.
assert.match(roleModeRoute, /new Set<NvetRootRoleMode>\(\['SUPERADMIN', 'CLIENT'\]\)/, 'Effective backend role-mode allowlist must remain SUPERADMIN/CLIENT only.');
assert.match(roleModeRoute, /VET_TESTER_MODE:\s*NvetRootRoleMode\s*=\s*'VET_TESTER'/, 'Vet Tester must be handled separately from the effective backend role allowlist.');
assert.match(roleModeRoute, /!currentUser\.user\.isSuperadmin/, 'Role-mode BFF must reject every non-canonical user.');
assert.match(roleModeRoute, /setNvetRoleModeCookie\(response, body\.mode\)/, 'Validated mode changes must be stored only after canonical-root verification.');
assert.doesNotMatch(roleModeRoute, /users?\.role|update[^\n]*role|\/api\/admin\/users/i, 'Role-mode BFF must not mutate the persistent user role.');
assert.match(roleSwitch, /Cambiar a usuario/, 'SUPERADMIN chrome must expose one-click CLIENT mode.');
assert.match(roleSwitch, /Cambiar a Vet Tester/, 'SUPERADMIN chrome must expose one-click Vet Tester mode.');
assert.match(roleSwitch, /Volver a SUPERADMIN/, 'Test modes must expose one-click return to SUPERADMIN.');
assert.match(roleSwitch, /\/api\/nvetcareapp\/auth\/role-mode/, 'Role switch UI must call the protected role-mode BFF.');

// Root UI: privileged nav is hidden in CLIENT and Vet Tester; tester renders sandbox.
assert.match(dashboardTemplate, /userResult\.user\.isSuperadmin/, 'Dashboard template must render root chrome only from the dual-bound user result.');
assert.doesNotMatch(dashboardTemplate, /isCanonicalNvetSuperadminSession/, 'Dashboard template must not independently infer root authority from the CTG cookie alone.');
assert.match(dashboardTemplate, /Superadmin Nvet Care/, 'Canonical root must receive an explicit SUPERADMIN dashboard surface.');
assert.match(dashboardTemplate, /Identidad raíz única/, 'SUPERADMIN dashboard must communicate singleton root authority.');
assert.match(dashboardTemplate, /Modo usuario/, 'Root chrome must disclose CLIENT mode.');
assert.match(dashboardTemplate, /Vet Tester/, 'Root chrome must disclose Vet Tester mode.');
assert.match(dashboardTemplate, /Modo SUPERADMIN/, 'Root chrome must disclose privileged mode.');
assert.match(dashboardTemplate, /isVetTester\s*\?\s*\(\s*<VetTesterDashboard/, 'Vet Tester must replace child operational surfaces with the isolated sandbox.');
assert.match(dashboardTemplate, /!isClientMode\s*&&\s*\([\s\S]*?!isVetTester/, 'Privileged root navigation must stay hidden in CLIENT and Vet Tester modes.');
assert.match(requireSuperadmin, /userResult\.user\.isClientMode/, 'Privileged pages must reject the canonical root while it is intentionally operating as CLIENT.');

// Sandbox itself must be local/in-memory and clearly labeled as non-production.
assert.match(vetTesterDashboard, /useState/, 'Vet Tester must use isolated client-side sandbox state.');
assert.match(vetTesterDashboard, /INITIAL_STATE/, 'Vet Tester must initialize deterministic sandbox data.');
assert.match(vetTesterDashboard, /sandbox-/i, 'Vet Tester fixtures must be visibly namespaced as sandbox data.');
assert.doesNotMatch(vetTesterDashboard, /fetch\(|nvetFetchWithRefresh|\/api\/nvetcareapp\/vet\//, 'Vet Tester sandbox must not call real veterinarian mutation APIs.');

// Unified dashboard access contract remains valid for ADMIN/CLIENT and legacy root route.
assert.match(dashboardPage, /redirect\('\/nvetcareapp\/iniciar-sesion'\)/, 'Unauthenticated dashboard access must return to the one public Nvet login.');
assert.match(dashboardPage, /if \(role === 'ADMIN'\)/, 'ADMIN/SUPERADMIN projection must render the administrative dashboard read-model.');
assert.match(dashboardPage, /if \(role === 'CLIENT'\)/, 'CLIENT must render the user care dashboard.');
assert.match(
  user,
  /upstreamRole === 'ADMIN' \|\| upstreamRole === 'VET' \|\| upstreamRole === 'CLIENT'/,
  'Only known ADMIN, VET and CLIENT upstream roles may reach dashboard routing after root projection.',
);

// Real veterinarians have a canonical, fully integrated professional workspace.
assert.match(vetWorkspacePage, /userResult\.user\.role !== 'VET'/, 'Canonical veterinarian workspace must reject every non-VET effective role.');
assert.match(vetWorkspacePage, /fetchNvetAppointments\(accessToken\)/, 'Veterinarian workspace must load the veterinarian appointment scope.');
assert.match(vetWorkspacePage, /fetchNvetVetProfile\(accessToken\)/, 'Veterinarian workspace must load professional profile state.');
assert.match(vetWorkspacePage, /fetchNvetVetEarnings\(accessToken\)/, 'Veterinarian workspace must load earnings state.');
assert.match(vetWorkspacePage, /fetchNvetVetPrices\(accessToken\)/, 'Veterinarian workspace must load veterinarian pricing.');
assert.match(vetWorkspacePage, /fetchNvetScheduleExceptions\(/, 'Veterinarian workspace must load schedule exceptions.');
assert.match(vetWorkspacePage, /<VetWorkspace\b/, 'Canonical veterinarian route must render the integrated VetWorkspace.');
assert.match(vetWorkspace, /Operar servicios/, 'Veterinarian workspace must expose clinical service operations.');
assert.match(vetWorkspace, /ChatPanel/, 'Veterinarian workspace must integrate appointment chat.');
assert.match(vetWorkspace, /AdvanceStatusButton/, 'Veterinarian workspace must integrate appointment lifecycle actions.');
assert.match(vetWorkspace, /\/api\/nvetcareapp\/vet\/availability/, 'Veterinarian workspace must integrate availability mutation.');
assert.match(vetWorkspace, /\/api\/nvetcareapp\/vet\/prices/, 'Veterinarian workspace must integrate pricing mutation.');
assert.match(vetWorkspace, /\/api\/nvetcareapp\/vet\/schedule\/exceptions/, 'Veterinarian workspace must integrate schedule-exception mutation.');
assert.match(vetDashboard, /getNvetAuthorizationHeaders\(accessToken\)/, 'Veterinarian domain adapter must preserve server-side authorization headers.');
assert.match(vetDashboard, /cache:\s*'no-store'/, 'Veterinarian domain reads must not leak cross-user cache state.');

// Every veterinarian mutation BFF must re-authorize a true VET identity.
for (const [name, route] of [
  ['availability', vetAvailabilityRoute],
  ['prices', vetPricesRoute],
  ['price item', vetPriceRoute],
  ['schedule exception', vetScheduleRoute],
]) {
  assert.match(route, /requireNvetVet\(accessToken\)/, `${name} BFF must require a real veterinarian identity before mutation.`);
}
assert.match(vetPricesRoute, /priceCop < 5000 \|\| priceCop > 10_000_000/, 'Veterinarian price creation must enforce bounded COP values.');
assert.match(vetScheduleRoute, /isValidIsoDate/, 'Schedule exceptions must validate real calendar dates, not only date-shaped strings.');
assert.match(vetScheduleRoute, /isValidTime/, 'Schedule exceptions must validate real 24-hour times.');
assert.match(vetScheduleRoute, /input\.startTime >= input\.endTime/, 'Schedule exception ranges must reject non-increasing time windows.');

// Persona-specific affordances remain scoped to effective role.
assert.match(dashboardLayout, /role === 'CLIENT'/, 'CLIENT must receive client-only dashboard actions.');
assert.match(dashboardLayout, /Solicitar atención/, 'CLIENT dashboard must expose the provider-aware attention-request entry point.');
assert.match(dashboardLayout, /role === 'VET'/, 'VET must receive veterinarian-only dashboard actions.');
assert.match(dashboardLayout, /\/nvetcareapp\/dashboard\/veterinario/, 'VET navigation must expose the canonical veterinarian workspace.');
assert.match(dashboardLayout, /Operar servicios/, 'VET dashboard must expose service operations.');

// CLIENT-mode backend ownership enforcement must remain intact.
assert.match(appointments, /getNvetAuthorizationHeaders\(accessToken\)/, 'Appointment reads must honor active CLIENT mode at the backend boundary.');
assert.match(clientBooking, /getNvetAuthorizationHeaders\(accessToken/, 'Pet and booking requests must honor active CLIENT mode at the backend boundary.');
assert.match(clientFulfillment, /getNvetAuthorizationHeaders\(accessToken/, 'Payments and reviews must honor active CLIENT mode at the backend boundary.');
assert.match(chat, /getNvetAuthorizationHeaders\(accessToken/, 'Chat participation must honor active CLIENT mode at the backend boundary.');

// There must be one public login, never a discoverable privileged login.
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

// Direct and CTG One login should route real VETs into the canonical workspace
// while preserving explicitly requested safe destinations.
assert.match(signInForm, /data\?\.user\?\.role === 'VET'/, 'Direct Nvet login must recognize real veterinarian identity.');
assert.match(signInForm, /\/nvetcareapp\/dashboard\/veterinario/, 'Direct Nvet login must use the canonical veterinarian workspace landing.');
assert.match(signInForm, /!requestedNext/, 'Direct login must preserve explicit safe next destinations over role-default routing.');
assert.match(continueWithCtg, /\/api\/nvetcareapp\/auth\/ctg-identity-exchange/, 'CTG One continuation must use the server-side Nvet identity-exchange BFF.');
assert.match(continueWithCtg, /data\?\.user\?\.role === 'VET'/, 'CTG identity exchange must recognize real veterinarian identity.');
assert.match(continueWithCtg, /\/nvetcareapp\/dashboard\/veterinario/, 'CTG identity exchange must use the canonical veterinarian workspace landing.');
assert.match(
  continueWithCtg,
  /if\s*\(!res\.ok\)\s*\{[\s\S]*?setError\(data\?\.message \|\| 'No se pudo continuar con tu cuenta CTG One\.'\);[\s\S]*?return;[\s\S]*?\}[\s\S]*?router\.push\(next\);/,
  'A non-OK identity exchange must return before any successful dashboard navigation.',
);
assert.doesNotMatch(continueWithCtg, /\/admin\/login/, 'CTG One continuation must not reveal a separate privileged login path.');

console.log('Nvet Care canonical root + Vet Tester sandbox + integrated veterinarian workspace invariants: PASS');
