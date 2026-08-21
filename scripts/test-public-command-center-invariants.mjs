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
  assert.doesNotMatch(source, /<main className="min-h-screen bg-bg-primary">/);
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
  commandStyles,
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
  read('src/styles/CommandCenter.module.css'),
]);

assert.match(shell, /commandStyles\.theme/);
assert.match(shell, /data-public-command-center="true"/);
assert.match(shell, /publicAtmosphere/);
assert.match(publicStyles, /#030507/);
assert.match(publicStyles, /#d6ae56/);
assert.match(publicStyles, /#248cff|rgba\(36,\s*140,\s*255,/i);
assert.match(publicStyles, /prefers-reduced-motion/);
assert.doesNotMatch(publicStyles, /publicAtmosphere::after/);

const ornamentalSystemCopy = /CTG-CORE|NETWORK CORE|CORE ONLINE|SYNC\s*100|NODE\s*08|LINK STABLE|NET\s*08|LAT\s*10|LON\s*75/i;
assert.doesNotMatch(hero, ornamentalSystemCopy);
assert.doesNotMatch(network, ornamentalSystemCopy);
assert.doesNotMatch(network, />CARTAGENA</i);
assert.doesNotMatch(homeOverview, /MODULE-\d+/i);
assert.doesNotMatch(investmentSpotlight, /SIG-\d+|LIVE PRODUCT\s*\/\s*CASE-\d+|PHYSICAL PRODUCTION LAYER/i);
assert.doesNotMatch(accountCta, /AUTH-\d+/i);

// Home spotlight must render the 320x480 repository source at native fidelity:
// no optimizer recompression, no oversized responsive candidate, no caption overlay.
assert.match(investmentSpotlight, /\bunoptimized\b/);
assert.match(investmentSpotlight, /sizes="320px"/);
assert.match(investmentSpotlight, /data-ctg-photo="high-fidelity-source"/);
assert.match(investmentSpotlight, /data-ctg-source-size="320x480"/);
assert.match(investmentSpotlight, /data-ctg-photo-caption="outside-image"/);
assert.doesNotMatch(investmentSpotlight, /quality=\{90\}/);
assert.doesNotMatch(publicStyles, /translateZ\(0\)/);
assert.match(publicStyles, /\.mediaImage\s*\{[\s\S]*?object-fit:\s*contain;/);
assert.match(publicStyles, /\.mediaSpotlight\s*\{[\s\S]*?max-width:\s*320px\s*!important;/);
assert.match(publicStyles, /\.mediaSpotlightViewport\s*\{[\s\S]*?aspect-ratio:\s*2\s*\/\s*3;/);
assert.match(publicStyles, /\.mediaSpotlightCaption\s*\{[\s\S]*?position:\s*relative;/);

assert.match(investmentLayout, /commandStyles\.theme/);
assert.match(investmentLayout, /publicStyles\.investmentShell/);
assert.match(investmentLayout, /data-public-command-center="investment"/);
assert.doesNotMatch(publicStyles, /\.investmentShell\s*>\s*\*\s*\{/);
assert.match(publicStyles, /\.investmentShell\s*>\s*nav\s*\{[\s\S]*?position:\s*sticky;[\s\S]*?z-index:\s*50;/);
assert.match(investmentPage, /publicStyles\.mediaFrame/);
assert.match(investmentPage, /quality=\{90\}/);
assert.match(investmentPage, /data-ctg-photo="high-fidelity-source"/);
assert.match(nextConfig, /formats: \['image\/avif', 'image\/webp'\]/);
assert.match(nextConfig, /qualities: \[75, 90\]/);
assert.match(nextConfig, /deviceSizes: \[360, 430, 640, 768, 1024, 1280, 1536, 1920\]/);
assert.match(nextConfig, /minimumCacheTTL: 2592000/);
assert.match(publicStyles, /\.mediaHero\s*\{[\s\S]*?max-width:\s*320px\s*!important;/);

// The gold CTG nucleus must emit visible radial energy rather than only pulse in place.
assert.match(network, /data-core-energy="radial-emission"/);
assert.match(network, /const ENERGY_RAYS = 12/);
assert.match(network, /styles\.coreEnergyRing/);
assert.match(network, /styles\.coreEnergyRay/);
assert.match(network, /styles\.coreEnergySpark/);
assert.match(commandStyles, /\.coreEnergyRing\s*\{[\s\S]*?animation:\s*coreEnergyRingBurst/);
assert.match(commandStyles, /\.coreEnergyRay\s*\{[\s\S]*?animation:\s*coreEnergyRayBurst/);
assert.match(commandStyles, /\.coreEnergySpark\s*\{[\s\S]*?animation:\s*coreEnergySparkPulse/);
assert.match(commandStyles, /@keyframes coreEnergyRingBurst/);
assert.match(commandStyles, /@keyframes coreEnergyRayBurst/);
assert.match(commandStyles, /@keyframes coreEnergySparkPulse/);
assert.match(commandStyles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.coreEnergyRing,[\s\S]*?\.coreEnergyRay,[\s\S]*?\.coreEnergySpark/);
assert.match(commandStyles, /\.ecosystemOrbitOuter\s*\{[\s\S]*?animation:\s*ecosystemOrbit/);
assert.match(commandStyles, /\.ecosystemConnection\s*\{[\s\S]*?animation:\s*ecosystemFlow/);
assert.match(commandStyles, /\.ecosystemNode\s*\{[\s\S]*?animation:\s*ecosystemNodeFloat/);
assert.match(commandStyles, /@keyframes ecosystemOrbit/);
assert.match(commandStyles, /@keyframes ecosystemFlow/);

const restoredImages = [
  'public/images/inversion/ctg-craft-beer-miyagi.webp',
  'public/images/inversion/ctg-craft-beer-golden-pale-ale.webp',
  'public/images/inversion/ctg-craft-beer-hefeweizen.webp',
  'public/images/inversion/ctg-craft-beer-porter.webp',
  'public/images/inversion/ctg-craft-beer-irish-red-ale.webp',
];

for (const path of restoredImages) {
  const metadata = await stat(new URL(`../${path}`, import.meta.url));
  assert.ok(metadata.size >= 10_000, `${path} is invalid or unexpectedly truncated (${metadata.size} bytes).`);
  assert.ok(metadata.size <= 180_000, `${path} is too heavy (${metadata.size} bytes).`);
  const bytes = await readBinary(path);
  assert.equal(bytes.subarray(0, 4).toString('ascii'), 'RIFF');
  assert.equal(bytes.subarray(8, 12).toString('ascii'), 'WEBP');
}

const hefeweizen = await readBinary('public/images/inversion/ctg-craft-beer-hefeweizen.webp');
assert.equal(hefeweizen.subarray(12, 16).toString('ascii'), 'VP8 ', 'Hefeweizen source must remain the reviewed lossy WebP asset.');
assert.deepEqual([...hefeweizen.subarray(23, 26)], [0x9d, 0x01, 0x2a], 'Hefeweizen VP8 frame signature must remain valid.');
assert.equal(hefeweizen.readUInt16LE(26) & 0x3fff, 320, 'Hefeweizen native width is part of the no-upscale rendering contract.');
assert.equal(hefeweizen.readUInt16LE(28) & 0x3fff, 480, 'Hefeweizen native height is part of the no-upscale rendering contract.');

console.log('Public command-center design, motion and image-safety invariants: PASS');
