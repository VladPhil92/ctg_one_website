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

// Structural guardrails: a brand-normalization change must never duplicate the
// canonical component contract or implementation. This catches the exact class
// of regression that can leave the lockup visually correct in a diff while
// making the source invalid or ambiguous at build time.
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

// Standard CTG One public surfaces inherit the institutional lockup through
// PublicPageShell -> Navbar. Custom editorial shells must explicitly keep it.
assert.match(publicShell, /<Navbar \/>/);
assert.match(navbar, /<BrandLogo priority/);
assert.match(jpShell, /import \{ BrandLogo \} from '@\/components\/BrandLogo';/);
assert.match(jpShell, /<BrandLogo priority tone="light"/);
assert.doesNotMatch(jpShell, />JPV<\/span>/);
assert.match(jpPage, /import \{ BrandLogo \} from '@\/components\/BrandLogo';/);
assert.match(jpPage, /<BrandLogo priority tone="light"/);
assert.doesNotMatch(jpPage, /src="\/images\/logo\/ctg-one-logo\.png"/);

// JP Valderrama keeps one institutional header and one canonical brand lockup.
// Duplicate wrapper/header insertions are treated as a regression before lint,
// typecheck, build, or browser tests run. The editorial container may use the
// established 1440px width or the HD integration's wider 1500px canvas.
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

// Every semantic visual URL must resolve to a file that is actually committed
// with the deployment. Never reconstruct production images from missing chunks.
const visualFiles = ['books.webp', 'projects.webp', 'ideas.webp', 'talks.webp', 'conference.webp', 'brand.webp'];
for (const file of visualFiles) {
  await access(new URL(`../public/jpvalderrama/${file}`, import.meta.url));
  assert.ok(jpAssetRoute.includes(`'${file}'`), `JP visual route must reference committed asset ${file}`);
}
assert.doesNotMatch(jpAssetRoute, /assets['"],\s*['"]jpvalderrama-hd|\.b64/, 'JP visual route must not depend on uncommitted base64 chunks.');
assert.match(jpAssetRoute, /if-none-match/i, 'JP visual assets must support ETag revalidation.');
assert.match(jpAssetRoute, /must-revalidate/, 'JP visual assets must use a revalidating cache policy.');
assert.doesNotMatch(jpAssetRoute, /immutable|max-age=31536000/, 'Mutable semantic JP visual URLs must never be cached as immutable for one year.');

console.log('Institutional CTG One Technology brand-lock invariants: PASS');
