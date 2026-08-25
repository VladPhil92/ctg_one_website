import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const admin = await read('src/lib/nvetcareapp/admin.ts');

// A P2 review finding on PR #189: fetch() rejects on network failure
// (unreachable backend, DNS, timeout, connection reset) rather than
// resolving with a non-OK Response. An uncaught rejection there means
// the dashboard page and the BFF route both 500 instead of showing
// their intended graceful "couldn't reach the backend" state.
assert.match(
  admin,
  /try\s*\{[\s\S]*?fetch\(`\$\{getNvetApiUrl\(\)\}\/api\/admin\/metrics`[\s\S]*?\}\s*catch[\s\S]*?status:\s*502/,
  'fetchNvetAdminMetrics must catch fetch() rejections and resolve to a graceful { ok: false, status: 502 } result, not throw.',
);

// A malformed-but-200 response must not throw out of res.json() either.
assert.match(
  admin,
  /res\.json\(\)[\s\S]*?catch[\s\S]*?status:\s*502/,
  'fetchNvetAdminMetrics must catch res.json() parse failures and resolve to a graceful result, not throw.',
);

// A real non-OK response (e.g. 403 from RolesGuard) must still be
// forwarded as-is, not swallowed into the network-failure branch.
assert.match(
  admin,
  /if\s*\(!res\.ok\)\s*\{\s*return\s*\{\s*ok:\s*false,\s*status:\s*res\.status\s*\}/,
  'fetchNvetAdminMetrics must forward the real backend status for a non-OK response, not replace it with 502.',
);

console.log('Nvet Care admin-metrics invariants: PASS');
