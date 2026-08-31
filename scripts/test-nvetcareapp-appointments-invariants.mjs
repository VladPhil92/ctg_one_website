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

// The status-update BFF route must require a session cookie before doing
// anything else — no accessToken, no upstream call.
assert.match(statusRoute, /if \(!accessToken\)/, 'Status-update route must reject requests with no session cookie.');
assert.match(statusRoute, /status: 401/, 'Status-update route must respond 401 when unauthenticated.');

// It must validate the requested status against a known allow-list before
// forwarding — defense in depth on top of the backend's own class-validator
// IsEnum check, not a replacement for it.
assert.match(
  statusRoute,
  /VALID_STATUSES\.includes/,
  'Status-update route must validate the requested status against an allow-list before forwarding.',
);

// The route must only ever forward `status` from the request body — never
// a client-supplied role, vetId, or ownership claim. The backend's own
// guard (RolesGuard(VET) + an ownership check keyed off the JWT) is the
// authoritative authorization boundary; this route must not carry any
// alternate identity claim that could let a caller act as a different vet.
assert.doesNotMatch(
  statusRoute,
  /body\.(vetId|role|userId|ownerId)/,
  'Status-update route must never read an identity/ownership claim from the request body — the JWT is the only identity source.',
);

// GET /appointments (used by both CLIENT and VET dashboards) must likewise
// never accept a client-supplied filter that could widen the query beyond
// what the backend's own role-scoped WHERE clause already restricts to.
assert.doesNotMatch(
  appointmentsRoute,
  /searchParams|request\.url|\?.*clientId|\?.*vetId/,
  'Appointments list route must not forward client-supplied query filters to the backend — the backend scopes the result by the caller\'s own role/identity.',
);

// The vet-facing "advance status" action must only ever offer the single
// valid forward transition for each status — matching
// appointments.service.ts::validateStatusTransition()'s vet-actionable
// subset (PENDING→CONFIRMED, CONFIRMED→IN_PROGRESS, IN_PROGRESS→COMPLETED).
// The backend is still the authoritative check; this guards against the
// UI drifting to offer a transition the backend would reject anyway.
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
    `Advance-status button must not offer any transition out of the terminal status ${terminal}.`,
  );
}

// A P2 review finding on PR #191: the dashboard checks for a 401 after the
// initial GET /api/auth/me call, but a token can expire in the narrow
// window before the second, role-specific fetch (metrics/appointments)
// completes — that second 401 must also redirect to sign-in, not render
// as a generic error. Every redirect('/nvetcareapp/iniciar-sesion') call
// must be paired with its own `status === 401` check immediately before it.
const redirectCount = (dashboardPage.match(/redirect\('\/nvetcareapp\/iniciar-sesion'\)/g) ?? []).length;
const status401CheckCount = (dashboardPage.match(/status === 401/g) ?? []).length;
// One redirect (the very first) is guarded by "no cookie at all", not a
// 401 response — every other redirect must be paired with its own
// `status === 401` check immediately before it.
assert.equal(
  redirectCount,
  status401CheckCount + 1,
  'Every sign-in redirect except the no-cookie guard must be paired with its own 401 check — one for the initial user lookup, and one for each role-specific fetch (ADMIN metrics, CLIENT/VET appointments).',
);
assert.ok(status401CheckCount >= 4, 'Dashboard must redirect on 401 after the user lookup and after each of the three role-specific fetches.');

// Phase: CLIENT transactional booking v1. Every private BFF surface must
// reject a missing httpOnly Nvet session and explicitly re-check CLIENT role.
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

// Identity and price authority are server-side. Booking may accept resource
// IDs/date/address from the client, but never an amount, role or identity
// override. serviceType and amount are resolved from the current public vet
// price catalog immediately before POST /appointments.
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
  'Booking v1 must stay on the currently supported non-automatic transfer path; unfinished CTG/PSE rails must not be exposed.',
);
assert.doesNotMatch(
  clientPetsRoute,
  /body\.(role|userId|ownerId)/,
  'Pet creation must never accept owner identity or role from the browser.',
);

// Booking dates are bounded, and the UI must use backend-provided available
// slots rather than allowing a free-form time that bypasses schedule UX.
assert.match(clientScheduleRoute, /next 90 days|próximos 90 días/, 'Schedule BFF must bound booking horizon to 90 days.');
assert.match(clientAppointmentsRoute, /next 90 days|próximos 90 días/, 'Appointment BFF must bound booking horizon to 90 days.');
assert.match(bookingFlow, /slots\.filter\(\(slot\) => slot\.available\)/, 'Booking UI must render only available backend schedule slots.');
assert.match(bookingFlow, /priceId:\s*selectedPriceId/, 'Booking UI must identify the selected catalog price by ID.');
assert.doesNotMatch(bookingFlow, /amount:\s*selectedPrice|amountCop:/, 'Booking UI must never submit a charge amount.');

// The booking page and its discoverability affordance are both role-aware:
// non-client roles return to the normal role router, and only CLIENT users get
// the floating "Agendar cita" action in the shared dashboard layout.
assert.match(bookingPage, /userResult\.user\.role !== 'CLIENT'/, 'Booking page must reject non-client roles.');
assert.match(dashboardLayout, /userResult\.user\.role === 'CLIENT'/, 'Dashboard booking action must only render for CLIENT users.');
assert.match(dashboardLayout, /\/nvetcareapp\/dashboard\/reservar/, 'CLIENT dashboard must expose the booking journey.');

console.log('Nvet Care appointments invariants: PASS');
