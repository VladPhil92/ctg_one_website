import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const readBinary = (path) => readFile(new URL(`../${path}`, import.meta.url));

const publicRoutes = [
  'src/app/about/page.tsx',
  'src/app/services/page.tsx',
  'src/app/products/page.tsx',
  'src/app/ecosystem/page.tsx',
  'src/app/ai/page.tsx',
  'src/app/rewards/page.tsx',
  'src/app/token/page.tsx',
  'src/app/contact/page.tsx',
];

for (const route of publicRoutes) {
  const source = await read(route);
  assert.match(source, /PublicPageShell/, `${route} must use the shared public command-center shell.`);
  assert.doesNotMatch(source, /<main className="min-h-screen bg-bg-primary">/, `${route} must not regress to the legacy isolated public shell.`);
}

const [
  shell,
  publicStyles,
  investmentLayout,
  investmentPage,
  nextConfig,
  hero,
  network,
  homeOverview,
  investmentSpotlight,
  accountCta,
] = await Promise.all([
  read('src/components/PublicPageShell.tsx'),
  read('src/styles/PublicCommandCenter.module.css'),
  read('src/app/inversion/layout.tsx'),
  read('src/app/inversion/page.tsx'),
  read('next.config.js'),
  read('src/components/sections/HeroSection.tsx'),
  read('src/components/BlockchainNetwork.tsx'),
  read('src/components/sections/HomeOverviewSection.tsx'),
  read('src/components/sections/InvestmentSpotlightSection.tsx'),
  read('src/components/sections/AccountCtaSection.tsx'),
]);

assert.match(shell, /commandStyles\.theme/, 'Public shell must inherit the Home command-center design tokens.');
assert.match(shell, /data-public-command-center="true"/, 'Public shell must expose a browser-testable command-center marker.');
assert.match(shell, /publicAtmosphere/, 'Public shell must retain the shared atmospheric layer.');
assert.match(publicStyles, /#030507/, 'Public shell must retain the command-center primary background.');
assert.match(publicStyles, /#d6ae56/, 'Public shell must retain the approved gold accent.');
assert.match(
  publicStyles,
  /#248cff|rgba\(36,\s*140,\s*255,/i,
  'Public shell must retain the restrained blue technology accent.',
);
assert.match(publicStyles, /prefers-reduced-motion/, 'Public design must preserve reduced-motion behavior.');
assert.doesNotMatch(publicStyles, /publicAtmosphere::after/, 'Public shell must not add decorative star/noise fields that compete with content.');

const ornamentalSystemCopy = /CTG-CORE|NETWORK CORE|CORE ONLINE|SYNC\s*100|NODE\s*08|LINK STABLE|NET\s*08|LAT\s*10|LON\s*75/i;
assert.doesNotMatch(hero, ornamentalSystemCopy, 'Hero must not render ornamental pseudo-system nomenclature.');
assert.doesNotMatch(network, ornamentalSystemCopy, 'Ecosystem graphic must not render ornamental pseudo-system nomenclature.');
assert.doesNotMatch(network, />CARTAGENA</i, 'Ecosystem graphic must not use an unexplained location label.');

assert.doesNotMatch(homeOverview, /MODULE-\d+/i, 'Home overview cards must not use ornamental module codes.');
assert.doesNotMatch(investmentSpotlight, /SIG-\d+|LIVE PRODUCT\s*\/\s*CASE-\d+|PHYSICAL PRODUCTION LAYER/i, 'Investment spotlight must not use ornamental telemetry or case codes.');
assert.doesNotMatch(accountCta, /AUTH-\d+/i, 'Account CTA must not use ornamental authentication codes.');
assert.match(investmentSpotlight, /quality=\{90\}/, 'Prominent Home photography must request the high-fidelity quality tier.');
assert.match(investmentSpotlight, /data-ctg-photo="high-fidelity-source"/, 'Prominent Home photography must use the shared high-fidelity image treatment.');

assert.match(investmentLayout, /commandStyles\.theme/, 'Investment must inherit command-center tokens without changing its route-scoped domain shell.');
assert.match(investmentLayout, /publicStyles\.investmentShell/, 'Investment must use the command-center investment surface.');
assert.match(investmentLayout, /data-public-command-center="investment"/, 'Investment must expose the browser-testable command-center marker.');
assert.doesNotMatch(publicStyles, /\.investmentShell\s*>\s*\*\s*\{/, 'Investment shell must never override the positioning of every direct child.');
assert.match(
  publicStyles,
  /\.investmentShell\s*>\s*nav\s*\{[\s\S]*?position:\s*sticky;[\s\S]*?z-index:\s*50;/,
  'Investment navigation must explicitly preserve sticky positioning above the shell atmosphere.',
);
assert.match(investmentPage, /publicStyles\.mediaFrame/, 'Investment photography must use the high-fidelity media frame.');
assert.match(investmentPage, /quality=\{90\}/, 'Prominent user-supplied photography must request a high-detail responsive derivative.');
assert.match(investmentPage, /data-ctg-photo="high-fidelity-source"/, 'High-fidelity source photography must be explicitly identified.');

assert.match(nextConfig, /formats: \['image\/avif', 'image\/webp'\]/, 'Next Image must negotiate AVIF/WebP.');
assert.match(nextConfig, /qualities: \[75, 90\]/, 'Next Image must allow the approved high-fidelity quality tier.');
assert.match(nextConfig, /deviceSizes: \[360, 430, 640, 768, 1024, 1280, 1536, 1920\]/, 'Next Image must emit responsive viewport derivatives.');
assert.match(nextConfig, /minimumCacheTTL: 2592000/, 'Image derivatives must use a durable cache TTL.');

const restoredImages = [
  'public/images/inversion/ctg-craft-beer-miyagi.webp',
  'public/images/inversion/ctg-craft-beer-golden-pale-ale.webp',
  'public/images/inversion/ctg-craft-beer-hefeweizen.webp',
  'public/images/inversion/ctg-craft-beer-porter.webp',
  'public/images/inversion/ctg-craft-beer-irish-red-ale.webp',
];

for (const path of restoredImages) {
  const metadata = await stat(new URL(`../${path}`, import.meta.url));
  assert.ok(metadata.size >= 45_000, `${path} is suspiciously over-compressed (${metadata.size} bytes).`);
  assert.ok(metadata.size <= 180_000, `${path} is too heavy for the intended responsive source budget (${metadata.size} bytes).`);

  const bytes = await readBinary(path);
  assert.equal(bytes.subarray(0, 4).toString('ascii'), 'RIFF', `${path} must be a valid RIFF WebP asset.`);
  assert.equal(bytes.subarray(8, 12).toString('ascii'), 'WEBP', `${path} must be a valid WebP asset.`);
}

console.log('Public command-center design and image-quality invariants: PASS');
