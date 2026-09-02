const healthUrl = process.env.HEALTH_URL ?? 'https://ctgone.com/api/health';
const requestTimeoutMs = Number(
  process.env.PUBLIC_SURFACE_CANARY_REQUEST_TIMEOUT_MS
    ?? process.env.CANARY_REQUEST_TIMEOUT_MS
    ?? '10000',
);

if (!Number.isInteger(requestTimeoutMs) || requestTimeoutMs < 1000 || requestTimeoutMs > 30000) {
  throw new Error('PUBLIC_SURFACE_CANARY_REQUEST_TIMEOUT_MS must be between 1000 and 30000 milliseconds.');
}

const productionOrigin = new URL(healthUrl).origin;
if (!productionOrigin.startsWith('https://')) {
  throw new Error('Public surface reliability canary requires an HTTPS production origin.');
}

const pagePaths = ['/jpvalderrama'];
const assetPaths = [
  '/api/jpvalderrama/assets/books-desk',
  '/api/jpvalderrama/assets/thought-map',
  '/api/jpvalderrama/assets/philosophy-money',
  '/api/jpvalderrama/assets/waveform',
  '/api/jpvalderrama/assets/conference-hero',
  '/api/jpvalderrama/assets/philosophy-technology',
  '/api/jpvalderrama/assets/conference-poster',
  '/api/jpvalderrama/assets/jp-icon',
  '/api/jpvalderrama/assets/ideas-button',
];

async function fetchBounded(path, headers = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    return await fetch(new URL(path, productionOrigin), {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
        'User-Agent': 'ctg-one-public-surface-canary/1.0',
        ...headers,
      },
      cache: 'no-store',
      redirect: 'follow',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

const observations = [];
const failures = [];

for (const path of pagePaths) {
  try {
    const response = await fetchBounded(path, { Accept: 'text/html' });
    const body = await response.text();
    const contentType = response.headers.get('content-type') ?? '';
    const observation = {
      path,
      status: response.status,
      contentType,
      bytes: Buffer.byteLength(body),
    };
    observations.push(observation);
    if (!response.ok) failures.push(`${path}: http=${response.status}`);
    if (!contentType.toLowerCase().includes('text/html')) failures.push(`${path}: content-type=${contentType}`);
    if (!body.includes('JP Valderrama') && !body.includes('Juan Pablo Valderrama')) {
      failures.push(`${path}: canonical JP Valderrama content marker missing`);
    }
  } catch (error) {
    failures.push(`${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

for (const path of assetPaths) {
  try {
    const response = await fetchBounded(path, { Accept: 'image/webp,image/*;q=0.8' });
    const bytes = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') ?? '';
    const cacheControl = response.headers.get('cache-control') ?? '';
    const etag = response.headers.get('etag') ?? '';
    const observation = {
      path,
      status: response.status,
      contentType,
      cacheControl,
      etag: etag || null,
      bytes: bytes.length,
      revalidationStatus: null,
    };

    if (!response.ok) failures.push(`${path}: http=${response.status}`);
    if (!contentType.toLowerCase().includes('image/webp')) failures.push(`${path}: content-type=${contentType}`);
    if (bytes.length < 512) failures.push(`${path}: image payload unexpectedly small (${bytes.length} bytes)`);
    if (!etag) failures.push(`${path}: missing ETag`);
    if (!/must-revalidate/i.test(cacheControl)) failures.push(`${path}: cache-control must revalidate (${cacheControl})`);
    if (/immutable/i.test(cacheControl)) failures.push(`${path}: semantic URL must not be immutable`);

    if (etag && response.ok) {
      const revalidated = await fetchBounded(path, {
        Accept: 'image/webp,image/*;q=0.8',
        'If-None-Match': etag,
      });
      observation.revalidationStatus = revalidated.status;
      if (revalidated.status !== 304) failures.push(`${path}: If-None-Match expected 304, got ${revalidated.status}`);
      await revalidated.arrayBuffer();
    }

    observations.push(observation);
  } catch (error) {
    failures.push(`${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures.length > 0) {
  console.error(JSON.stringify({
    result: 'FAIL',
    productionOrigin,
    failures,
    observations,
  }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  result: 'PASS',
  productionOrigin,
  verifiedPages: pagePaths.length,
  verifiedAssets: assetPaths.length,
  observations,
}, null, 2));
