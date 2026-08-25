import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [
  transfersRoute,
  disputesRoute,
  confirmRoute,
  rejectRoute,
  resolveRoute,
  dashboardPage,
  accountingPage,
] = await Promise.all([
  read('src/app/api/nvetcareapp/admin/transfers/route.ts'),
  read('src/app/api/nvetcareapp/admin/disputes/route.ts'),
  read('src/app/api/nvetcareapp/admin/transactions/[id]/confirm-transfer/route.ts'),
  read('src/app/api/nvetcareapp/admin/transactions/[id]/reject-transfer/route.ts'),
  read('src/app/api/nvetcareapp/admin/transactions/[id]/resolve-dispute/route.ts'),
  read('src/app/nvetcareapp/dashboard/page.tsx'),
  read('src/app/nvetcareapp/dashboard/contabilidad/page.tsx'),
]);

// Every BFF route in this surface must reject an unauthenticated request
// before ever calling the backend.
for (const [name, source] of [
  ['transfers list route', transfersRoute],
  ['disputes list route', disputesRoute],
  ['confirm-transfer route', confirmRoute],
  ['reject-transfer route', rejectRoute],
  ['resolve-dispute route', resolveRoute],
]) {
  assert.match(source, /if \(!accessToken\)/, `${name} must reject requests with no session cookie.`);
  assert.match(source, /status: 401/, `${name} must respond 401 when unauthenticated.`);
}

// The two writes that take a free-text field must validate its length as
// defense in depth on top of the backend's own DTO validation.
assert.match(rejectRoute, /reason\.length < 10/, 'Reject-transfer route must require a reason of at least 10 characters.');
assert.match(resolveRoute, /VALID_RESOLUTIONS\.includes/, 'Resolve-dispute route must validate the resolution against an allow-list.');
assert.match(resolveRoute, /notes\.length < 10 \|\| notes\.length > 1000/, 'Resolve-dispute route must bound the notes length (10-1000 chars).');

// None of these routes may read an identity/role claim from the request
// body — admin authorization is the backend's own RolesGuard(ADMIN), keyed
// off the JWT, not anything a client could be tricked into supplying.
for (const [name, source] of [
  ['transfers list route', transfersRoute],
  ['disputes list route', disputesRoute],
  ['confirm-transfer route', confirmRoute],
  ['reject-transfer route', rejectRoute],
  ['resolve-dispute route', resolveRoute],
]) {
  assert.doesNotMatch(
    source,
    /body\.(role|isAdmin|userId)/,
    `${name} must never read an identity/role claim from the request body — the JWT is the only identity source.`,
  );
}

// The accounting page must gate on the session's own role and handle a
// 401 from EITHER of its two admin-only fetches (transfers, disputes) by
// redirecting to sign-in — the same bug class found and fixed on the main
// dashboard (PR #191): a 401 from a later fetch must not render as if it
// were just an empty/error state.
assert.match(accountingPage, /userResult\.user\.role === 'ADMIN'/, 'Accounting page must gate rendering on the session role being ADMIN.');
assert.match(accountingPage, /!isAdmin/, 'Accounting page must render a distinct state for a non-admin visitor.');
assert.match(
  accountingPage,
  /transfersResult && !transfersResult\.ok && transfersResult\.status === 401/,
  'Accounting page must redirect to sign-in on a 401 from the pending-transfers fetch.',
);
assert.match(
  accountingPage,
  /disputesResult && !disputesResult\.ok && disputesResult\.status === 401/,
  'Accounting page must redirect to sign-in on a 401 from the disputed-transactions fetch.',
);

// The admin dashboard must link to the accounting page, mirroring the
// existing link to the veterinarians tier-management page.
assert.match(dashboardPage, /\/nvetcareapp\/dashboard\/contabilidad/, 'Admin dashboard must link to the accounting page.');

console.log('Nvet Care accounting invariants: PASS');
