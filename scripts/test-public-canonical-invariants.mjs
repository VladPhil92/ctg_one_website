import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (relative) => readFile(new URL(relative, root), 'utf8');
const sitemap = await read('src/app/sitemap.ts');
const rootLayout = await read('src/app/layout.tsx');
const lotDetailPage = await read('src/app/inversion/lotes/[slug]/page.tsx');
const sitemapPaths = [...sitemap.matchAll(/path:\s*'([^']+)'/g)].map((match) => match[1]);

assert.ok(sitemapPaths.includes('/'), 'Public sitemap must include the root route.');
assert.match(
  rootLayout,
  /canonical:\s*['"]https:\/\/ctgone\.com['"]|canonical:\s*['"]https:\/\/ctgone\.com\/['"]/,
  'Root route must keep a self-canonical URL.',
);

for (const routePath of sitemapPaths.filter((route) => route !== '/')) {
  const relativeBase = `src/app${routePath}`;
  const candidates = [`${relativeBase}/layout.tsx`, `${relativeBase}/page.tsx`];
  const available = candidates.filter((candidate) => existsSync(new URL(candidate, root)));
  assert.ok(available.length > 0, `Sitemap route ${routePath} must resolve to a route source.`);

  const sources = await Promise.all(available.map((candidate) => read(candidate)));
  const expected = `canonical: 'https://ctgone.com${routePath}'`;
  const expectedDoubleQuote = `canonical: \"https://ctgone.com${routePath}\"`;
  assert.ok(
    sources.some((source) => source.includes(expected) || source.includes(expectedDoubleQuote)),
    `Public sitemap route ${routePath} must override inherited metadata with its own canonical URL.`,
  );
}

assert.match(
  lotDetailPage,
  /canonical:\s*`https:\/\/ctgone\.com\/inversion\/lotes\/\$\{canonicalSlug\}`/,
  'Public dynamic lot details must self-canonicalize instead of inheriting the lots index canonical.',
);
assert.match(
  lotDetailPage,
  /robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/,
  'Unknown lot slugs must be noindex so missing resources cannot create index noise.',
);

console.log(`Public canonical invariants: PASS (${sitemapPaths.length} sitemap routes + dynamic lot details).`);
