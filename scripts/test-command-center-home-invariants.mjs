import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [network, navbar, hero, footer, brandLogo, languageContext, translations, processes, processPage] = await Promise.all([
  read('src/components/BlockchainNetwork.tsx'),
  read('src/components/Navbar.tsx'),
  read('src/components/sections/HeroSection.tsx'),
  read('src/components/Footer.tsx'),
  read('src/components/BrandLogo.tsx'),
  read('src/contexts/LanguageContext.tsx'),
  read('src/i18n/commandCenterTranslations.ts'),
  read('src/data/ecosystem-processes.ts'),
  read('src/app/ecosystem/process/[slug]/page.tsx'),
]);

const nodeIds = [...network.matchAll(/\{ id: '([^']+)', en:/g)].map((match) => match[1]);
assert.deepEqual(
  nodeIds,
  ['ai', 'commerce', 'hospitality', 'education', 'health', 'legal', 'beer', 'fintech'],
  'Homepage ecosystem core must retain exactly the eight approved process nodes in canonical orbital order.',
);

for (const label of [
  'Estrategia de IA',
  'Comercio',
  'Hospitalidad',
  'Educación',
  'Salud',
  'Legal',
  'Cerveza',
  'Fintech',
]) {
  assert.ok(network.includes(label), `Ecosystem core must retain Spanish node label: ${label}`);
}
assert.doesNotMatch(network, /es: 'Diseño'/, 'The former Design orbit node must not return.');
assert.match(network, /icon: Beer, href: '\/ecosystem\/process\/beer'/, 'Beer must have a dedicated process node and route.');

for (const slug of ['ai', 'commerce', 'hospitality', 'education', 'health', 'legal', 'beer', 'fintech']) {
  assert.ok(network.includes(`href: '/ecosystem/process/${slug}'`), `Node ${slug} must link to its process subpage.`);
  assert.ok(processes.includes(`slug: '${slug}'`), `Process registry must contain ${slug}.`);
}
assert.match(processes, /slug: 'beer'[\s\S]*?primaryHref: '\/inversion'/, 'Beer process must route explicitly to CTG Craft Beer Investment.');
assert.match(processPage, /generateStaticParams/, 'Ecosystem process subpages must be generated from the canonical process registry.');
assert.match(processPage, /getEcosystemProcess/, 'Dynamic process routes must fail closed through the canonical registry.');

assert.match(network, /data-core-energy="radial-emission"/, 'CTG nucleus must expose the radial energy field.');
assert.match(network, /styles\.ecosystemEnergyOutbound/, 'Energy must travel from the CTG nucleus to the outer nodes.');
assert.match(network, /styles\.ecosystemEnergyReturn/, 'Energy must recirculate from outer nodes to the CTG nucleus.');
assert.match(network, /styles\.ecosystemNodeReceive/, 'Outer nodes must visibly react to arriving energy.');
assert.match(network, /role="navigation"/, 'Interactive ecosystem graphic must expose navigation semantics.');
assert.match(network, /data-ecosystem-process-link=/, 'Each orbital node must expose a process-navigation contract.');

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
