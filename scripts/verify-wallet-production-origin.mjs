const healthUrl = process.env.HEALTH_URL || 'https://ctgone.com/api/health';
const apiOrigin = process.env.WALLET_API_ORIGIN || new URL(healthUrl).origin;
const walletOrigin = process.env.WALLET_CLIENT_ORIGIN || 'https://ctg-one-wallet.vercel.app';
const deniedOrigin = process.env.WALLET_DENIED_ORIGIN || 'https://wallet-origin-denied.invalid';
const requestTimeoutMs = Number(process.env.WALLET_ORIGIN_CANARY_REQUEST_TIMEOUT_MS || '10000');
const overviewUrl = new URL('/api/wallet/overview', apiOrigin).toString();

function splitHeader(value) {
  return (value || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function requireCondition(condition, message, details = {}) {
  if (condition) return;
  const error = new Error(message);
  error.details = details;
  throw error;
}

function responseCorsSnapshot(response) {
  return {
    status: response.status,
    allowOrigin: response.headers.get('access-control-allow-origin'),
    allowMethods: response.headers.get('access-control-allow-methods'),
    allowHeaders: response.headers.get('access-control-allow-headers'),
    vary: response.headers.get('vary'),
    cacheControl: response.headers.get('cache-control'),
  };
}

async function preflight(origin) {
  const response = await fetch(overviewUrl, {
    method: 'OPTIONS',
    redirect: 'manual',
    signal: AbortSignal.timeout(requestTimeoutMs),
    headers: {
      Origin: origin,
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'authorization, content-type, privy-id-token',
    },
  });

  return responseCorsSnapshot(response);
}

async function unauthenticatedGet(origin) {
  const response = await fetch(overviewUrl, {
    method: 'GET',
    redirect: 'manual',
    signal: AbortSignal.timeout(requestTimeoutMs),
    headers: {
      Origin: origin,
    },
  });

  return responseCorsSnapshot(response);
}

async function main() {
  const allowed = await preflight(walletOrigin);
  const allowedMethods = splitHeader(allowed.allowMethods);
  const allowedHeaders = splitHeader(allowed.allowHeaders);
  const vary = splitHeader(allowed.vary);

  requireCondition(allowed.status === 204, 'Canonical CTG Wallet preflight must return 204', allowed);
  requireCondition(
    allowed.allowOrigin === walletOrigin,
    'Canonical CTG Wallet origin was not echoed exactly',
    allowed,
  );
  requireCondition(
    allowedMethods.includes('get') && allowedMethods.includes('options'),
    'Canonical CTG Wallet preflight is missing GET/OPTIONS',
    allowed,
  );
  for (const requiredHeader of ['authorization', 'content-type', 'privy-id-token']) {
    requireCondition(
      allowedHeaders.includes(requiredHeader),
      `Canonical CTG Wallet preflight is missing ${requiredHeader}`,
      allowed,
    );
  }
  requireCondition(vary.includes('origin'), 'Wallet CORS response must vary by Origin', allowed);
  requireCondition(
    allowed.cacheControl?.toLowerCase().includes('no-store'),
    'Wallet preflight must remain non-cacheable',
    allowed,
  );

  const actual = await unauthenticatedGet(walletOrigin);
  const actualVary = splitHeader(actual.vary);
  requireCondition(
    actual.status === 401,
    'Canonical CTG Wallet unauthenticated GET must reach the route and fail closed with 401',
    actual,
  );
  requireCondition(
    actual.allowOrigin === walletOrigin,
    'Canonical CTG Wallet GET response is missing the exact Access-Control-Allow-Origin',
    actual,
  );
  requireCondition(actualVary.includes('origin'), 'Wallet GET response must vary by Origin', actual);
  requireCondition(
    actual.cacheControl?.toLowerCase().includes('no-store'),
    'Wallet GET response must remain non-cacheable',
    actual,
  );

  const denied = await preflight(deniedOrigin);
  requireCondition(denied.status === 403, 'Untrusted wallet origin must be rejected with 403', denied);
  requireCondition(
    !denied.allowOrigin,
    'Untrusted wallet origin must not receive Access-Control-Allow-Origin',
    denied,
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        apiOrigin,
        endpoint: overviewUrl,
        canonicalWalletOrigin: walletOrigin,
        allowedPreflightStatus: allowed.status,
        allowedGetStatus: actual.status,
        deniedPreflightStatus: denied.status,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        message: error instanceof Error ? error.message : String(error),
        details: error?.details ?? null,
        apiOrigin,
        endpoint: overviewUrl,
        canonicalWalletOrigin: walletOrigin,
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
