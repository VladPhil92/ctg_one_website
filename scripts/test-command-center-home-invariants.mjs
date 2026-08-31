import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [network, navbar, hero, footer, brandLogo, languageContext, translations, processes, processPage, productShowcases] = await Promise.all([
  read('src/components/BlockchainNetwork.tsx'),
  read('src/components/Navbar.tsx'),
  read('src/components/sections/HeroSection.tsx'),
  read('src/components/Footer.tsx'),
  read('src/components/BrandLogo.tsx'),
  read('src/contexts/LanguageContext.tsx'),
  read('src/i18n/commandCenterTranslations.ts'),
  read('src/data/ecosystem-processes.ts'),
  read('src/app/ecosystem/process/[slug]/page.tsx'),
  read('src/components/sections/HomeProductShowcases.tsx'),
]);

const nodeIds = [...network.matchAll(/\{ id: '([^']+)', en:/g)].map((match) => match[1]);
assert.deepEqual(
  nodeIds,
  ['ai', 'commerce', 'hospitality', 'education', 'health', 'legal', 'beer', 'fintech'],
  'Ecosystem core must retain exactly the eight approved process nodes in canonical orbital order.',
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
assert.match(processes, /slug: 'beer'[\s\S]*?primaryHref: '\/inversion'/, 'Beer process must retain its established investment destination.');
assert.match(processPage, /generateStaticParams/, 'Ecosystem process subpages must be generated from the canonical process registry.');
assert.match(processPage, /getEcosystemProcess/, 'Dynamic process routes must fail closed through the canonical registry.');

assert.match(network, /data-core-energy="radial-emission"/, 'CTG nucleus must expose the radial energy field on dedicated ecosystem surfaces.');
assert.match(network, /styles\.ecosystemEnergyOutbound/, 'Energy must travel from the CTG nucleus to the outer nodes.');
assert.match(network, /styles\.ecosystemEnergyReturn/, 'Energy must recirculate from outer nodes to the CTG nucleus.');
assert.match(network, /styles\.ecosystemNodeReceive/, 'Outer nodes must visibly react to arriving energy.');
assert.ok(/<nav\b/.test(network) || /role="navigation"/.test(network), 'Interactive ecosystem graphic must expose navigation semantics.');
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

// Consumer proposition leads; the ecosystem network is the primary visual and canonical proof remains attached.
for (const capability of ['identity-auth', 'data-security', 'ai-layer']) {
  assert.ok(hero.includes(`getCapabilityProof('${capability}')`), `Hero must keep canonical proof status attached for ${capability}.`);
}
assert.match(hero, /getPublicProofStatus/, 'Hero must derive maturity values from the canonical proof registry.');
assert.match(hero, /Container size="large"/, 'Homepage hero must use the wide command-center container.');
assert.match(hero, /Portal multiservicios · Una sola cuenta/, 'Hero must identify CTG One as a multi-service portal with one account.');
assert.match(hero, /Todo CTG One,/, 'Hero must lead with the unified CTG One consumer proposition.');
assert.match(hero, /Productos, servicios, pagos y beneficios conectados para ti\./, 'Hero must state the consumer value categories explicitly.');
assert.match(hero, /href="\/registro"/, 'Hero primary action must route new users to account registration.');
assert.match(hero, /<BlockchainNetwork size="lg" interactive\s*\/>/, 'Hero must render the interactive ecosystem network in its primary visual column.');
assert.match(hero, /CTG ONE CORE/, 'Hero network must identify the central CTG One core.');
assert.doesNotMatch(hero, /href="\/craft-beer"/, 'Craft Beer product media belongs to the dedicated product showcase, not the ecosystem hero visual.');
assert.doesNotMatch(hero, /href="\/nvetcareapp"/, 'Nvet Care product media belongs to the dedicated product showcase, not the ecosystem hero visual.');
assert.doesNotMatch(hero, /Cuentas seguras|Actualización y despliegue|IA aplicada/, 'Technical capability labels must not dominate the consumer hero.');

assert.match(productShowcases, /href="\/craft-beer"/, 'Craft Beer must remain directly accessible from the dedicated product showcase.');
assert.match(productShowcases, /Cerveza artesanal\. Producción real\./, 'Craft Beer showcase must lead with the physical product and production reality.');
assert.match(productShowcases, /href="\/inversion"/, 'Craft Beer showcase must keep investment as a separate user journey.');
assert.match(productShowcases, /href="\/nvetcareapp"/, 'Nvet Care must remain directly accessible from the dedicated product showcase.');
assert.match(productShowcases, /Nvet Care · En desarrollo/, 'Nvet Care showcase must state its real development status.');

for (const phrase of ['Core online', 'LIVE PRODUCT / CASE-001', 'Physical production layer']) {
  assert.ok(translations.includes(phrase), `Command-center microcopy must remain registered for legacy/deeper surfaces: ${phrase}`);
}

console.log('Homepage command-center and ecosystem-first design invariants: PASS');
