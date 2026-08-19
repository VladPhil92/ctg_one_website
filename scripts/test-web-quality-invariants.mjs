import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [nextConfig, sitemap] = await Promise.all([
  readFile(new URL('../next.config.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/sitemap.ts', import.meta.url), 'utf8'),
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

for (const publicEvidencePath of ['/technology/status', '/changelog', '/labs']) {
  assert.ok(
    sitemap.includes(`path: '${publicEvidencePath}'`),
    `Public evidence surface ${publicEvidencePath} must remain discoverable in sitemap.xml.`,
  );
}
for (const privatePath of ['/dashboard', '/admin', '/knowledge', '/inversion/app', '/inversion/admin']) {
  assert.ok(
    !sitemap.includes(`path: '${privatePath}'`),
    `Private/internal surface ${privatePath} must not be advertised in sitemap.xml.`,
  );
}

console.log('Web quality invariants: PASS');
