import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [statusRoute, appointmentsRoute, advanceButton] = await Promise.all([
  read('src/app/api/nvetcareapp/appointments/[id]/status/route.ts'),
  read('src/app/api/nvetcareapp/appointments/route.ts'),
  read('src/app/nvetcareapp/dashboard/advance-status-button.tsx'),
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

console.log('Nvet Care appointments invariants: PASS');
