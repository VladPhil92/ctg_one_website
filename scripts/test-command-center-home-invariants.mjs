import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [network, navbar, hero, footer, brandLogo, languageContext, translations] = await Promise.all([
  read('src/components/BlockchainNetwork.tsx'),
  read('src/components/Navbar.tsx'),
  read('src/components/sections/HeroSection.tsx'),
  read('src/components/Footer.tsx'),
  read('src/components/BrandLogo.tsx'),
  read('src/contexts/LanguageContext.tsx'),
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
assert.match(brandLogo, /src="\/images\/logo\/ctg-one-coin-icon\.png"/, 'Brand lockup must use the María Mulata mark.');
assert.match(brandLogo, />CTG <\//, 'Brand lockup must render CTG as text, not inside a banner image.');
assert.match(brandLogo, />One<\//, 'Brand lockup must render One as text, not inside a banner image.');
assert.match(brandLogo, /Technology/, 'Brand lockup must render the Technology descriptor.');
assert.match(brandLogo, /data-no-translate/, 'Brand lockup must opt out of the internal DOM translation layer.');
assert.match(brandLogo, /translate="no"/, 'Brand lockup must opt out of browser translation engines.');
assert.match(languageContext, /IMMUTABLE_BRAND_NAMES = new Set\(\['CTG One', 'CTG One Technology'\]\)/, 'Language layer must preserve CTG One brand names verbatim.');
assert.match(languageContext, /data-brand-lockup="ctg-one-technology"/, 'Language layer must treat the CTG One brand lockup as translation-protected.');
assert.match(navbar, /<BrandLogo priority/, 'Navbar must render the structural CTG One Technology lockup.');
assert.match(footer, /<BrandLogo/, 'Footer must render the structural CTG One Technology lockup.');
for (const source of [navbar, footer, brandLogo]) {
  assert.doesNotMatch(source, /ctg-one-logo\.png/, 'Signature/banner logo asset must never be rendered by the CTG One brand lockup.');
  assert.doesNotMatch(source, /CTGLOGO\.jpeg/, 'Legacy cropped JPEG logo must never be rendered by the CTG One brand lockup.');
}

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
