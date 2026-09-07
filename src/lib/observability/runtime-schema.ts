import 'server-only';

import { createAdminClient } from '@/lib/supabase/server';
import {
  EXPECTED_DATABASE_MIGRATION,
  EXPECTED_DATABASE_MIGRATION_COUNT,
  EXPECTED_DATABASE_MIGRATION_NAME,
} from './schema-version';

type RuntimeSchemaCompatibilityRow = {
  migration_count: number | string | null;
  latest_version: string | null;
  latest_name: string | null;
};

export type RuntimeSchemaCompatibility = {
  compatible: boolean;
  exact: boolean;
  requiredMigrationPresent: boolean;
  probeAvailable: boolean;
  configured: boolean;
  errorCode: string | null;
  observedMigrationCount: number | null;
  observedLatestMigrationName: string | null;
};

function normalizeRuntimeMigrationName(name: string | null): string | null {
  if (!name) return null;

  // Legacy NNNN_name.sql migrations are recorded remotely as `name`, while
  // timestamp-era YYYYMMDDHHMMSS_NNNN_name.sql migrations are recorded by
  // Supabase as `NNNN_name`. Strip the prefix only when it matches the exact
  // logical migration expected by this application release. A mismatched
  // prefix is preserved so the exact-version comparison remains fail-closed.
  const timestampEraMatch = /^(\d{4})_(.+)$/.exec(name);
  if (!timestampEraMatch) return name;

  const [, logicalVersion, semanticName] = timestampEraMatch;
  if (logicalVersion !== EXPECTED_DATABASE_MIGRATION) return name;

  return semanticName;
}

export async function probeRuntimeSchemaCompatibility(): Promise<RuntimeSchemaCompatibility> {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (!configured) {
    return {
      compatible: false,
      exact: false,
      requiredMigrationPresent: false,
      probeAvailable: false,
      configured: false,
      errorCode: 'privileged_probe_not_configured',
      observedMigrationCount: null,
      observedLatestMigrationName: null,
    };
  }

  try {
    const admin = createAdminClient();
    const [compatibilityResult, requirementResult] = await Promise.all([
      admin.rpc('get_runtime_schema_compatibility'),
      admin.rpc('has_runtime_schema_migration', {
        p_logical_version: EXPECTED_DATABASE_MIGRATION,
        p_expected_name: EXPECTED_DATABASE_MIGRATION_NAME,
      }),
    ]);

    if (compatibilityResult.error || requirementResult.error) {
      return {
        compatible: false,
        exact: false,
        requiredMigrationPresent: false,
        probeAvailable: false,
        configured: true,
        errorCode:
          compatibilityResult.error?.code
          ?? requirementResult.error?.code
          ?? 'unknown',
        observedMigrationCount: null,
        observedLatestMigrationName: null,
      };
    }

    const row = ((Array.isArray(compatibilityResult.data)
      ? compatibilityResult.data[0]
      : compatibilityResult.data) ?? null) as RuntimeSchemaCompatibilityRow | null;
    const requiredMigrationPresent = requirementResult.data === true;
    const observedMigrationCount = row?.migration_count == null ? null : Number(row.migration_count);
    const observedLatestMigrationName = normalizeRuntimeMigrationName(row?.latest_name ?? null);
    const exact = Boolean(
      row
      && requiredMigrationPresent
      && observedMigrationCount === EXPECTED_DATABASE_MIGRATION_COUNT
      && observedLatestMigrationName === EXPECTED_DATABASE_MIGRATION_NAME
    );

    // Deployments follow a DB-first expand/contract protocol. A runtime may
    // safely serve against a schema that is newer than its minimum requirement
    // only when production proves the runtime's exact required logical migration
    // is actually present. Migration count alone is not accepted as evidence,
    // because a divergent history can be numerically ahead while missing the
    // required migration. Equal-version histories remain exact-name checked.
    const compatible = Boolean(
      row
      && requiredMigrationPresent
      && Number.isInteger(observedMigrationCount)
      && observedMigrationCount != null
      && (
        observedMigrationCount > EXPECTED_DATABASE_MIGRATION_COUNT
        || exact
      )
    );

    return {
      compatible,
      exact,
      requiredMigrationPresent,
      probeAvailable: Boolean(row),
      configured: true,
      errorCode: null,
      observedMigrationCount,
      observedLatestMigrationName,
    };
  } catch {
    return {
      compatible: false,
      exact: false,
      requiredMigrationPresent: false,
      probeAvailable: false,
      configured: true,
      errorCode: 'runtime_probe_failed',
      observedMigrationCount: null,
      observedLatestMigrationName: null,
    };
  }
}
