import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const exchangeRoute = await readFile(
  'src/app/api/federation/pisao/exchange/route.ts',
  'utf8',
);

assert.match(
  exchangeRoute,
  /\.from\('profiles'\)[\s\S]*?\.select\('role'\)[\s\S]*?\.eq\('id', data\.subject_user_id\)/,
  'PISÁO federation must resolve the canonical CTG One profile role for the exchanged subject.',
);

assert.match(
  exchangeRoute,
  /FEDERATION_PROFILE_LOOKUP_FAILED/,
  'PISÁO federation must fail closed when canonical role lookup fails.',
);

assert.match(
  exchangeRoute,
  /role:\s*profile\?\.role\s*\?\?\s*null/,
  'PISÁO federation must return the canonical role in the server-to-server exchange.',
);

assert.doesNotMatch(
  exchangeRoute,
  /role:\s*['"]admin['"]/,
  'PISÁO federation must never hard-code administrative authority.',
);

const profileLookupIndex = exchangeRoute.indexOf(".from('profiles')");
const consumeIndex = exchangeRoute.indexOf(".update({ consumed_at: consumedAt })");
assert.ok(
  profileLookupIndex >= 0 && consumeIndex >= 0 && profileLookupIndex < consumeIndex,
  'Canonical role lookup must complete before the one-time federation code is consumed.',
);

console.log('PISÁO admin federation invariants: PASS');
