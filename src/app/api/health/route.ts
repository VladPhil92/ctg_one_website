import { NextResponse } from 'next/server';
import { logger } from '@/lib/observability/logger';
import { getDeploymentMetadata } from '@/lib/observability/deployment';
import {
  formatTraceparent,
  getRequestObservabilityContext,
} from '@/lib/observability/request-context';
import {
  EXPECTED_DATABASE_MIGRATION_COUNT,
  EXPECTED_DATABASE_MIGRATION_NAME,
} from '@/lib/observability/schema-version';
import { probeRuntimeSchemaCompatibility } from '@/lib/observability/runtime-schema';
import { getWalletCanaryRuntimeContract } from '@/lib/wallet/canary-runtime-contract';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const requestContext = getRequestObservabilityContext(request);
  const deployment = getDeploymentMetadata();
  const walletCanary = getWalletCanaryRuntimeContract();
  const supabasePublicConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const schema = await probeRuntimeSchemaCompatibility();

  const checks = {
    supabasePublicConfig,
    privilegedSchemaProbeConfigured: schema.configured,
    siteUrlConfigured: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
    deploymentCommitAvailable: deployment.provider !== 'render' || Boolean(deployment.commit),
    databaseRequiredMigrationPresent: schema.requiredMigrationPresent,
    databaseSchemaCompatible: schema.compatible,
    databaseSchemaExact: schema.exact,
  };

  const baseChecksHealthy = checks.supabasePublicConfig
    && checks.privilegedSchemaProbeConfigured
    && checks.siteUrlConfigured
    && checks.deploymentCommitAvailable;
  const productionHealthy = baseChecksHealthy
    && checks.databaseRequiredMigrationPresent
    && checks.databaseSchemaCompatible;
  const status = productionHealthy
    ? 'ok'
    : deployment.provider === 'render'
      ? 'unhealthy'
      : 'degraded';

  logger.info('health_check', {
    ...requestContext,
    status,
    checks,
    schema: {
      probeAvailable: schema.probeAvailable,
      errorCode: schema.errorCode,
      compatible: schema.compatible,
      exact: schema.exact,
      requiredMigrationPresent: schema.requiredMigrationPresent,
      expectedMigrationCount: EXPECTED_DATABASE_MIGRATION_COUNT,
      expectedLatestMigrationName: EXPECTED_DATABASE_MIGRATION_NAME,
      observedMigrationCount: schema.observedMigrationCount,
      observedLatestMigrationName: schema.observedLatestMigrationName,
    },
    walletCanary,
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
        exact: schema.exact,
        requiredMigrationPresent: schema.requiredMigrationPresent,
        expectedMigrationCount: EXPECTED_DATABASE_MIGRATION_COUNT,
        observedMigrationCount: schema.observedMigrationCount,
        observedLatestMigrationName: schema.observedLatestMigrationName,
        probeAvailable: schema.probeAvailable,
      },
      walletCanary,
    },
    {
      status: status === 'unhealthy' ? 503 : 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Request-ID': requestContext.request_id,
        traceparent: formatTraceparent(requestContext),
      },
    }
  );
}
