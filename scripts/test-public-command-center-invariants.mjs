import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const readBinary = (path) => readFile(new URL(`../${path}`, import.meta.url));
const publicRoutes = ['src/app/about/page.tsx','src/app/services/page.tsx','src/app/products/page.tsx','src/app/ecosystem/page.tsx','src/app/ai/page.tsx','src/app/rewards/page.tsx','src/app/token/page.tsx','src/app/contact/page.tsx'];
for (const route of publicRoutes) { const source = await read(route); assert.match(source, /PublicPageShell/, `${route} must use the shared public command-center shell.`); assert.doesNotMatch(source, /<main className="min-h-screen bg-bg-primary">/); }
const [shell,publicStyles,investmentLayout,investmentPage,nextConfig,hero,network,homeOverview,investmentSpotlight,accountCta] = await Promise.all([read('src/components/PublicPageShell.tsx'),read('src/styles/PublicCommandCenter.module.css'),read('src/app/inversion/layout.tsx'),read('src/app/inversion/page.tsx'),read('next.config.js'),read('src/components/sections/HeroSection.tsx'),read('src/components/BlockchainNetwork.tsx'),read('src/components/sections/HomeOverviewSection.tsx'),read('src/components/sections/InvestmentSpotlightSection.tsx'),read('src/components/sections/AccountCtaSection.tsx')]);
assert.match(shell,/commandStyles\.theme/); assert.match(shell,/data-public-command-center="true"/); assert.match(shell,/publicAtmosphere/); assert.match(publicStyles,/#030507/); assert.match(publicStyles,/#d6ae56/); assert.match(publicStyles,/#248cff|rgba\(36,\s*140,\s*255,/i); assert.match(publicStyles,/prefers-reduced-motion/); assert.doesNotMatch(publicStyles,/publicAtmosphere::after/);
const ornamentalSystemCopy=/CTG-CORE|NETWORK CORE|CORE ONLINE|SYNC\s*100|NODE\s*08|LINK STABLE|NET\s*08|LAT\s*10|LON\s*75/i; assert.doesNotMatch(hero,ornamentalSystemCopy); assert.doesNotMatch(network,ornamentalSystemCopy); assert.doesNotMatch(network,/>CARTAGENA</i); assert.doesNotMatch(homeOverview,/MODULE-\d+/i); assert.doesNotMatch(investmentSpotlight,/SIG-\d+|LIVE PRODUCT\s*\/\s*CASE-\d+|PHYSICAL PRODUCTION LAYER/i); assert.doesNotMatch(accountCta,/AUTH-\d+/i);
assert.match(investmentSpotlight,/quality=\{90\}/); assert.match(investmentSpotlight,/data-ctg-photo="high-fidelity-source"/); assert.match(investmentLayout,/commandStyles\.theme/); assert.match(investmentLayout,/publicStyles\.investmentShell/); assert.match(investmentLayout,/data-public-command-center="investment"/); assert.doesNotMatch(publicStyles,/\.investmentShell\s*>\s*\*\s*\{/); assert.match(publicStyles,/\.investmentShell\s*>\s*nav\s*\{[\s\S]*?position:\s*sticky;[\s\S]*?z-index:\s*50;/); assert.match(investmentPage,/publicStyles\.mediaFrame/); assert.match(investmentPage,/quality=\{90\}/); assert.match(investmentPage,/data-ctg-photo="high-fidelity-source"/); assert.match(nextConfig,/formats: \['image\/avif', 'image\/webp'\]/); assert.match(nextConfig,/qualities: \[75, 90\]/); assert.match(nextConfig,/deviceSizes: \[360, 430, 640, 768, 1024, 1280, 1536, 1920\]/); assert.match(nextConfig,/minimumCacheTTL: 2592000/);

function readWebPDimensions(bytes) {
  assert.equal(bytes.subarray(0,4).toString('ascii'),'RIFF');
  assert.equal(bytes.subarray(8,12).toString('ascii'),'WEBP');
  const chunk = bytes.subarray(12,16).toString('ascii');
  if (chunk === 'VP8X') {
    return {
      width: 1 + bytes.readUIntLE(24, 3),
      height: 1 + bytes.readUIntLE(27, 3),
    };
  }
  if (chunk === 'VP8 ') {
    const frame = bytes.indexOf(Buffer.from([0x9d, 0x01, 0x2a]), 20);
    assert.ok(frame >= 0, 'VP8 frame header must exist.');
    return {
      width: bytes.readUInt16LE(frame + 3) & 0x3fff,
      height: bytes.readUInt16LE(frame + 5) & 0x3fff,
    };
  }
  if (chunk === 'VP8L') {
    const bits = bytes.readUInt32LE(21);
    return {
      width: 1 + (bits & 0x3fff),
      height: 1 + ((bits >> 14) & 0x3fff),
    };
  }
  throw new Error(`Unsupported WebP chunk ${chunk}`);
}

const restoredImages=['public/images/inversion/ctg-craft-beer-miyagi.webp','public/images/inversion/ctg-craft-beer-golden-pale-ale.webp','public/images/inversion/ctg-craft-beer-hefeweizen.webp','public/images/inversion/ctg-craft-beer-porter.webp','public/images/inversion/ctg-craft-beer-irish-red-ale.webp'];
for (const path of restoredImages) {
  const metadata=await stat(new URL(`../${path}`,import.meta.url));
  assert.ok(metadata.size>=70_000,`${path} is unexpectedly small for the approved HD source (${metadata.size} bytes).`);
  assert.ok(metadata.size<=180_000,`${path} is too heavy (${metadata.size} bytes).`);
  const bytes=await readBinary(path);
  const { width, height } = readWebPDimensions(bytes);
  assert.ok(width>=900,`${path} must retain at least 900px source width (found ${width}px).`);
  assert.ok(height>=1200,`${path} must retain at least 1200px source height (found ${height}px).`);
}
console.log('Public command-center design and image-quality invariants: PASS');
