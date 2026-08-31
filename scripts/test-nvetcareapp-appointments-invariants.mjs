import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [
  statusRoute,
  appointmentsRoute,
  advanceButton,
  dashboardPage,
  clientAppointmentsRoute,
  clientPetsRoute,
  clientVetsRoute,
  clientPricesRoute,
  clientScheduleRoute,
  bookingLibrary,
  bookingPage,
  bookingFlow,
  dashboardLayout,
] = await Promise.all([
  read('src/app/api/nvetcareapp/appointments/[id]/status/route.ts'),
  read('src/app/api/nvetcareapp/appointments/route.ts'),
  read('src/app/nvetcareapp/dashboard/advance-status-button.tsx'),
  read('src/app/nvetcareapp/dashboard/page.tsx'),
  read('src/app/api/nvetcareapp/client/appointments/route.ts'),
  read('src/app/api/nvetcareapp/client/pets/route.ts'),
  read('src/app/api/nvetcareapp/client/vets/route.ts'),
  read('src/app/api/nvetcareapp/client/vets/[id]/prices/route.ts'),
  read('src/app/api/nvetcareapp/client/vets/[id]/schedule/route.ts'),
  read('src/lib/nvetcareapp/client-booking.ts'),
  read('src/app/nvetcareapp/dashboard/reservar/page.tsx'),
  read('src/app/nvetcareapp/dashboard/reservar/client-booking-flow.tsx'),
  read('src/app/nvetcareapp/dashboard/layout.tsx'),
]);

assert.match(statusRoute, /if \(!accessToken\)/, 'Status-update route must reject requests with no session cookie.');
assert.match(statusRoute, /status: 401/, 'Status-update route must respond 401 when unauthenticated.');
assert.match(statusRoute, /VALID_STATUSES\.includes/, 'Status-update route must validate requested status before forwarding.');
assert.doesNotMatch(
  statusRoute,
  /body\.(vetId|role|userId|ownerId)/,
  'Status-update route must never read identity/ownership claims from the request body.',
);
assert.doesNotMatch(
  appointmentsRoute,
  /searchParams|request\.url|\?.*clientId|\?.*vetId/,
  'Appointments list route must not forward client-supplied query filters that can widen backend role scoping.',
);

const expectedTransitions = [
  ["PENDING: { next: 'CONFIRMED'", 'PENDING → CONFIRMED'],
  ["CONFIRMED: { next: 'IN_PROGRESS'", 'CONFIRMED → IN_PROGRESS'],
  ["IN_PROGRESS: { next: 'COMPLETED'", 'IN_PROGRESS → COMPLETED'],
];
for (const [needle, label] of expectedTransitions) {
  assert.ok(advanceButton.includes(needle), `Advance-status button must offer ${label}.`);
}
for (const terminal of ['COMPLETED', 'CANCELLED', 'DISPUTED']) {
  assert.ok(
    !new RegExp(`${terminal}: \\{ next:`).test(advanceButton),
    `Advance-status button must not offer any transition out of ${terminal}.`,
  );
}

const redirectCount = (dashboardPage.match(/redirect\('\/nvetcareapp\/iniciar-sesion'\)/g) ?? []).length;
const status401CheckCount = (dashboardPage.match(/status === 401/g) ?? []).length;
assert.equal(
  redirectCount,
  status401CheckCount + 1,
  'Every sign-in redirect except the no-cookie guard must be paired with its own 401 check.',
);
assert.ok(status401CheckCount >= 4, 'Dashboard must redirect on 401 after each role-specific authenticated fetch.');

