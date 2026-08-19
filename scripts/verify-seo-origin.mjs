import { readFile } from 'node:fs/promises';

const origin = new URL(process.env.SEO_ORIGIN ?? 'https://ctgone.com');
const requestTimeoutMs = Number(process.env.SEO_REQUEST_TIMEOUT_MS ?? '10000');
if (!['https:'].includes(origin.protocol)) throw new Error('SEO origin must use HTTPS.');
if (!Number.isInteger(requestTimeoutMs) || requestTimeoutMs < 1000 || requestTimeoutMs > 30000) {
  throw new Error('SEO_REQUEST_TIMEOUT_MS must be between 1000 and 30000 milliseconds.');
}

const sitemapSource = await readFile(new URL('../src/app/sitemap.ts', import.meta.url), 'utf8');
const expectedPaths = [...sitemapSource.matchAll(/path:\s*'([^']+)'/g)].map((match) => match[1]);
if (!expectedPaths.length || expectedPaths[0] !== '/') throw new Error('Unable to resolve canonical public routes from sitemap.ts.');

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'text/html,application/xml,text/plain;q=0.9,*/*;q=0.8',
        'Cache-Control': 'no-cache',
        'User-Agent': 'ctg-one-seo-origin-canary/1.0',
      },
      cache: 'no-store',
      redirect: 'follow',
      signal: controller.signal,
    });
    const body = await response.text();
    return { response, body };
  } finally {
    clearTimeout(timer);
  }
}

const canonicalHref = (html) => {
  const linkTags = html.match(/<link\b[^>]*>/gi) ?? [];
  for (const tag of linkTags) {
    if (!/\brel=["']canonical["']/i.test(tag)) continue;
    const href = /\bhref=["']([^"']+)["']/i.exec(tag)?.[1];
    if (href) return href;
  }
  return null;
};

const normalizeUrl = (value) => {
  const url = new URL(value, origin);
  if (url.pathname === '/') url.pathname = '';
  url.hash = '';
  url.search = '';
  return url.toString().replace(/\/$/, '');
};

const robotsUrl = new URL('/robots.txt', origin);
const { response: robotsResponse, body: robots } = await fetchText(robotsUrl);
if (!robotsResponse.ok) throw new Error(`robots.txt returned HTTP ${robotsResponse.status}.`);
const expectedSitemapUrl = new URL('/sitemap.xml', origin).toString();
if (!robots.includes(`Sitemap: ${expectedSitemapUrl}`)) {
  throw new Error('robots.txt does not advertise the canonical sitemap URL.');
}

const { response: sitemapResponse, body: sitemapXml } = await fetchText(expectedSitemapUrl);
if (!sitemapResponse.ok) throw new Error(`sitemap.xml returned HTTP ${sitemapResponse.status}.`);
const deployedLocations = new Set(
  [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((match) => normalizeUrl(match[1].trim())),
);

const checks = [];
for (const routePath of expectedPaths) {
  const expectedUrl = new URL(routePath, origin);
  const normalizedExpected = normalizeUrl(expectedUrl);
  if (!deployedLocations.has(normalizedExpected)) {
    throw new Error(`Deployed sitemap is missing ${routePath}.`);
  }

  const { response, body } = await fetchText(expectedUrl);
  if (!response.ok) throw new Error(`Public route ${routePath} returned HTTP ${response.status}.`);
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('text/html')) {
    throw new Error(`Public route ${routePath} did not return HTML.`);
  }
  if (/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(body)) {
    throw new Error(`Public sitemap route ${routePath} unexpectedly declares noindex.`);
  }

  const observedCanonical = canonicalHref(body);
  if (!observedCanonical) throw new Error(`Public route ${routePath} has no canonical link in rendered HTML.`);
  if (normalizeUrl(observedCanonical) !== normalizedExpected) {
    throw new Error(`Public route ${routePath} canonical does not self-reference.`);
  }
  checks.push({ path: routePath, status: response.status, canonical: 'self' });
}

const { body: homeHtml } = await fetchText(origin);
if (!/<title>[^<]*CTG One Technology[^<]*<\/title>/i.test(homeHtml)) {
  throw new Error('Home title does not expose the canonical CTG One Technology identity.');
}

console.log(JSON.stringify({
  result: 'PASS',
  origin: origin.origin,
  robots: 'PASS',
  sitemap: 'PASS',
  routeCount: checks.length,
  selfCanonicalCount: checks.length,
}, null, 2));
