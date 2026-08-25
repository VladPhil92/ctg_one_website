import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [statusRoute, appointmentsRoute, advanceButton, dashboardPage] = await Promise.all([
  read('src/app/api/nvetcareapp/appointments/[id]/status/route.ts'),
  read('src/app/api/nvetcareapp/appointments/route.ts'),
  read('src/app/nvetcareapp/dashboard/advance-status-button.tsx'),
  read('src/app/nvetcareapp/dashboard/page.tsx'),
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

console.log('Nvet Care appointments invariants: PASS');
