import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [nextConfig, sitemap, technologyStatusLayout, changelogLayout, labsLayout, navbar] = await Promise.all([
  read('next.config.js'),
  read('src/app/sitemap.ts'),
  read('src/app/technology/status/layout.tsx'),
  read('src/app/changelog/layout.tsx'),
  read('src/app/labs/layout.tsx'),
  read('src/components/Navbar.tsx'),
]);

assert.doesNotMatch(
  nextConfig,
  /unoptimized\s*:\s*true/,
  'Next.js image optimization must not be globally disabled on the production Node runtime.',
);
assert.match(
  nextConfig,
  /formats\s*:\s*\[[^\]]*image\/avif[^\]]*image\/webp[^\]]*\]/s,
  'Next.js image optimization must advertise AVIF and WebP output formats.',
);

const sitemapPaths = [...sitemap.matchAll(/path:\s*'([^']+)'/g)].map((match) => match[1]);
for (const publicEvidencePath of ['/technology/status', '/changelog', '/labs']) {
  assert.ok(
    sitemapPaths.includes(publicEvidencePath),
    `Public evidence surface ${publicEvidencePath} must remain discoverable in sitemap.xml.`,
  );
}
for (const privatePrefix of ['/dashboard', '/admin', '/knowledge', '/inversion/app', '/inversion/admin']) {
  assert.ok(
    !sitemapPaths.some((path) => path === privatePrefix || path.startsWith(`${privatePrefix}/`)),
    `Private/internal namespace ${privatePrefix} and its descendants must not be advertised in sitemap.xml.`,
  );
}

assert.doesNotMatch(
  sitemap,
  /lastModified\s*:\s*(?:new\s+Date\s*\(|now\b)/,
  'Sitemap must not claim synthetic request/build-time lastModified values. Use an authoritative content timestamp or omit the field.',
);

for (const [path, source] of [
  ['/technology/status', technologyStatusLayout],
  ['/changelog', changelogLayout],
  ['/labs', labsLayout],
]) {
  assert.ok(
    source.includes(`canonical: 'https://ctgone.com${path}'`),
    `Public evidence surface ${path} must declare a self-canonical URL.`,
  );
}

assert.ok(navbar.includes('aria-label="Primary navigation"'), 'Primary navigation landmark must have an accessible name.');
assert.ok(navbar.includes("aria-current={isActive ? 'page' : undefined}"), 'Active navigation links must expose aria-current=page.');
assert.ok(navbar.includes('type="button"'), 'Mobile navigation toggle must be an explicit non-submit button.');
assert.ok(navbar.includes('aria-expanded={isOpen}'), 'Mobile navigation toggle must expose its expanded state.');
assert.ok(navbar.includes('aria-controls={MOBILE_NAVIGATION_ID}'), 'Mobile navigation toggle must identify the controlled panel.');
assert.ok(navbar.includes('event.key === \'Escape\''), 'Mobile navigation must close on Escape.');
assert.ok(navbar.includes('role="dialog"') && navbar.includes('aria-modal="true"'), 'Open mobile navigation must expose modal dialog semantics.');

console.log('Web quality invariants: PASS');
