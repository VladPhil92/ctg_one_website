import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [network, navbar, hero, footer, translations] = await Promise.all([
  read('src/components/BlockchainNetwork.tsx'),
  read('src/components/Navbar.tsx'),
  read('src/components/sections/HeroSection.tsx'),
  read('src/components/Footer.tsx'),
  read('src/i18n/commandCenterTranslations.ts'),
]);

const nodeIds = [...network.matchAll(/\{ id: '([^']+)', en:/g)].map((match) => match[1]);
assert.deepEqual(
  nodeIds,
  ['ai', 'commerce', 'hospitality', 'education', 'health', 'legal', 'design', 'fintech'],
  'Homepage ecosystem core must retain exactly the eight approved nodes in canonical orbital order.',
);

for (const label of [
  'Estrategia de IA',
  'Comercio',
  'Hospitalidad',
  'Educación',
  'Salud',
  'Legal',
  'Diseño',
  'Fintech',
]) {
  assert.ok(network.includes(label), `Ecosystem core must retain Spanish node label: ${label}`);
}

assert.match(network, /href="\/images\/logo\/ctg-one-coin-icon\.png"/, 'Ecosystem core must use the approved compact CTG One mark.');
assert.match(navbar, /src="\/images\/logo\/ctg-one-logo\.png"/, 'Navbar must use the official CTG One Technology lockup.');
assert.doesNotMatch(navbar, /CTGLOGO\.jpeg/, 'Navbar must not regress to the legacy cropped JPEG logo.');
assert.match(footer, /src="\/images\/logo\/ctg-one-logo\.png"/, 'Footer must use the official CTG One Technology lockup.');
assert.doesNotMatch(footer, /CTGLOGO\.jpeg/, 'Footer must not regress to the legacy cropped JPEG logo.');

for (const capability of ['identity-auth', 'data-security', 'delivery-platform', 'ai-layer']) {
  assert.ok(hero.includes(`id: '${capability}'`), `System Status must retain capability: ${capability}`);
}
assert.match(hero, /Container size="large"/, 'Homepage hero must use the wide command-center container.');
assert.match(hero, /Plataforma de identidad/, 'System Status must retain the identity platform label.');
assert.match(hero, /Datos y seguridad/, 'System Status must retain data and security.');
assert.match(hero, /Infraestructura de entrega/, 'System Status must retain delivery infrastructure.');
assert.match(hero, /IA aplicada/, 'System Status must retain applied AI.');

for (const phrase of ['Core online', 'LIVE PRODUCT / CASE-001', 'Physical production layer']) {
  assert.ok(translations.includes(phrase), `Command-center microcopy must remain registered for ES/EN translation: ${phrase}`);
}

console.log('Homepage command-center design invariants: PASS');
