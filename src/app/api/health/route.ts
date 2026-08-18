import { NextResponse } from 'next/server';
import { logger } from '@/lib/observability/logger';
import { getDeploymentMetadata } from '@/lib/observability/deployment';
import {
  EXPECTED_DATABASE_MIGRATION_COUNT,
  EXPECTED_DATABASE_MIGRATION_NAME,
} from '@/lib/observability/schema-version';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type RuntimeSchemaCompatibilityRow = {
  migration_count: number | string | null;
  latest_version: string | null;
  latest_name: string | null;
};

export async function GET() {
  const deployment = getDeploymentMetadata();
  const supabasePublicConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const serviceRoleConfigured = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  let schemaCompatible = false;
  let schemaProbeAvailable = false;
  let schemaProbeErrorCode: string | null = null;
  let observedMigrationCount: number | null = null;
  let observedLatestMigrationName: string | null = null;

  if (supabasePublicConfig && serviceRoleConfigured) {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin.rpc('get_runtime_schema_compatibility');

      if (error) {
        schemaProbeErrorCode = error.code ?? 'unknown';
      } else {
        const row = ((Array.isArray(data) ? data[0] : data) ?? null) as RuntimeSchemaCompatibilityRow | null;
        schemaProbeAvailable = Boolean(row);
        observedMigrationCount = row?.migration_count == null ? null : Number(row.migration_count);
        observedLatestMigrationName = row?.latest_name ?? null;
        schemaCompatible = Boolean(
          row
          && observedMigrationCount === EXPECTED_DATABASE_MIGRATION_COUNT
          && observedLatestMigrationName === EXPECTED_DATABASE_MIGRATION_NAME
        );
      }
    } catch {
      schemaProbeErrorCode = 'runtime_probe_failed';
    }
  }

  const checks = {
    supabasePublicConfig,
    serviceRoleConfigured,
    siteUrlConfigured: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
    deploymentCommitAvailable: deployment.provider !== 'render' || Boolean(deployment.commit),
    databaseSchemaCompatible: schemaCompatible,
  };

  const baseChecksHealthy = checks.supabasePublicConfig
    && checks.serviceRoleConfigured
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
      probeAvailable: schemaProbeAvailable,
      errorCode: schemaProbeErrorCode,
      expectedMigrationCount: EXPECTED_DATABASE_MIGRATION_COUNT,
      expectedLatestMigrationName: EXPECTED_DATABASE_MIGRATION_NAME,
      observedMigrationCount,
      observedLatestMigrationName,
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
        compatible: schemaCompatible,
        expectedMigrationCount: EXPECTED_DATABASE_MIGRATION_COUNT,
        probeAvailable: schemaProbeAvailable,
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
