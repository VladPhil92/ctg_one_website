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

assert.match(brandLogo, /export type BrandLogoTone = 'dark' \| 'light';/);
assert.match(brandLogo, /src="\/images\/logo\/ctg-one-coin-icon\.png"/);
assert.match(brandLogo, /data-brand-lockup="ctg-one-technology"/);
assert.match(brandLogo, /data-brand-tone=\{tone\}/);
assert.match(brandLogo, />CTG <\/span>/);
assert.match(brandLogo, />One<\/span>/);
assert.match(brandLogo, />\s*Technology\s*<\/span>/);
assert.match(brandLogo, /tone === 'light' \? 'text-\[#17110e\]'/);
assert.match(brandLogo, /text-\[#e8bf58\]/);
assert.equal(countOccurrences(brandLogo, /interface BrandLogoProps\s*\{/g), 1);
assert.equal(countOccurrences(brandLogo, /export function BrandLogo\s*\(/g), 1);

assert.match(publicShell, /<Navbar \/>/);
assert.match(navbar, /<BrandLogo priority/);
assert.match(jpShell, /import \{ BrandLogo \} from '@\/components\/BrandLogo';/);
assert.match(jpShell, /<BrandLogo priority tone="light"/);
assert.doesNotMatch(jpShell, />JPV<\/span>/);
assert.match(jpPage, /import \{ BrandLogo \} from '@\/components\/BrandLogo';/);
assert.match(jpPage, /<BrandLogo priority tone="light"/);
assert.doesNotMatch(jpPage, /src="\/images\/logo\/ctg-one-logo\.png"/);
assert.equal(countOccurrences(jpPage, /<header\b/g), 1, 'JP Valderrama must render exactly one page header');
assert.equal(countOccurrences(jpPage, /<BrandLogo\b/g), 1, 'JP Valderrama header must render exactly one canonical BrandLogo');
assert.equal(
  countOccurrences(jpPage, /min-h-\[76px\][^\n]*max-w-\[(?:1440|1500)px\][^\n]*items-center[^\n]*justify-between/g),
  1,
  'JP Valderrama must keep a single canonical header layout row',
);

const normalizeRiffPadding = (bytes) => {
  if (bytes.length < 8) return bytes;
  const declaredLength = bytes.readUInt32LE(4) + 8;
  const missingBytes = declaredLength - bytes.length;
  if (missingBytes > 0 && missingBytes <= 2) {
    return Buffer.concat([bytes, Buffer.alloc(missingBytes)]);
  }
  return bytes;
};

const assertCompleteWebp = (input, label) => {
  const bytes = normalizeRiffPadding(input);
  assert.ok(bytes.length >= 512, `${label} must contain a non-empty image payload.`);
  assert.equal(bytes.subarray(0, 4).toString('ascii'), 'RIFF', `${label} must start with RIFF.`);
  assert.equal(bytes.subarray(8, 12).toString('ascii'), 'WEBP', `${label} must be WebP.`);
  assert.equal(bytes.readUInt32LE(4) + 8, bytes.length, `${label} RIFF length must match the delivered payload.`);
};

const publicVisualFiles = ['books.webp', 'projects.webp', 'talks.webp', 'brand.webp'];
for (const file of publicVisualFiles) {
  await access(new URL(`../public/jpvalderrama/${file}`, import.meta.url));
  assert.ok(jpAssetRoute.includes(`'${file}'`), `JP visual route must reference committed asset ${file}`);
}

const inlineVisualGroups = {
  ideas: ['ideas-00.ts', 'ideas-01.ts', 'ideas-02.ts', 'ideas-03.ts', 'ideas-04.ts'],
  philosophyTechnology: [
    'philosophy-technology-00.ts',
    'philosophy-technology-01.ts',
    'philosophy-technology-02.ts',
    'philosophy-technology-03.ts',
  ],
  thoughtMap: ['thought-map-00.ts', 'thought-map-01.ts', 'thought-map-02.ts'],
};

for (const [group, modules] of Object.entries(inlineVisualGroups)) {
  const chunks = [];
  for (const module of modules) {
    await access(new URL(`../src/data/jpvalderrama-visuals/${module}`, import.meta.url));
    const importStem = module.replace(/\.ts$/, '');
    assert.ok(
      jpAssetRoute.includes(`@/data/jpvalderrama-visuals/${importStem}`),
      `JP asset route must import repository-backed visual module ${module}`,
    );
    const source = await read(`src/data/jpvalderrama-visuals/${module}`);
    const match = source.match(/^export default '([A-Za-z0-9+/=]+)';\s*$/);
    assert.ok(match, `JP visual source module ${module} must contain one base64 payload.`);
    chunks.push(match[1]);
  }
  assertCompleteWebp(Buffer.from(chunks.join(''), 'base64'), `JP inline visual ${group}`);
}

const conferenceFiles = [
  'assets/jpvalderrama-hd/conference.00.b64',
  'assets/jpvalderrama-hd/conference.01.b64',
  'assets/jpvalderrama-hd/conference.02.b64',
  'assets/jpvalderrama-hd/conference.03.b64',
  'assets/jpvalderrama-hd/conference.04.b64',
  'assets/jpvalderrama-hd/conference.05.b64',
];
const conferenceChunks = [];
for (const file of conferenceFiles) {
  await access(new URL(`../${file}`, import.meta.url));
  assert.ok(jpAssetRoute.includes(file), `JP conference route must reference committed source ${file}.`);
  conferenceChunks.push(await read(file));
}
assertCompleteWebp(Buffer.from(conferenceChunks.join(''), 'base64'), 'JP conference visual');

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
  const routeKey = semanticAsset === 'waveform' ? 'waveform:' : `'${semanticAsset}':`;
  assert.ok(jpAssetRoute.includes(routeKey), `JP semantic asset ${semanticAsset} must be routed.`);
}

assert.match(jpAssetRoute, /Buffer\.from\(INLINE_ASSETS\[asset\], 'base64'\)/);
assert.match(jpAssetRoute, /normalizeRiffPadding/);
assert.match(jpAssetRoute, /missingBytes > 0 && missingBytes <= 2/);
assert.match(jpAssetRoute, /readUInt32LE\(4\) \+ 8/);
assert.match(jpAssetRoute, /declaredLength !== bytes\.length/);
assert.match(jpAssetRoute, /assertWebp\(bytes\)/);
assert.match(jpAssetRoute, /if-none-match/i);
assert.match(jpAssetRoute, /must-revalidate/);
assert.doesNotMatch(jpAssetRoute, /immutable|max-age=31536000/);

console.log('Institutional CTG One Technology brand-lock invariants: PASS');