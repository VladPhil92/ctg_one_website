import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const nextConfig = await readFile(new URL('../next.config.js', import.meta.url), 'utf8');

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

console.log('Web quality invariants: PASS');