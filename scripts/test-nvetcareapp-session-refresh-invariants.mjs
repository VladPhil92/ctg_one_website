import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

// Real behavioral coverage: exercise nvetFetchWithRefresh() against a
// stubbed global fetch/window, the same way test-safe-redirect-invariants.mjs
// exercises safeRedirectPath() — not just text pattern matching.
const { nvetFetchWithRefresh } = await import('../src/app/nvetcareapp/dashboard/nvet-fetch.ts');

function fakeResponse(status) {
  return { status, ok: status >= 200 && status < 300 };
}

// Case 1: a non-401 response is returned as-is, no refresh attempted.
{
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; return fakeResponse(200); };
  const res = await nvetFetchWithRefresh('/api/nvetcareapp/admin/veterinarians/v1/tier', { method: 'PATCH' });
  assert.equal(res.status, 200, 'A non-401 response must be returned unchanged.');
  assert.equal(calls, 1, 'A non-401 response must not trigger a refresh call.');
}

// Case 2: a 401, followed by a successful refresh, retries the original
// request once and returns the retry's response.
{
  const calls = [];
  globalThis.fetch = async (input, _init) => {
    calls.push(input);
    if (input === '/api/nvetcareapp/auth/refresh') return fakeResponse(200);
    return calls.filter((c) => c === input).length === 1 ? fakeResponse(401) : fakeResponse(200);
  };
  const res = await nvetFetchWithRefresh('/api/nvetcareapp/admin/veterinarians/v1/tier', { method: 'PATCH' });
  assert.equal(res.status, 200, 'After a successful refresh, the retried request\'s response must be returned.');
  assert.deepEqual(
    calls,
    ['/api/nvetcareapp/admin/veterinarians/v1/tier', '/api/nvetcareapp/auth/refresh', '/api/nvetcareapp/admin/veterinarians/v1/tier'],
    'Must call the original URL, then refresh, then retry the original URL exactly once each.',
  );
}

// Case 3: a 401 with a failed refresh (refresh token itself expired)
// redirects to sign-in instead of silently returning the stale 401.
{
  globalThis.fetch = async (input) => (input === '/api/nvetcareapp/auth/refresh' ? fakeResponse(401) : fakeResponse(401));
  globalThis.window = { location: { href: '' } };
  const res = await nvetFetchWithRefresh('/api/nvetcareapp/admin/veterinarians/v1/tier', { method: 'PATCH' });
  assert.equal(res.status, 401, 'On a failed refresh, the original 401 response is still returned to the caller.');
  assert.equal(
    globalThis.window.location.href,
    '/nvetcareapp/iniciar-sesion',
    'On a failed refresh, the visitor must be redirected to sign-in rather than left on a silently-broken write.',
  );
}

// Every client write component in the Nvet Care surface must route its
// write through the shared refresh-and-retry helper, not a bare fetch —
// this is the same bug class Codex review flagged on PR #192
// (tier-select.tsx bypassing the refresh path on an idle-expired session).
const writeComponents = [
  'src/app/nvetcareapp/dashboard/advance-status-button.tsx',
  'src/app/nvetcareapp/dashboard/veterinarios/tier-select.tsx',
  'src/app/nvetcareapp/dashboard/contabilidad/transfer-actions.tsx',
  'src/app/nvetcareapp/dashboard/contabilidad/dispute-resolution-form.tsx',
];
for (const path of writeComponents) {
  const source = await read(path);
  assert.match(source, /nvetFetchWithRefresh/, `${path} must route its write(s) through nvetFetchWithRefresh, not a bare fetch.`);
  assert.doesNotMatch(
    source,
    /(?<!nvetFetchWith)fetch\(`\/api\/nvetcareapp/,
    `${path} must not bypass nvetFetchWithRefresh with a bare fetch to /api/nvetcareapp.`,
  );
}

// Production access must not depend on an out-of-band Render variable that
// can drift from the repository. Keep the canonical Railway origin both in
// the server-side resolver and the Render blueprint; an explicit env override
// still wins for staging or future migrations.
const sessionSource = await read('src/lib/nvetcareapp/session.ts');
const renderBlueprint = await read('render.yaml');
const canonicalBackend = 'https://backend-production-a476.up.railway.app';
assert.match(
  sessionSource,
  /NVET_CANONICAL_PRODUCTION_API_URL/,
  'Nvet session resolver must carry a canonical production backend fallback.',
);
assert.ok(
  sessionSource.includes(canonicalBackend),
  'Nvet session resolver must point its production fallback at the canonical Railway backend.',
);
assert.match(
  sessionSource,
  /process\.env\.CTG_NVETCARE_API_URL/,
  'Explicit CTG_NVETCARE_API_URL must remain the first-class override.',
);
assert.ok(
  renderBlueprint.includes('key: CTG_NVETCARE_API_URL') && renderBlueprint.includes(canonicalBackend),
  'Render blueprint must declare the same canonical Nvet backend origin.',
);

console.log('Nvet Care session-refresh invariants: PASS');
