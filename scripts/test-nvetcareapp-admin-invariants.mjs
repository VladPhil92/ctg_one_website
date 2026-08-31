import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const read = (filePath) => readFile(new URL(`../${filePath}`, import.meta.url), 'utf8');

async function collectRouteSources(dir, relative = '') {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = path.posix.join(relative, entry.name);
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectRouteSources(absolutePath, relativePath));
    } else if (/\.(?:ts|tsx|js|jsx)$/i.test(entry.name)) {
      files.push(relativePath);
    }
  }
  return files;
}

const nvetRoot = new URL('../src/app/nvetcareapp/', import.meta.url);
const nvetRoutePaths = await collectRouteSources(nvetRoot);
const nvetSourceCorpus = (await Promise.all(
  nvetRoutePaths.map(async (relativePath) => `${relativePath}\n${await read(`src/app/nvetcareapp/${relativePath}`)}`),
)).join('\n');

const [
  dashboardTemplate,
  dashboardPage,
  dashboardLayout,
  user,
  requireSuperadmin,
  appointments,
  clientBooking,
  clientFulfillment,
  chat,
] = await Promise.all([
  read('src/app/nvetcareapp/dashboard/template.tsx'),
  read('src/app/nvetcareapp/dashboard/page.tsx'),
  read('src/app/nvetcareapp/dashboard/layout.tsx'),
  read('src/lib/nvetcareapp/user.ts'),
  read('src/lib/nvetcareapp/require-superadmin.ts'),
  read('src/lib/nvetcareapp/appointments.ts'),
  read('src/lib/nvetcareapp/client-booking.ts'),
  read('src/lib/nvetcareapp/client-fulfillment.ts'),
  read('src/lib/nvetcareapp/chat.ts'),
]);

// The canonical root identity must be a single, backend-linked subject rather
// than a public/admin login convention. SUPERADMIN is projected to ADMIN or
// CLIENT at the UI boundary only after the canonical CTG identity bridge has
// been proven on both sides.
assert.match(user, /isCanonicalNvetSuperadminSession/, 'Root projection must depend on the canonical CTG session.');
assert.match(user, /isCanonicalNvetSuperadminSubject\(raw\.ctgUserId\)/, 'Root projection must verify the Nvet account link to the canonical CTG subject.');
assert.match(user, /canonicalSuperadmin = canonicalSession && canonicalNvetLink/, 'Both identity checks must be required before granting root capabilities.');
assert.match(user, /rootClientMode/, 'Root projection must preserve an explicit CLIENT mode.');
assert.match(user, /canonicalSuperadmin[\s\S]*?'CLIENT'[\s\S]*?'ADMIN'/, 'Canonical root must project only to CLIENT or ADMIN effective roles.');
assert.doesNotMatch(user, /email.*SUPERADMIN|SUPERADMIN.*email/i, 'Root authority must never be inferred from a public email convention.');

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
const privilegedLoginRoute = nvetRoutePaths.find((routePath) => {
  const normalized = routePath.replaceAll('\\', '/').toLowerCase();
  return normalized.includes('/admin/') && /\/(?:login|iniciar-sesion)\//.test(`/${normalized}/`);
});
assert.equal(privilegedLoginRoute, undefined, 'Nvet Care must not expose a separate public privileged-login route.');
assert.doesNotMatch(
  nvetSourceCorpus,
  /\/nvetcareapp\/(?:admin|administrador)\/(?:login|iniciar-sesion)|\/nvetcareapp\/(?:login|iniciar-sesion)\/(?:admin|administrador)/i,
  'No Nvet route or navigation source may point to a separate privileged login path.',
);

console.log('Nvet Care admin invariants: PASS');