// CLIENT booking v1: all private BFF surfaces require the server-side Nvet
// session and re-check CLIENT role rather than trusting a browser claim.
for (const [name, source] of [
  ['client appointments route', clientAppointmentsRoute],
  ['client pets route', clientPetsRoute],
  ['client vets route', clientVetsRoute],
  ['client prices route', clientPricesRoute],
  ['client schedule route', clientScheduleRoute],
]) {
  assert.match(source, /if \(!accessToken\)/, `${name} must reject requests with no session cookie.`);
  assert.match(source, /status: 401/, `${name} must return 401 when unauthenticated.`);
  assert.match(source, /requireNvetClient\(/, `${name} must verify CLIENT role server-side.`);
}

// Identity and price authority stay server-side. The browser identifies the
// selected resources but cannot choose the charge, service label, payment
// rail, owner or role.
assert.doesNotMatch(
  clientAppointmentsRoute,
  /body\.(amount|amountCop|serviceType|paymentMethod|role|userId|clientId|ownerId)/,
  'Client booking route must not trust browser-supplied financial, role or identity claims.',
);
assert.match(
  bookingLibrary,
  /fetchNvetVetPrices\(input\.vetId\)/,
  'Booking server contract must re-read the selected vet price catalog before booking.',
);
assert.match(
  bookingLibrary,
  /amount:\s*officialPrice\.priceCop/,
  'Booking server contract must derive COP amount from the server-read official price.',
);
assert.match(
  bookingLibrary,
  /serviceType:\s*officialPrice\.serviceName/,
  'Booking server contract must derive serviceType from the server-read official price.',
);
assert.match(
  bookingLibrary,
  /paymentMethod:\s*'TRANSFER'/,
  'Booking v1 must stay on the currently supported non-automatic transfer path.',
);
assert.doesNotMatch(
  clientPetsRoute,
  /body\.(role|userId|ownerId)/,
  'Pet creation must never accept owner identity or role from the browser.',
);

// Booking is replay-safe. A client-generated UUID identifies one logical
// booking attempt. Exact retries retain it, the BFF validates it, and the
// server-to-server call forwards it into the backend's persistent idempotency
// contract instead of risking a second reservation after a lost response.
assert.match(clientAppointmentsRoute, /const requestId = typeof body\.requestId === 'string'/, 'Booking BFF must read a dedicated requestId.');
assert.match(clientAppointmentsRoute, /UUID\.test\(requestId\)/, 'Booking BFF must require requestId to be a UUID.');
assert.match(clientAppointmentsRoute, /requestId,\s*\n\s*vetId,/, 'Booking BFF must forward the validated requestId to the server booking helper.');
assert.match(bookingLibrary, /'Idempotency-Key':\s*input\.requestId/, 'Server booking helper must forward requestId as Idempotency-Key.');
assert.match(bookingFlow, /crypto\.randomUUID\(\)/, 'Booking UI must generate a UUID for a new logical booking attempt.');
assert.match(bookingFlow, /const fingerprint = JSON\.stringify\(payload\)/, 'Booking UI must fingerprint the business payload for retry identity.');
assert.match(
  bookingFlow,
  /bookingAttempt\?\.fingerprint === fingerprint \? bookingAttempt\.requestId : crypto\.randomUUID\(\)/,
  'Booking UI must reuse requestId when retrying the exact same payload.',
);
assert.match(bookingFlow, /JSON\.stringify\(\{ \.\.\.payload, requestId \}\)/, 'Booking UI must send requestId with the booking request.');

// Booking dates are bounded and the UI presents only schedule slots that the
// Nvet backend marks available.
assert.match(clientScheduleRoute, /next 90 days|próximos 90 días/, 'Schedule BFF must bound booking horizon to 90 days.');
assert.match(clientAppointmentsRoute, /next 90 days|próximos 90 días/, 'Appointment BFF must bound booking horizon to 90 days.');
assert.match(clientScheduleRoute, /America\/Bogota/, 'Schedule BFF must calculate the date boundary in Colombia time.');
assert.match(clientAppointmentsRoute, /America\/Bogota/, 'Appointment BFF must calculate the date boundary in Colombia time.');
assert.match(bookingFlow, /slots\.filter\(\(slot\) => slot\.available\)/, 'Booking UI must derive the displayed slot list from backend availability.');
assert.match(bookingFlow, /priceId:\s*selectedPriceId/, 'Booking UI must identify the selected catalog price by ID.');
assert.doesNotMatch(bookingFlow, /amount:\s*selectedPrice|amountCop:/, 'Booking UI must never submit a charge amount.');

assert.match(bookingPage, /userResult\.user\.role !== 'CLIENT'/, 'Booking page must reject non-client roles.');
assert.match(dashboardLayout, /userResult\.user\.role === 'CLIENT'/, 'Dashboard booking action must only render for CLIENT users.');
assert.match(dashboardLayout, /\/nvetcareapp\/dashboard\/reservar/, 'CLIENT dashboard must expose the booking journey.');

console.log('Nvet Care appointments invariants: PASS');
