/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === 'production';
const allowLocalSupabaseCsp = process.env.ALLOW_LOCAL_SUPABASE_CSP === '1';

function getConfiguredSupabaseConnectSources() {
  if (isProduction && !allowLocalSupabaseCsp) return '';
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!configuredUrl) return '';

  try {
    const url = new URL(configuredUrl);
    if (isProduction && allowLocalSupabaseCsp && !['127.0.0.1', 'localhost'].includes(url.hostname)) {
      return '';
    }
    const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return ` ${url.origin} ${wsProtocol}//${url.host}`;
  } catch {
    return '';
  }
}

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${isProduction ? '' : " 'unsafe-eval'"}`,
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co${getConfiguredSupabaseConnectSources()}`,
  "worker-src 'self' blob:",
  "media-src 'self'",
  "manifest-src 'self'",
  ...(isProduction ? ['upgrade-insecure-requests'] : []),
].join('; ');

const nextConfig = {
  // CTG One requires a Node-capable runtime because the application uses
  // authenticated server-side Supabase sessions and Route Handlers.
  // Production currently runs as a Render Web Service.
  images: {
    // Preserve detailed source photography while still emitting responsive,
    // modern derivatives for each viewport. 90 is reserved for prominent
    // user-supplied photography; 75 remains available for ordinary UI assets.
    formats: ['image/avif', 'image/webp'],
    qualities: [75, 90],
    deviceSizes: [360, 430, 640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 2592000,
  },

  // Canonical route policy: public corporate pages use stable English slugs.
  // `/inversion` is intentionally retained as the established CTG Craft Beer
  // product namespace because checkout, legal, traceability and indexed URLs
  // already depend on it. English aliases improve discoverability without
  // breaking that product contract. Auth routes remain stable utility paths.
  async redirects() {
    return [
      { source: '/privacidad', destination: '/privacy', permanent: true },
      { source: '/investment', destination: '/inversion', permanent: true },
      { source: '/sign-in', destination: '/iniciar-sesion', permanent: true },
      { source: '/register', destination: '/registro', permanent: true },
    ];
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
          { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
      // This read-only identity proof binds the canonical CTG user, Privy
      // principal and embedded EVM wallet. Keep its referrer surface stricter
      // than ordinary site navigation. This rule intentionally follows the
      // catch-all so Next.js applies it as the last matching header value.
      {
        source: '/api/wallet/identity/proof',
        headers: [
          { key: 'Referrer-Policy', value: 'no-referrer' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
