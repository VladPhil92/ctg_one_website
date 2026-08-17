import type { SupabaseClient } from '@supabase/supabase-js';
import type { HealthCheck, SystemHealthSnapshot } from './health';
import { getDeploymentMetadata } from './deployment';
import { EXPECTED_DATABASE_MIGRATION } from './schema-version';

type MigrationHealthRow = {
  latest_migration: string | null;
};

function summarize(checks: HealthCheck[]) {
  return checks.reduce(
    (acc, check) => {
      if (check.status === 'healthy') acc.healthy += 1;
      else if (check.status === 'degraded') acc.degraded += 1;
      else if (check.status === 'unhealthy') acc.unhealthy += 1;
      else acc.pendingSchema += 1;
      return acc;
    },
    { healthy: 0, degraded: 0, unhealthy: 0, pendingSchema: 0 }
  );
}

export async function addInfrastructureHealth(
  supabase: SupabaseClient,
  snapshot: SystemHealthSnapshot
): Promise<SystemHealthSnapshot> {
  const checks = [...snapshot.checks];
  const deployment = getDeploymentMetadata();

  checks.push({
    id: 'deployment-identity',
    label: 'Render deployment identity',
    status: deployment.provider === 'render' && Boolean(deployment.commit) ? 'healthy' : 'degraded',
    detail: deployment.commit
      ? `Provider=${deployment.provider}; commit=${deployment.commit}; branch=${deployment.branch ?? 'unknown'}; repository=${deployment.repository ?? 'unknown'}; service=${deployment.service ?? 'unknown'}.`
      : 'Runtime does not expose an authoritative Render commit SHA.',
  });

  const started = Date.now();
  const { data, error } = await supabase.rpc('get_system_migration_health');
  const latencyMs = Date.now() - started;
  const latestMigration = error
    ? null
    : ((((data ?? []) as MigrationHealthRow[])[0]?.latest_migration) ?? null);

  checks.push({
    id: 'schema-drift',
    label: 'Git ↔ Supabase migration alignment',
    status: error
      ? 'degraded'
      : latestMigration === EXPECTED_DATABASE_MIGRATION
        ? 'healthy'
        : 'unhealthy',
    detail: error
      ? `Could not verify authoritative migration history: ${error.code ?? 'unknown error'}.`
      : latestMigration === EXPECTED_DATABASE_MIGRATION
        ? `Repository/runtime expects ${EXPECTED_DATABASE_MIGRATION} and Supabase reports ${latestMigration}. No migration drift detected.`
        : `Migration drift detected: repository/runtime expects ${EXPECTED_DATABASE_MIGRATION}, Supabase reports ${latestMigration ?? 'none'}.`,
    latencyMs,
  });

  const summary = summarize(checks);
  const status: SystemHealthSnapshot['status'] = summary.unhealthy > 0
    ? 'unhealthy'
    : summary.degraded > 0 || summary.pendingSchema > 0
      ? 'degraded'
      : 'healthy';

  return {
    ...snapshot,
    status,
    checks,
    summary,
    checkedAt: new Date().toISOString(),
  };
}
