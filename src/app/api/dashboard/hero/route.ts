import { DASHBOARD_HERO_IMAGE_BASE64 } from '@/data/dashboardHeroImagePayload';

export const runtime = 'nodejs';
export const dynamic = 'force-static';

const heroBytes = Buffer.from(DASHBOARD_HERO_IMAGE_BASE64, 'base64');

export function GET() {
  return new Response(heroBytes, {
    status: 200,
    headers: {
      'Content-Type': 'image/webp',
      'Content-Length': String(heroBytes.byteLength),
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
