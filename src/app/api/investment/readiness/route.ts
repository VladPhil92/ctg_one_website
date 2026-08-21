import { NextResponse } from 'next/server';
import { getCapabilityProof, getPublicProofStatus } from '@/data/technology-proof';
import { getDeploymentMetadata } from '@/lib/observability/deployment';
import {
  EXPECTED_DATABASE_MIGRATION,
  EXPECTED_DATABASE_MIGRATION_COUNT,
  EXPECTED_DATABASE_MIGRATION_NAME,
} from '@/lib/observability/schema-version';
import { probeRuntimeSchemaCompatibility } from '@/lib/observability/runtime-schema';

export const dynamic = 'force-dynamic';

export async function GET() {
  const capability = getCapabilityProof('investment-platform');
  const deployment = getDeploymentMetadata();
  const schema = await probeRuntimeSchemaCompatibility();
  const publicStatus = getPublicProofStatus(capability);

  const checks = {
    databaseSchemaCompatible: schema.compatible,
    privilegedSchemaProbeConfigured: schema.configured,
    productionDeploymentIdentified:
      deployment.provider !== 'render' || Boolean(deployment.commit),
    technicalMaturityHonest: capability.status === 'PARTIAL',
    publicReleaseStageHonest: publicStatus === 'BETA',
  };

  const ready = Object.values(checks).every(Boolean);
  const status = ready
    ? 'ready'
    : deployment.provider === 'render'
      ? 'not-ready'
      : 'degraded';

  return NextResponse.json(
    {
      status,
      service: 'ctg-craft-beer-investment',
      capability: {
        id: capability.id,
        technicalStatus: capability.status,
        publicStatus,
      },
      deployment,
      schema: {
        compatible: schema.compatible,
        expectedMigration: EXPECTED_DATABASE_MIGRATION,
        expectedMigrationName: EXPECTED_DATABASE_MIGRATION_NAME,
        expectedMigrationCount: EXPECTED_DATABASE_MIGRATION_COUNT,
        probeAvailable: schema.probeAvailable,
      },
      checks,
      evidence: {
        ciOperationalGoldenJourney: 'certified',
        productionDeploymentReadiness: ready ? 'verified' : 'pending',
        productionOperatingEvidence: 'pending',
        mutationMode: 'read-only',
      },
      timestamp: new Date().toISOString(),
    },
    {
      status: status === 'not-ready' ? 503 : 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
