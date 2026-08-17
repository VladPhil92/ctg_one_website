import type { SupabaseClient } from '@supabase/supabase-js';

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'pending_schema';

export type HealthCheck = {
  id: string;
  label: string;
  status: HealthStatus;
  detail: string;
  latencyMs?: number;
};

export type SystemHealthSnapshot = {
  status: Exclude<HealthStatus, 'pending_schema'>;
  checkedAt: string;
  checks: HealthCheck[];
  summary: {
    healthy: number;
    degraded: number;
    unhealthy: number;
    pendingSchema: number;
  };
};

const MISSING_SCHEMA_CODES = new Set(['42P01', '42883', 'PGRST202', 'PGRST204', 'PGRST205']);

function isMissingSchema(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code && MISSING_SCHEMA_CODES.has(error.code)) return true;
  const message = (error.message ?? '').toLowerCase();
  return message.includes('does not exist') || message.includes('could not find the function') || message.includes('schema cache');
}

async function timed<T>(fn: () => PromiseLike<T>): Promise<{ value: T; latencyMs: number }> {
  const started = Date.now();
  const value = await fn();
  return { value, latencyMs: Date.now() - started };
}

export async function collectSystemHealth(
  supabase: SupabaseClient,
  userId: string
): Promise<SystemHealthSnapshot> {
  const checks: HealthCheck[] = [];

  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  checks.push({
    id: 'runtime-config',
    label: 'Runtime configuration',
    status: configured ? 'healthy' : 'unhealthy',
    detail: configured ? 'Supabase public runtime variables are configured.' : 'Required Supabase runtime variables are missing.',
  });

  const profileProbe = await timed(() =>
    supabase.from('profiles').select('id,role').eq('id', userId).maybeSingle()
  );
  checks.push({
    id: 'database',
    label: 'Supabase database',
    status: profileProbe.value.error ? 'unhealthy' : 'healthy',
    detail: profileProbe.value.error ? `Database query failed: ${profileProbe.value.error.code ?? 'unknown'}.` : 'Authenticated database query succeeded.',
    latencyMs: profileProbe.latencyMs,
  });

  const participantProbe = await timed(() =>
    supabase.from('investment_participant_profiles').select('investment_role').eq('user_id', userId).maybeSingle()
  );
  checks.push({
    id: 'investment-schema',
    label: 'Investment core schema',
    status: participantProbe.value.error
      ? (isMissingSchema(participantProbe.value.error) ? 'pending_schema' : 'degraded')
      : 'healthy',
    detail: participantProbe.value.error
      ? (isMissingSchema(participantProbe.value.error) ? 'Investment schema is not yet available in this environment.' : `Investment profile probe returned ${participantProbe.value.error.code ?? 'an error'}.`)
      : 'Investment participant schema is reachable.',
    latencyMs: participantProbe.latencyMs,
  });

  const productionProbe = await timed(() =>
    supabase.from('investment_production_lots').select('id').limit(1)
  );
  checks.push({
    id: 'migration-0009',
    label: 'Migration 0009 · Production Traceability OS',
    status: productionProbe.value.error
      ? (isMissingSchema(productionProbe.value.error) ? 'pending_schema' : 'degraded')
      : 'healthy',
    detail: productionProbe.value.error
      ? (isMissingSchema(productionProbe.value.error) ? 'Production tables are not installed yet.' : `Production schema probe returned ${productionProbe.value.error.code ?? 'an error'}.`)
      : 'Production lot schema is available.',
    latencyMs: productionProbe.latencyMs,
  });

  const rbacProbe = await timed(() => supabase.rpc('get_investment_role'));
  checks.push({
    id: 'migration-0010',
    label: 'Migration 0010 · Investment RBAC',
    status: rbacProbe.value.error
      ? (isMissingSchema(rbacProbe.value.error) ? 'pending_schema' : 'degraded')
      : 'healthy',
    detail: rbacProbe.value.error
      ? (isMissingSchema(rbacProbe.value.error) ? 'RBAC functions are not installed yet.' : `RBAC probe returned ${rbacProbe.value.error.code ?? 'an error'}.`)
      : `RBAC function available; active role: ${String(rbacProbe.value.data ?? 'unknown')}.`,
    latencyMs: rbacProbe.latencyMs,
  });

  const roleAdminProbe = await timed(() => supabase.rpc('list_investment_role_assignments'));
  checks.push({
    id: 'migration-0011',
    label: 'Migration 0011 · Role administration',
    status: roleAdminProbe.value.error
      ? (isMissingSchema(roleAdminProbe.value.error) ? 'pending_schema' : 'degraded')
      : 'healthy',
    detail: roleAdminProbe.value.error
      ? (isMissingSchema(roleAdminProbe.value.error) ? 'Role administration RPCs are not installed yet.' : `Role administration probe returned ${roleAdminProbe.value.error.code ?? 'an error'}.`)
      : 'SUPER_ADMIN role administration RPC is available.',
    latencyMs: roleAdminProbe.latencyMs,
  });

  checks.push({
    id: 'migration-0012',
    label: 'Migration 0012 · Core permission guards',
    status: rbacProbe.value.error || roleAdminProbe.value.error ? 'pending_schema' : 'degraded',
    detail: rbacProbe.value.error || roleAdminProbe.value.error
      ? 'Prerequisite RBAC migrations are not fully available.'
      : 'Prerequisites are available. Trigger-level enforcement cannot be proven safely through a read-only health probe; verify 0012 in Supabase migration history.',
  });

  const beerStyleProbe = await timed(() =>
    supabase.from('investment_beer_styles').select('id,code,name,units_per_case,active').eq('active', true).limit(4)
  );
  const beerStyleCodes = beerStyleProbe.value.error
    ? []
    : (beerStyleProbe.value.data ?? []).map((row) => String(row.code)).sort();
  const expectedBeerStyleCodes = ['GOLD', 'HEF', 'IRA', 'POR'];
  const canonicalStylesAvailable = expectedBeerStyleCodes.every((code) => beerStyleCodes.includes(code));

  checks.push({
    id: 'migration-0013',
    label: 'Migration 0013 · Beer Style Master Data',
    status: beerStyleProbe.value.error
      ? (isMissingSchema(beerStyleProbe.value.error) ? 'pending_schema' : 'degraded')
      : (canonicalStylesAvailable ? 'healthy' : 'degraded'),
    detail: beerStyleProbe.value.error
      ? (isMissingSchema(beerStyleProbe.value.error)
          ? 'Beer Style Master Data is not installed in this environment yet.'
          : `Beer Style Master Data probe returned ${beerStyleProbe.value.error.code ?? 'an error'}.`)
      : canonicalStylesAvailable
        ? 'Master catalog is available with GOLD, HEF, IRA and POR. Lot-code creation remains database-authoritative through migration 0013.'
        : `Master catalog is reachable but canonical styles are incomplete. Found: ${beerStyleCodes.join(', ') || 'none'}.`,
    latencyMs: beerStyleProbe.latencyMs,
  });

  const salesChannelsProbe = await timed(() =>
    supabase.from('investment_sales_channels').select('code,name,active').eq('active', true).limit(10)
  );
  const salesProbe = await timed(() =>
    supabase.from('investment_sales').select('id').limit(1)
  );
  const salesCodes = salesChannelsProbe.value.error
    ? []
    : (salesChannelsProbe.value.data ?? []).map((row) => String(row.code));
  const expectedSalesCodes = ['PISAO', 'DIRECT', 'DISTRIBUTOR', 'RESTAURANT_PARTNER', 'EVENT', 'RETAIL', 'OTHER'];
  const canonicalSalesChannelsAvailable = expectedSalesCodes.every((code) => salesCodes.includes(code));
  const salesSchemaError = salesChannelsProbe.value.error ?? salesProbe.value.error;

  checks.push({
    id: 'migration-0014',
    label: 'Migration 0014 · Sales OS Foundation',
    status: salesSchemaError
      ? (isMissingSchema(salesSchemaError) ? 'pending_schema' : 'degraded')
      : (canonicalSalesChannelsAvailable ? 'healthy' : 'degraded'),
    detail: salesSchemaError
      ? (isMissingSchema(salesSchemaError)
          ? 'Normalized Sales OS tables are not installed in this environment yet.'
          : `Sales OS probe returned ${salesSchemaError.code ?? 'an error'}.`)
      : canonicalSalesChannelsAvailable
        ? 'Sales documents, sale items and canonical sales channels are available. Write-path activation is verified separately after migration installation.'
        : `Sales OS is reachable but canonical channel master data is incomplete. Found: ${salesCodes.join(', ') || 'none'}.`,
    latencyMs: salesChannelsProbe.latencyMs + salesProbe.latencyMs,
  });

  const summary = checks.reduce(
    (acc, check) => {
      if (check.status === 'healthy') acc.healthy += 1;
      else if (check.status === 'degraded') acc.degraded += 1;
      else if (check.status === 'unhealthy') acc.unhealthy += 1;
      else acc.pendingSchema += 1;
      return acc;
    },
    { healthy: 0, degraded: 0, unhealthy: 0, pendingSchema: 0 }
  );

  const status: SystemHealthSnapshot['status'] = summary.unhealthy > 0
    ? 'unhealthy'
    : summary.degraded > 0 || summary.pendingSchema > 0
      ? 'degraded'
      : 'healthy';

  return { status, checkedAt: new Date().toISOString(), checks, summary };
}
