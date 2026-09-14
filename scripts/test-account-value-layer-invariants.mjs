import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [home, valueSection, registration, accountCta] = await Promise.all([
  readFile(new URL('../src/app/page.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/sections/AccountValueSection.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/(auth)/registro/page.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/sections/AccountCtaSection.tsx', import.meta.url), 'utf8'),
]);

assert.match(home, /AccountValueSection/);
assert.ok(
  home.indexOf('<AccountValueSection') < home.indexOf('<WorldMakersFeaturedSection'),
  'Account value must be explained before product discovery on Home.',
);

for (const required of [
  '¿Para qué crear una cuenta CTG One?',
  'Una identidad CTG One',
  'Wallet y actividad',
  'Tu educación',
  'Un centro de control',
  'CTG Rewards',
]) {
  assert.ok(valueSection.includes(required), `Missing account-value contract: ${required}`);
}

assert.match(
  valueSection,
  /Crear una cuenta hoy no significa que ya estés acumulando puntos o recompensas/,
  'Rewards must remain explicitly non-live in the account value proposition.',
);
assert.match(
  valueSection,
  /isLoading \? \(/,
  'The primary account CTA must wait for authentication bootstrap before choosing a destination.',
);
assert.match(
  valueSection,
  /Comprobando tu cuenta…/,
  'The authentication-loading state must be explicit and non-navigable.',
);
assert.ok(
  !valueSection.includes("href={isLoading || !isAuthenticated ? '/registro' : '/dashboard'}"),
  'Auth loading must never default the primary CTA to registration.',
);
assert.match(
  registration,
  /CTG Rewards continúa en roadmap/,
  'Registration must not imply that Rewards activate at signup.',
);
assert.match(registration, /Crear mi cuenta CTG One/);
assert.match(accountCta, /Identidad y verificación/);
assert.match(accountCta, /Wallet y actividad/);
assert.match(accountCta, /Accesos educativos/);

const forbiddenActiveRewardsClaims = [
  'Acumula puntos con cada compra',
  'Gana puntos con cada compra',
  'Earn points with every purchase',
  'Rewards activados',
  'Rewards activated',
];

for (const claim of forbiddenActiveRewardsClaims) {
  assert.ok(!valueSection.includes(claim), `Unsupported active Rewards claim found: ${claim}`);
  assert.ok(!registration.includes(claim), `Unsupported signup Rewards claim found: ${claim}`);
}

console.log('Account Value Layer invariants: PASS');
