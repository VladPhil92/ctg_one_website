import 'server-only';

const NATIVE_WALLET_ORIGINS = new Set([
  'https://localhost',
  'capacitor://localhost',
]);

const DEV_WALLET_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

function configuredOrigins(): Set<string> {
  const origins = new Set(NATIVE_WALLET_ORIGINS);
  if (process.env.NODE_ENV !== 'production') {
    for (const origin of DEV_WALLET_ORIGINS) origins.add(origin);
  }

  for (const raw of (process.env.CTG_WALLET_ALLOWED_ORIGINS ?? '').split(',')) {
    const value = raw.trim();
    if (!value) continue;
    try {
      const url = new URL(value);
      if (!['https:', 'http:', 'capacitor:'].includes(url.protocol)) continue;
      if (url.protocol === 'http:' && process.env.NODE_ENV === 'production') continue;
      origins.add(value.replace(/\/$/, ''));
    } catch {
      // Invalid configured origins are ignored rather than broadening access.
    }
  }

  return origins;
}

export function isAllowedWalletOrigin(origin: string | null): boolean {
  if (!origin) return true;
  return configuredOrigins().has(origin.replace(/\/$/, ''));
}

export function applyWalletCors(
  request: Request,
  response: Response,
  allowedMethods: readonly string[],
): Response {
  const origin = request.headers.get('origin');
  const headers = new Headers(response.headers);
  headers.append('Vary', 'Origin');

  if (origin && isAllowedWalletOrigin(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', allowedMethods.join(', '));
    headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, Privy-ID-Token');
    headers.set('Access-Control-Max-Age', '600');
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function walletCorsPreflight(
  request: Request,
  allowedMethods: readonly string[],
): Response {
  const origin = request.headers.get('origin');
  if (!origin || !isAllowedWalletOrigin(origin)) {
    return new Response(null, { status: 403, headers: { 'Cache-Control': 'no-store' } });
  }

  return applyWalletCors(
    request,
    new Response(null, {
      status: 204,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    }),
    allowedMethods,
  );
}
