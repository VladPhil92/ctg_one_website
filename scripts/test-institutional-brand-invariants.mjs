import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const countOccurrences = (source, pattern) => (source.match(pattern) ?? []).length;

const [brandLogo, navbar, publicShell, jpShell, jpPage, jpAssetRoute] = await Promise.all([
  read('src/components/BrandLogo.tsx'),
  read('src/components/Navbar.tsx'),
  read('src/components/PublicPageShell.tsx'),
  read('src/components/jpvalderrama/JPValderramaShell.tsx'),
  read('src/app/jpvalderrama/page.tsx'),
  read('src/app/api/jpvalderrama/assets/[asset]/route.ts'),
]);

// CTG One Technology is the parent brand on every surface. The gold nucleus
// is immutable; only surrounding typography contrast may adapt to the surface.
assert.match(brandLogo, /export type BrandLogoTone = 'dark' \| 'light';/);
assert.match(brandLogo, /src="\/images\/logo\/ctg-one-coin-icon\.png"/);
assert.match(brandLogo, /data-brand-lockup="ctg-one-technology"/);
assert.match(brandLogo, /data-brand-tone=\{tone\}/);
assert.match(brandLogo, />CTG <\/span>/);
assert.match(brandLogo, />One<\/span>/);
assert.match(brandLogo, />\s*Technology\s*<\/span>/);
assert.match(brandLogo, /tone === 'light' \? 'text-\[#17110e\]'/);
assert.match(brandLogo, /text-\[#e8bf58\]/);

assert.equal(
  countOccurrences(brandLogo, /interface BrandLogoProps\s*\{/g),
  1,
  'BrandLogo must expose exactly one props contract',
);
assert.equal(
  countOccurrences(brandLogo, /export function BrandLogo\s*\(/g),
  1,
  'BrandLogo must have exactly one exported implementation',
);

assert.match(publicShell, /<Navbar \/>/);
assert.match(navbar, /<BrandLogo priority/);
assert.match(jpShell, /import \{ BrandLogo \} from '@\/components\/BrandLogo';/);
assert.match(jpShell, /<BrandLogo priority tone="light"/);
assert.doesNotMatch(jpShell, />JPV<\/span>/);
assert.match(jpPage, /import \{ BrandLogo \} from '@\/components\/BrandLogo';/);
assert.match(jpPage, /<BrandLogo priority tone="light"/);
assert.doesNotMatch(jpPage, /src="\/images\/logo\/ctg-one-logo\.png"/);

assert.equal(
  countOccurrences(jpPage, /<header\b/g),
  1,
  'JP Valderrama must render exactly one page header',
);
assert.equal(
  countOccurrences(jpPage, /<BrandLogo\b/g),
  1,
  'JP Valderrama header must render exactly one canonical BrandLogo',
);
assert.equal(
  countOccurrences(jpPage, /min-h-\[76px\][^\n]*max-w-\[(?:1440|1500)px\][^\n]*items-center[^\n]*justify-between/g),
  1,
  'JP Valderrama must keep a single canonical header layout row',
);

// Public-file visuals must have physical deployment backing.
const publicVisualFiles = ['books.webp', 'projects.webp', 'talks.webp', 'brand.webp'];
for (const file of publicVisualFiles) {
  await access(new URL(`../public/jpvalderrama/${file}`, import.meta.url));
  assert.ok(jpAssetRoute.includes(`'${file}'`), `JP visual route must reference committed asset ${file}`);
}

// Large/original visuals use repository-owned source modules so a binary/public
// folder mismatch cannot silently deploy blank cards or 404 image surfaces.
const inlineVisualModules = [
  'conference-00.ts',
  'conference-01.ts',
  'conference-02.ts',
  'ideas-00.ts',
  'ideas-01.ts',
  'ideas-02.ts',
  'ideas-03.ts',
  'ideas-04.ts',
  'philosophy-technology-00.ts',
  'philosophy-technology-01.ts',
  'philosophy-technology-02.ts',
  'philosophy-technology-03.ts',
  'thought-map-00.ts',
  'thought-map-01.ts',
  'thought-map-02.ts',
];
for (const module of inlineVisualModules) {
  await access(new URL(`../src/data/jpvalderrama-visuals/${module}`, import.meta.url));
  const importStem = module.replace(/\.ts$/, '');
  assert.ok(
    jpAssetRoute.includes(`@/data/jpvalderrama-visuals/${importStem}`),
    `JP asset route must import repository-backed visual module ${module}`,
  );
}

for (const semanticAsset of [
  'thought-map',
  'philosophy-money',
  'conference-hero',
  'philosophy-technology',
  'conference-poster',
  'ideas-button',
  'books-desk',
  'waveform',
  'jp-icon',
  'projects-button',
]) {
  assert.ok(jpAssetRoute.includes(`'${semanticAsset}'`), `JP semantic asset ${semanticAsset} must be routed.`);
}

assert.match(jpAssetRoute, /Buffer\.from\(INLINE_ASSETS\[asset\], 'base64'\)/, 'Inline JP visuals must decode from committed source modules.');
assert.match(jpAssetRoute, /assertWebp\(bytes\)/, 'JP visual delivery must reject corrupt payloads.');
assert.doesNotMatch(jpAssetRoute, /assets['"],\s*['"]jpvalderrama-hd|\.b64/, 'JP visual route must not depend on legacy uncommitted base64 chunk paths.');
assert.match(jpAssetRoute, /if-none-match/i, 'JP visual assets must support ETag revalidation.');
assert.match(jpAssetRoute, /must-revalidate/, 'JP visual assets must use a revalidating cache policy.');
assert.doesNotMatch(jpAssetRoute, /immutable|max-age=31536000/, 'Mutable semantic JP visual URLs must never be cached as immutable for one year.');

console.log('Institutional CTG One Technology brand-lock invariants: PASS');
