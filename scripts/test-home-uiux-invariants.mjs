import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [
  globals,
  tailwind,
  layout,
  home,
  navbar,
  skipLink,
  switcher,
  fade,
  network,
  button,
  badge,
  hero,
  overview,
  overviewData,
  spotlight,
  footer,
  adminKnowledge,
  nextConfig,
  sitemap,
  privacyLayout,
  productShowcases,
] = await Promise.all([
  read('src/app/globals.css'),
  read('tailwind.config.ts'),
  read('src/app/layout.tsx'),
  read('src/app/page.tsx'),
  read('src/components/Navbar.tsx'),
  read('src/components/SkipLink.tsx'),
  read('src/components/LanguageSwitcher.tsx'),
  read('src/components/ui/FadeInSection.tsx'),
  read('src/components/BlockchainNetwork.tsx'),
  read('src/components/ui/Button.tsx'),
  read('src/components/ui/Badge.tsx'),
  read('src/components/sections/HeroSection.tsx'),
  read('src/components/sections/HomeOverviewSection.tsx'),
  read('src/data/home-overview.ts'),
  read('src/components/sections/InvestmentSpotlightSection.tsx'),
  read('src/components/Footer.tsx'),
  read('src/app/admin/knowledge/page.tsx'),
  read('next.config.js'),
  read('src/app/sitemap.ts'),
  read('src/app/privacy/layout.tsx'),
  read('src/components/sections/HomeProductShowcases.tsx'),
]);

