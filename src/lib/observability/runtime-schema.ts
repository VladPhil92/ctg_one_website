import 'server-only';

import { createAdminClient } from '@/lib/supabase/server';
import {
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
  // Supabase as `NNNN_name`. Runtime compatibility is intentionally based on
  // the logical migration identity, not on the filename/version convention.
  return name.replace(/^\d{4}_/, '');
}

export async function probeRuntimeSchemaCompatibility(): Promise<RuntimeSchemaCompatibility> {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (!configured) {
    return {
      compatible: false,
      probeAvailable: false,
      configured: false,
      errorCode: 'privileged_probe_not_configured',
      observedMigrationCount: null,
      observedLatestMigrationName: null,
    };
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc('get_runtime_schema_compatibility');

    if (error) {
      return {
        compatible: false,
        probeAvailable: false,
        configured: true,
        errorCode: error.code ?? 'unknown',
        observedMigrationCount: null,
        observedLatestMigrationName: null,
      };
    }

    const row = ((Array.isArray(data) ? data[0] : data) ?? null) as RuntimeSchemaCompatibilityRow | null;
    const observedMigrationCount = row?.migration_count == null ? null : Number(row.migration_count);
    const observedLatestMigrationName = normalizeRuntimeMigrationName(row?.latest_name ?? null);

    return {
      compatible: Boolean(
        row
        && observedMigrationCount === EXPECTED_DATABASE_MIGRATION_COUNT
        && observedLatestMigrationName === EXPECTED_DATABASE_MIGRATION_NAME
      ),
      probeAvailable: Boolean(row),
      configured: true,
      errorCode: null,
      observedMigrationCount,
      observedLatestMigrationName,
    };
  } catch {
    return {
      compatible: false,
      probeAvailable: false,
      configured: true,
      errorCode: 'runtime_probe_failed',
      observedMigrationCount: null,
      observedLatestMigrationName: null,
    };
  }
}
