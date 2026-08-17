import { NextResponse } from 'next/server';
import { logger } from '@/lib/observability/logger';
import { getDeploymentMetadata } from '@/lib/observability/deployment';

export const dynamic = 'force-dynamic';

export async function GET() {
  const deployment = getDeploymentMetadata();
  const checks = {
    supabasePublicConfig: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
    siteUrlConfigured: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
    deploymentCommitAvailable: deployment.provider !== 'render' || Boolean(deployment.commit),
  };

  const status = Object.values(checks).every(Boolean) ? 'ok' : 'degraded';

  logger.info('health_check', {
    status,
    checks,
    deployment,
  });

  return NextResponse.json(
    {
      status,
      service: 'ctg-one-web',
      timestamp: new Date().toISOString(),
      checks,
      deployment,
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
