import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [brandLogo, navbar, publicShell, jpShell, jpPage] = await Promise.all([
  read('src/components/BrandLogo.tsx'),
  read('src/components/Navbar.tsx'),
  read('src/components/PublicPageShell.tsx'),
  read('src/components/jpvalderrama/JPValderramaShell.tsx'),
  read('src/app/jpvalderrama/page.tsx'),
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

console.log('Institutional CTG One Technology brand-lock invariants: PASS');
