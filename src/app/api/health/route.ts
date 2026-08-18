import { NextResponse } from 'next/server';
import { logger } from '@/lib/observability/logger';
import { getDeploymentMetadata } from '@/lib/observability/deployment';
import {
  EXPECTED_DATABASE_MIGRATION_COUNT,
  EXPECTED_DATABASE_MIGRATION_NAME,
} from '@/lib/observability/schema-version';
import { probeRuntimeSchemaCompatibility } from '@/lib/observability/runtime-schema';

export const dynamic = 'force-dynamic';

export async function GET() {
  const deployment = getDeploymentMetadata();
  const supabasePublicConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const schema = await probeRuntimeSchemaCompatibility();

  const checks = {
    supabasePublicConfig,
    privilegedSchemaProbeConfigured: schema.configured,
    siteUrlConfigured: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
    deploymentCommitAvailable: deployment.provider !== 'render' || Boolean(deployment.commit),
    databaseSchemaCompatible: schema.compatible,
  };

  const baseChecksHealthy = checks.supabasePublicConfig
    && checks.privilegedSchemaProbeConfigured
    && checks.siteUrlConfigured
    && checks.deploymentCommitAvailable;
  const productionHealthy = baseChecksHealthy && checks.databaseSchemaCompatible;
  const status = productionHealthy
    ? 'ok'
    : deployment.provider === 'render'
      ? 'unhealthy'
      : 'degraded';

  logger.info('health_check', {
    status,
    checks,
    deployment,
    schema: {
      probeAvailable: schema.probeAvailable,
      errorCode: schema.errorCode,
      expectedMigrationCount: EXPECTED_DATABASE_MIGRATION_COUNT,
      expectedLatestMigrationName: EXPECTED_DATABASE_MIGRATION_NAME,
      observedMigrationCount: schema.observedMigrationCount,
      observedLatestMigrationName: schema.observedLatestMigrationName,
    },
  });

  return NextResponse.json(
    {
      status,
      service: 'ctg-one-web',
      timestamp: new Date().toISOString(),
      checks,
      deployment,
      schema: {
        compatible: schema.compatible,
        expectedMigrationCount: EXPECTED_DATABASE_MIGRATION_COUNT,
        probeAvailable: schema.probeAvailable,
      },
    },
    {
      status: status === 'unhealthy' ? 503 : 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
