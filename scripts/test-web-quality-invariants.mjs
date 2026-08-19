import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [nextConfig, sitemap, technologyStatusLayout, changelogLayout, labsLayout] = await Promise.all([
  read('next.config.js'),
  read('src/app/sitemap.ts'),
  read('src/app/technology/status/layout.tsx'),
  read('src/app/changelog/layout.tsx'),
  read('src/app/labs/layout.tsx'),
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

console.log('Web quality invariants: PASS');
