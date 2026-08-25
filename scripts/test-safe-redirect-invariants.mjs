import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { safeRedirectPath } from '../src/lib/security/safe-redirect.ts';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

// Legitimate relative paths pass through unchanged.
assert.equal(safeRedirectPath('/nvetcareapp/dashboard', '/fallback'), '/nvetcareapp/dashboard');
assert.equal(safeRedirectPath('/dashboard?x=1#y', '/fallback'), '/dashboard?x=1#y');
assert.equal(safeRedirectPath(null, '/fallback'), '/fallback');
assert.equal(safeRedirectPath('', '/fallback'), '/fallback');

// Protocol-relative open redirect.
assert.equal(safeRedirectPath('//evil.example', '/fallback'), '/fallback');

// The backslash bypass flagged in review on PR #188: a naive
// `startsWith('/') && !startsWith('//')` check accepts this, but browsers
// resolve `\` like `/` for special schemes, so it still navigates
// off-origin. This must be blocked.
assert.equal(safeRedirectPath('/\\evil.example', '/fallback'), '/fallback');
assert.equal(safeRedirectPath('/\\\\evil.example', '/fallback'), '/fallback');

// Absolute URLs and non-http(s) schemes.
assert.equal(safeRedirectPath('https://evil.example', '/fallback'), '/fallback');
assert.equal(safeRedirectPath('javascript:alert(1)', '/fallback'), '/fallback');

// Every post-login "next" redirect on the site must route through the
// shared helper, not a hand-rolled prefix check that reintroduces the
// backslash bypass.
const [mainSignIn, authCallback, nvetSignIn] = await Promise.all([
  read('src/app/(auth)/iniciar-sesion/page.tsx'),
  read('src/app/auth/callback/route.ts'),
  read('src/app/nvetcareapp/iniciar-sesion/sign-in-form.tsx'),
]);

for (const [name, source] of [
  ['main sign-in page', mainSignIn],
  ['auth callback route', authCallback],
  ['Nvet Care sign-in form', nvetSignIn],
]) {
  assert.match(source, /safeRedirectPath/, `${name} must validate its "next" redirect target with safeRedirectPath.`);
  assert.doesNotMatch(
    source,
    /startsWith\('\/'\)[\s\S]{0,40}startsWith\('\/\/'\)/,
    `${name} must not reintroduce the naive startsWith('/') / startsWith('//') check.`,
  );
}

console.log('Safe-redirect invariants: PASS');
