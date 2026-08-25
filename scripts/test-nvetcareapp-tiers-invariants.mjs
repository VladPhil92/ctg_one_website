import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [tierRoute, listRoute, page] = await Promise.all([
  read('src/app/api/nvetcareapp/admin/veterinarians/[id]/tier/route.ts'),
  read('src/app/api/nvetcareapp/admin/veterinarians/route.ts'),
  read('src/app/nvetcareapp/dashboard/veterinarios/page.tsx'),
]);

// The tier-update BFF route must require a session cookie and validate the
// requested tier against a known allow-list before forwarding — defense in
// depth on top of the backend's own class-validator IsEnum check.
assert.match(tierRoute, /if \(!accessToken\)/, 'Tier-update route must reject requests with no session cookie.');
assert.match(tierRoute, /status: 401/, 'Tier-update route must respond 401 when unauthenticated.');
assert.match(tierRoute, /VALID_TIERS\.includes/, 'Tier-update route must validate the requested tier against an allow-list before forwarding.');

// Neither BFF route may read an identity/role claim from the request —
// admin authorization is the backend's own RolesGuard(ADMIN), keyed off
// the JWT, not anything this route could be tricked into trusting.
for (const [name, source] of [['tier-update route', tierRoute], ['veterinarians list route', listRoute]]) {
  assert.doesNotMatch(
    source,
    /body\.(role|isAdmin|userId)/,
    `${name} must never read an identity/role claim from the request body — the JWT is the only identity source.`,
  );
}

// The admin veterinarians page must gate on the session's own role rather
// than assuming every visitor is an admin — a non-admin must see a
// graceful message, not a crash or someone else's data.
assert.match(page, /userResult\.user\.role === 'ADMIN'/, 'Veterinarians page must gate rendering on the session role being ADMIN.');
assert.match(page, /!isAdmin/, 'Veterinarians page must render a distinct state for a non-admin visitor.');

// The backend paginates GET /admin/veterinarians (limit/offset, hasMore) —
// the page must forward an offset and expose a way to reach a later page,
// not just always render page one (Codex review finding on PR #192: every
// vet past the first page was unreachable from this UI).
assert.match(listRoute, /searchParams\.get\('offset'\)/, 'Veterinarians list route must read an offset query param.');
assert.match(listRoute, /Number\.isInteger\(offset\) && offset >= 0|!Number\.isInteger\(offset\) \|\| offset < 0/, 'Veterinarians list route must validate offset as a non-negative integer.');
assert.match(page, /hasMore/, 'Veterinarians page must check the backend\'s hasMore flag.');
assert.match(page, /offset:\s*Math\.max\(0, offset - vetsResult\.page\.limit\)|offset - vetsResult\.page\.limit/, 'Veterinarians page must offer a way back to the previous page.');
assert.match(page, /offset \+ vetsResult\.page\.limit/, 'Veterinarians page must offer a way to reach the next page when hasMore is true.');

console.log('Nvet Care tiers invariants: PASS');