// A11Y-01 — audited normal-text tokens must not regress.
assert.match(globals, /--text-dim:\s*#9a9a9a/i, 'Global dim text token must retain an AA-safe value on the dark canvas.');
assert.match(globals, /--text-muted:\s*#b0b0b0/i, 'Muted reading text must keep additional contrast margin.');
assert.match(tailwind, /'text-dim':\s*'#9a9a9a'/i, 'Tailwind text-dim must match the accessible CSS token.');
for (const [name, source] of [['globals', globals], ['tailwind', tailwind], ['badge', badge]]) {
  assert.doesNotMatch(source, /#5a5a5a|rgb\(\s*90\s*,\s*90\s*,\s*90\s*\)/i, `${name} must not reintroduce the audited low-contrast gray.`);
}

// A11Y-02 / A11Y-04 — readable labels and minimum 44px interactive targets.
assert.match(navbar, /text-sm uppercase/, 'Desktop primary navigation must render at a readable 14px scale.');
assert.match(navbar, /h-11 w-11/, 'Mobile menu trigger must keep a 44x44px target.');
assert.match(switcher, /h-11 min-w-11/, 'Language buttons must keep a 44x44px target.');
assert.match(button, /min-h-11/, 'Reusable CTA controls must keep a minimum 44px target.');
assert.doesNotMatch(overview, /text-\[9px\]|text-\[10px\]/, 'Home overview reading labels must not regress below 11px.');

// A11Y-03 + UX-01 — motion is optional; content is visible without JS/intersection callbacks.
assert.match(globals, /@media\s*\(prefers-reduced-motion:\s*reduce\)/, 'Global CSS must respect reduced motion.');
assert.match(fade, /useReducedMotion/, 'JS reveal primitive must respect the OS motion preference.');
assert.match(fade, /initial=\{false\}/, 'Reveal primitive must render visible SSR/no-JS content.');
assert.match(fade, /data-reveal/, 'Reveal primitives must remain addressable by the reduced-motion CSS safety net.');
assert.doesNotMatch(fade, /hidden:\s*\{\s*opacity:\s*0/, 'Reveal primitives must never park content at opacity zero.');
assert.doesNotMatch(network, /<animateTransform\b/, 'Ecosystem diagram must not reintroduce ornamental SMIL rotation.');
assert.doesNotMatch(network, /<animateMotion\b/, 'Ecosystem diagram must not reintroduce decorative moving particles.');

// A11Y-05 / A11Y-07 — keyboard bypass belongs to the public navigation it skips.
assert.doesNotMatch(layout, /<SkipLink\s*\/>/, 'Root layout must not expose a broken skip link on routes without public navigation.');
assert.match(navbar, /<SkipLink\s*\/>/, 'Every public Navbar instance must begin with the localized skip link.');
assert.match(skipLink, /AFTER_PRIMARY_NAVIGATION_ID\s*=\s*'after-primary-navigation'/, 'Skip link must target the stable post-navigation sentinel.');
assert.match(navbar, /id=\{AFTER_PRIMARY_NAVIGATION_ID\}[\s\S]*?tabIndex=\{-1\}/, 'Navbar must render a programmatically focusable sentinel immediately after primary navigation.');
assert.doesNotMatch(navbar, /id=\{AFTER_PRIMARY_NAVIGATION_ID\}[^>]*aria-hidden/, 'Skip destination must remain exposed to assistive technology.');
assert.match(navbar, /contentStartLabel[\s\S]*?Inicio del contenido[\s\S]*?Start of content/, 'Skip destination must announce localized content-start context.');
assert.match(home, /id="main-content"[\s\S]*?tabIndex=\{-1\}/, 'Home main landmark must remain programmatically focusable.');
assert.match(globals, /outline:\s*2px solid var\(--accent\)/, 'Interactive focus ring must remain 2px.');
assert.match(globals, /outline-offset:\s*2px/, 'Focus ring must retain separation from the focused control.');

// Nested Admin OS pages must not reintroduce public navigation inside AdminLayout.
assert.doesNotMatch(adminKnowledge, /<Navbar\s*\/>|<Footer\s*\/>/, 'Admin Knowledge must rely on AdminLayout navigation instead of nesting the public shell.');
assert.doesNotMatch(adminKnowledge, /<main\b/, 'Admin Knowledge must not nest a second main landmark inside AdminLayout.');
assert.match(adminKnowledge, /<section aria-labelledby="knowledge-admin-title"/, 'Admin Knowledge content must expose a labeled native section inside the admin main landmark.');

// CONT-01 / CONT-03 — explicit bilingual high-traffic copy and descriptive links.
for (const text of [
  'Explorar nuestros negocios',
  'Conocer nuestra tecnología',
  'Conocer CTG One',
  'Contactar a CTG One',
]) assert.ok(overviewData.includes(text), `Home bilingual registry must retain descriptive CTA: ${text}`);
assert.match(overview, /HOME_OVERVIEW_ITEMS/, 'Home cards must use the typed bilingual registry.');
assert.doesNotMatch(overview, /See more|Ver más/, 'Home card links must remain destination-specific.');
assert.match(overview, /aria-label=\{/, 'Home card destinations must expose descriptive accessible names.');
assert.match(navbar, /openMenuLabel[\s\S]*?Abrir menú/, 'Menu accessible text must be localized in Spanish.');
assert.match(navbar, /closeMenuLabel[\s\S]*?Cerrar menú/, 'Close-menu accessible text must be localized in Spanish.');
assert.doesNotMatch(navbar, /aria-label="(?:Open menu|Close menu|Primary navigation|Mobile navigation)"/, 'Navbar accessible labels must not be hard-coded to English.');

// UX-02 / UX-05 — product-first information architecture and clear choices.
assert.match(navbar, /PRIMARY_NAV_ITEMS/, 'Header must consume the focused primary navigation registry.');
assert.match(navbar, /PLATFORM_NAV_ITEMS/, 'Secondary surfaces must remain grouped under the Explore menu.');
assert.match(navbar, /aria-haspopup="menu"/, 'Explore grouping must expose accessible menu semantics.');
assert.match(productShowcases, /href="\/craft-beer"/, 'Craft Beer must have a direct public product path.');
assert.match(productShowcases, /href="\/inversion"/, 'Investment must remain a distinct path from beer purchasing.');
assert.match(productShowcases, /href="\/nvetcareapp"/, 'Nvet Care must have a direct public product path.');
assert.match(productShowcases, /Nvet Care · En desarrollo/, 'Nvet Care must communicate its development status in plain language.');
assert.match(spotlight, /variant="primary"[\s\S]*?variant="ghost"/, 'Investment spotlight must keep one primary CTA and a subordinate ghost CTA on its own surface.');
assert.doesNotMatch(spotlight, /ctgone\.com\/inversion/, 'Investment spotlight must not duplicate its primary CTA with a raw-path link.');

// UX-03 — fonts are self-managed by Next and the first paint is explicitly dark.
assert.match(layout, /from 'next\/font\/google'/, 'Typography must remain managed by next/font.');
assert.ok((layout.match(/display:\s*'swap'/g) ?? []).length >= 2, 'Both primary fonts must use display: swap.');
assert.ok((layout.match(/preload:\s*true/g) ?? []).length >= 2, 'Both primary fonts must be preloaded.');
assert.match(layout, /style=\{\{ backgroundColor: '#050505'/, 'Root document must paint the dark canvas before hydration.');
assert.doesNotMatch(layout, /fonts\.googleapis\.com|fonts\.gstatic\.com/, 'Root layout must not add a second external font delivery path.');

// UX-04 — mobile hero is content-first; the interactive ecosystem architecture is the primary visual.
assert.match(hero, /href="\/products"/, 'Hero must lead consumers to public products.');
assert.match(hero, /href="\/ecosystem"/, 'Hero must retain a direct path to real businesses.');
assert.match(hero, /<BlockchainNetwork size="lg" interactive\s*\/>/, 'Hero must expose the interactive CTG ecosystem network as its primary visual.');
assert.match(hero, /Arquitectura del ecosistema/, 'Hero must explain the ecosystem architecture in Spanish.');
assert.doesNotMatch(hero, /href="\/craft-beer"/, 'Hero must not duplicate the Craft Beer product card already present in the product showcase.');
assert.doesNotMatch(hero, /href="\/nvetcareapp"/, 'Hero must not duplicate the Nvet Care product card already present in the product showcase.');
assert.doesNotMatch(hero, /scale-\[/, 'Hero must not create mobile whitespace by transform-scaling a fixed-size composition.');
assert.match(network, /aspect-square w-full/, 'Ecosystem diagram must retain its responsive intrinsic layout in the hero and dedicated surfaces.');

// A11Y-06 — footer landmark hierarchy.
assert.match(footer, /<h2 className="sr-only">/, 'Footer region must have an explicit H2 landmark heading.');
assert.match(footer, /<h3 className=/, 'Footer columns must sit under the footer H2 as H3 headings.');
assert.doesNotMatch(footer, /<h4/, 'Footer must not reintroduce H4 column headings.');
assert.match(footer, /href: '\/nvetcareapp'/, 'Footer must expose Nvet Care publicly.');
assert.match(footer, /href: '\/craft-beer'/, 'Footer must expose CTG Craft Beer publicly.');

// CONT-02 — improve route consistency without breaking established product contracts.
assert.match(nextConfig, /source:\s*'\/privacidad'[\s\S]*?destination:\s*'\/privacy'[\s\S]*?permanent:\s*true/, 'Legacy privacy URL must redirect permanently to the canonical English route.');
assert.match(nextConfig, /source:\s*'\/investment'[\s\S]*?destination:\s*'\/inversion'/, 'English investment alias must preserve the established /inversion product namespace.');
assert.match(sitemap, /path:\s*'\/privacy'/, 'Sitemap must publish the canonical privacy route.');
assert.match(sitemap, /path:\s*'\/craft-beer'/, 'Sitemap must publish the Craft Beer hub.');
assert.match(sitemap, /path:\s*'\/nvetcareapp'/, 'Sitemap must publish Nvet Care.');
assert.doesNotMatch(sitemap, /path:\s*'\/privacidad'/, 'Legacy privacy route must not remain in the public sitemap.');
assert.match(privacyLayout, /canonical:\s*'https:\/\/ctgone\.com\/privacy'/, 'Privacy route must self-canonicalize.');

console.log('Home UI/UX, i18n and accessibility invariants: PASS');
