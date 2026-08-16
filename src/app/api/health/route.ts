import { NextResponse } from 'next/server';
import { logger } from '@/lib/observability/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks = {
    supabasePublicConfig: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
    siteUrlConfigured: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
  };

  const status = Object.values(checks).every(Boolean) ? 'ok' : 'degraded';

  logger.info('health_check', {
    status,
    checks,
    renderService: process.env.RENDER_SERVICE_NAME ?? null,
    commit: process.env.RENDER_GIT_COMMIT?.slice(0, 12) ?? null,
  });

  return NextResponse.json(
    {
      status,
      service: 'ctg-one-web',
      timestamp: new Date().toISOString(),
      checks,
      commit: process.env.RENDER_GIT_COMMIT?.slice(0, 12) ?? null,
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
