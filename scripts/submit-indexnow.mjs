import { readFile } from 'node:fs/promises';

const INDEXNOW_KEY = '91c0bf8c45352125228946934655c313';
const origin = new URL(process.env.INDEXNOW_ORIGIN ?? 'https://ctgone.com');
const endpoint = process.env.INDEXNOW_ENDPOINT ?? 'https://api.indexnow.org/indexnow';
const timeoutMs = Number(process.env.INDEXNOW_REQUEST_TIMEOUT_MS ?? '15000');

if (origin.protocol !== 'https:') throw new Error('IndexNow origin must use HTTPS.');
if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 30000) {
  throw new Error('INDEXNOW_REQUEST_TIMEOUT_MS must be between 1000 and 30000 milliseconds.');
}

const sitemapSource = await readFile(new URL('../src/app/sitemap.ts', import.meta.url), 'utf8');
const routePaths = [...sitemapSource.matchAll(/path:\s*'([^']+)'/g)].map((match) => match[1]);
if (!routePaths.length || routePaths.length > 10000) throw new Error('IndexNow route batch must contain between 1 and 10000 URLs.');
const urlList = routePaths.map((routePath) => new URL(routePath, origin).toString());
const keyLocation = new URL(`/${INDEXNOW_KEY}.txt`, origin).toString();

async function fetchWithBody(url, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const body = await response.text();
    return { response, body };
  } finally {
    clearTimeout(timer);
  }
}

const keyCheck = await fetchWithBody(keyLocation, {
  headers: { 'Cache-Control': 'no-cache', 'User-Agent': 'ctg-one-indexnow/1.0' },
  cache: 'no-store',
});
if (!keyCheck.response.ok || keyCheck.body.trim() !== INDEXNOW_KEY) {
  throw new Error(`IndexNow ownership key is not deployed correctly (HTTP ${keyCheck.response.status}).`);
}

const submission = await fetchWithBody(endpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    Accept: 'application/json,text/plain,*/*',
    'User-Agent': 'ctg-one-indexnow/1.0',
  },
  body: JSON.stringify({
    host: origin.host,
    key: INDEXNOW_KEY,
    keyLocation,
    urlList,
  }),
});

if (![200, 202].includes(submission.response.status)) {
  throw new Error(`IndexNow submission failed with HTTP ${submission.response.status}.`);
}

console.log(JSON.stringify({
  result: 'PASS',
  endpoint: new URL(endpoint).origin,
  host: origin.host,
  submittedUrlCount: urlList.length,
  responseStatus: submission.response.status,
}, null, 2));
