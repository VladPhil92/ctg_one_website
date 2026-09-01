import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [
  model,
  page,
  inbox,
  layout,
  readRoute,
  readAllRoute,
] = await Promise.all([
  read('src/lib/nvetcareapp/notifications.ts'),
  read('src/app/nvetcareapp/dashboard/notificaciones/page.tsx'),
  read('src/app/nvetcareapp/dashboard/notificaciones/notification-inbox.tsx'),
  read('src/app/nvetcareapp/dashboard/layout.tsx'),
  read('src/app/api/nvetcareapp/notifications/[id]/read/route.ts'),
  read('src/app/api/nvetcareapp/notifications/read-all/route.ts'),
]);

assert.match(model, /'APPOINTMENT' \| 'PAYMENT' \| 'PREVENTIVE'/, 'Notification read model must support appointment, payment and preventive events.');
assert.match(model, /safeNotificationHref/, 'Notification links must pass through a server-side safe-href resolver.');
assert.match(model, /role === 'CLIENT'/, 'Safe-href resolver must scope client destinations.');
assert.match(model, /role === 'VET'/, 'Safe-href resolver must scope veterinarian destinations.');
assert.match(model, /PET_HEALTH_ROUTE\.test\(actionPath\)/, 'Dynamic pet-health links must be constrained by an explicit route pattern.');
assert.doesNotMatch(inbox, /href=\{item\.actionPath\}/, 'Browser UI must never render the backend actionPath directly.');
assert.match(inbox, /href=\{item\.safeHref\}/, 'Browser UI may render only the server-filtered safeHref.');
assert.match(inbox, /\/api\/nvetcareapp\/notifications\/\$\{id\}\/read/, 'Single read acknowledgement must use the neutral notification BFF.');
assert.match(inbox, /\/api\/nvetcareapp\/notifications\/read-all/, 'Bulk acknowledgement must use the neutral notification BFF.');

assert.match(page, /userResult\.user\.isVetTesterMode[\s\S]*redirect\('\/nvetcareapp\/dashboard\/vet-tester'\)/, 'Vet Tester must fail closed to its isolated sandbox before loading the real inbox.');
assert.match(page, /role !== 'CLIENT' && userResult\.user\.role !== 'VET'/, 'Only CLIENT and real VET may enter the durable notification center.');
assert.match(page, /fetchNvetNotifications\(accessToken, role, 50\)/, 'Inbox parsing must receive the server-resolved effective role.');

for (const [name, source] of [
  ['single notification acknowledgement', readRoute],
  ['bulk notification acknowledgement', readAllRoute],
]) {
  assert.match(source, /NVET_ACCESS_COOKIE/, `${name} must use the server-held Nvet session cookie.`);
  assert.match(source, /fetchNvetCurrentUser\(accessToken\)/, `${name} must resolve effective role server-side.`);
  assert.match(source, /isVetTesterMode/, `${name} must explicitly reject Vet Tester mode.`);
  assert.match(source, /\['CLIENT', 'VET'\]\.includes\(userResult\.user\.role\)/, `${name} must allow only CLIENT and VET actors.`);
  assert.doesNotMatch(source, /request\.headers\.get\(['"]authorization['"]\)/i, `${name} must not trust browser-supplied Authorization headers.`);
}

assert.match(layout, /fetchNvetUnreadNotificationCount\(accessToken\)/, 'Dashboard chrome must expose the durable unread counter.');
assert.match(layout, /!userResult\.user\.isVetTesterMode/, 'Dashboard chrome must not poll the production notification inbox in Vet Tester mode.');
assert.match(layout, /role === 'CLIENT' \|\| role === 'VET'/, 'Unread badge must be scoped to CLIENT and VET roles.');
assert.match(layout, /href="\/nvetcareapp\/dashboard\/notificaciones"/, 'Authenticated CLIENT/VET chrome must link to the notification center.');

console.log('Nvet Care durable notification inbox invariants: PASS');
