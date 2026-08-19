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
  nextConfig,
  sitemap,
  privacyLayout,
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
  read('next.config.js'),
  read('src/app/sitemap.ts'),
  read('src/app/privacy/layout.tsx'),
]);

// A11Y-01 — audited normal-text tokens must not regress to #5A5A5A / 2.96:1.
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
assert.match(network, /useReducedMotion/, 'Ecosystem SVG animation must respect reduced motion.');
assert.match(network, /!reduceMotion\s*&&\s*<animateTransform/, 'SMIL rotation must not run when reduced motion is requested.');
assert.match(network, /!reduceMotion\s*&&\s*<animateMotion/, 'Moving SVG particles must not run when reduced motion is requested.');

// A11Y-05 / A11Y-07 — keyboard bypass belongs to the public navigation it skips.
assert.doesNotMatch(layout, /<SkipLink\s*\/>/, 'Root layout must not expose a broken skip link on routes without public navigation.');
assert.match(navbar, /<SkipLink\s*\/>/, 'Every public Navbar instance must begin with the localized skip link.');
assert.match(skipLink, /AFTER_PRIMARY_NAVIGATION_ID\s*=\s*'after-primary-navigation'/, 'Skip link must target the stable post-navigation sentinel.');
assert.match(navbar, /id=\{AFTER_PRIMARY_NAVIGATION_ID\}[\s\S]*?tabIndex=\{-1\}/, 'Navbar must render a programmatically focusable sentinel immediately after primary navigation.');
assert.match(home, /id="main-content"[\s\S]*?tabIndex=\{-1\}/, 'Home main landmark must remain programmatically focusable for direct fragment/accessibility use.');
assert.match(globals, /outline:\s*2px solid var\(--accent\)/, 'Interactive focus ring must remain 2px.');
assert.match(globals, /outline-offset:\s*2px/, 'Focus ring must retain separation from the focused control.');

// CONT-01 / CONT-03 / UX-06 — explicit bilingual high-traffic copy and descriptive links.
for (const text of [
  'Conocer CTG One',
  'Ver qué construimos',
  'Explorar el portafolio',
  'Ver CTG Recompensas',
  'Ver estrategia Web3',
  'Hablar con el equipo',
]) assert.ok(overviewData.includes(text), `Home bilingual registry must retain descriptive CTA: ${text}`);
assert.match(overview, /HOME_OVERVIEW_ITEMS/, 'Home cards must use the typed bilingual registry instead of brittle whole-sentence fallback.');
assert.doesNotMatch(overview, /See more|Ver más/, 'Home card links must remain destination-specific.');
assert.match(overview, /aria-label=\{accessibleLabel\}/, 'Home card destinations must expose descriptive accessible names.');
assert.match(navbar, /openMenuLabel[\s\S]*?Abrir menú/, 'Menu accessible text must be localized in Spanish.');
assert.match(navbar, /closeMenuLabel[\s\S]*?Cerrar menú/, 'Close-menu accessible text must be localized in Spanish.');
assert.doesNotMatch(navbar, /aria-label="(?:Open menu|Close menu|Primary navigation|Mobile navigation)"/, 'Navbar accessible labels must not be hard-coded to English.');

// UX-02 / UX-05 — focused information architecture and one clear primary CTA per decision cluster.
assert.match(navbar, /PRIMARY_NAV_ITEMS/, 'Header must consume the focused primary navigation registry.');
assert.match(navbar, /PLATFORM_NAV_ITEMS/, 'Secondary product surfaces must remain grouped under Platforms.');
assert.match(navbar, /aria-haspopup="menu"/, 'Platforms grouping must expose accessible menu semantics.');
assert.match(spotlight, /variant="primary"[\s\S]*?variant="ghost"/, 'Investment spotlight must keep one primary CTA and a subordinate ghost CTA.');
assert.doesNotMatch(spotlight, /ctgone\.com\/inversion/, 'Investment spotlight must not duplicate its primary CTA with a raw-path link.');

// UX-03 — fonts are self-managed by Next and the first paint is explicitly dark.
assert.match(layout, /from 'next\/font\/google'/, 'Typography must remain managed by next/font.');
assert.ok((layout.match(/display:\s*'swap'/g) ?? []).length >= 2, 'Both primary fonts must use display: swap.');
assert.ok((layout.match(/preload:\s*true/g) ?? []).length >= 2, 'Both primary fonts must be preloaded.');
assert.match(layout, /style=\{\{ backgroundColor: '#050505'/, 'Root document must paint the dark canvas before hydration.');
assert.doesNotMatch(layout, /fonts\.googleapis\.com|fonts\.gstatic\.com/, 'Root layout must not add a second external font delivery path.');

// UX-04 — mobile hero content precedes the diagram with real responsive sizing, not transform scaling.
assert.match(hero, /className="order-1 max-w-2xl"/, 'Mobile hero message must render before the diagram.');
assert.match(hero, /className="order-2 flex/, 'Mobile ecosystem diagram must follow the message.');
assert.doesNotMatch(hero, /scale-\[/, 'Hero must not create mobile whitespace by transform-scaling a fixed-size diagram.');
assert.match(network, /aspect-square w-full/, 'Ecosystem diagram must own a responsive intrinsic layout box.');

// A11Y-06 — footer landmark hierarchy must not jump directly from page H2 to H4.
assert.match(footer, /<h2 className="sr-only">/, 'Footer region must have an explicit H2 landmark heading.');
assert.match(footer, /<h3 className=/, 'Footer columns must sit under the footer H2 as H3 headings.');
assert.doesNotMatch(footer, /<h4/, 'Footer must not reintroduce H4 column headings.');

// CONT-02 — improve route consistency without breaking established product contracts.
assert.match(nextConfig, /source:\s*'\/privacidad'[\s\S]*?destination:\s*'\/privacy'[\s\S]*?permanent:\s*true/, 'Legacy privacy URL must redirect permanently to the canonical English route.');
assert.match(nextConfig, /source:\s*'\/investment'[\s\S]*?destination:\s*'\/inversion'/, 'English investment alias must preserve the established /inversion product namespace.');
assert.match(sitemap, /path:\s*'\/privacy'/, 'Sitemap must publish the canonical privacy route.');
assert.doesNotMatch(sitemap, /path:\s*'\/privacidad'/, 'Legacy privacy route must not remain in the public sitemap.');
assert.match(privacyLayout, /canonical:\s*'https:\/\/ctgone\.com\/privacy'/, 'Privacy route must self-canonicalize.');

console.log('Home UI/UX, i18n and accessibility invariants: PASS');
