import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = {
  migration: path.join(root, 'supabase/migrations/20260906173817_0113_investment_financial_server_boundaries.sql'),
  route: path.join(root, 'src/app/api/investment/admin/financial-control/route.ts'),
  server: path.join(root, 'src/lib/supabase/server.ts'),
  schema: path.join(root, 'src/lib/observability/schema-version.ts'),
};

for (const [label, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) {
    throw new Error(`Investment financial privilege ${label} file missing: ${path.relative(root, file)}`);
  }
}

const source = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, fs.readFileSync(file, 'utf8')]),
);

function requireFragments(text, label, fragments) {
  for (const fragment of fragments) {
    if (!text.includes(fragment)) {
      throw new Error(`${label} missing invariant fragment: ${fragment}`);
    }
  }
}

const wrappers = [
  'approve_withdrawal_server',
  'reject_withdrawal_server',
  'set_investment_user_role_server',
  'verify_investment_bancolombia_transfer_server',
  'verify_investment_crypto_transfer_server',
  'initiate_investment_payout_server',
  'confirm_investment_payout_server',
  'fail_investment_payout_server',
];

requireFragments(source.migration, 'financial server-boundary migration', [
  'create or replace function public._assert_investment_server_actor(',
  "set search_path = ''",
  "perform set_config('request.jwt.claim.sub', p_actor_user_id::text, true);",
  "public.get_investment_role() <> 'SUPER_ADMIN'",
  'not public.is_investment_admin()',
  'not public.has_investment_permission(p_required_permission)',
  "raise exception 'INVESTMENT_ACTOR_FORBIDDEN'",
  'revoke all on function public._assert_investment_server_actor(uuid, text, boolean, boolean)',
  'from public, anon, authenticated, service_role;',
]);

for (const wrapper of wrappers) {
  requireFragments(source.migration, `financial wrapper ${wrapper}`, [
    `create or replace function public.${wrapper}(`,
    'security definer',
    "set search_path = ''",
    `grant execute on function public.${wrapper}`,
    'to service_role;',
  ]);
}

const directClientRevokeSignatures = [
  'public.approve_withdrawal_server(uuid, uuid) from public, anon, authenticated;',
  'public.reject_withdrawal_server(uuid, uuid, text) from public, anon, authenticated;',
  'public.set_investment_user_role_server(uuid, uuid, text) from public, anon, authenticated;',
  'public.verify_investment_bancolombia_transfer_server(uuid, uuid, text, bigint, timestamptz, text) from public, anon, authenticated;',
  'public.verify_investment_crypto_transfer_server(uuid, uuid, text, text, bigint, timestamptz, text) from public, anon, authenticated;',
  'public.initiate_investment_payout_server(uuid, uuid, text, text, text, text, text, text) from public, anon, authenticated;',
  'public.confirm_investment_payout_server(uuid, uuid, text, timestamptz, text) from public, anon, authenticated;',
  'public.fail_investment_payout_server(uuid, uuid, text, text) from public, anon, authenticated;',
];
for (const signature of directClientRevokeSignatures) {
  if (!source.migration.includes(`revoke all on function ${signature}`)) {
    throw new Error(`financial wrapper is not revoked from direct client execution: ${signature}`);
  }
}

requireFragments(source.route, 'financial control API', [
  'createAuthenticatedRequestContext(request)',
  'createAdminClient()',
  "context.supabase.rpc('get_investment_role')",
  "context.supabase.rpc('is_investment_admin')",
  "context.supabase.rpc('has_investment_permission'",
  "p_permission: 'finance.manage'",
  'p_actor_user_id: context.user.id',
  "'Cache-Control': 'no-store'",
  "{ error: 'financial operation rejected' }",
]);

for (const wrapper of wrappers) {
  if (!source.route.includes(`'${wrapper}'`)) {
    throw new Error(`financial control API does not route through server-only RPC: ${wrapper}`);
  }
}

for (const operation of [
  'withdrawal.approve',
  'withdrawal.reject',
  'role.set',
  'funding.verifyBankTransfer',
  'funding.verifyCryptoTransfer',
  'payout.initiate',
  'payout.confirm',
  'payout.fail',
]) {
  if (!source.route.includes(`z.literal('${operation}')`)) {
    throw new Error(`financial control API missing operation contract: ${operation}`);
  }
}

if (source.route.includes('NextResponse.json({ error: error.message')) {
  throw new Error('financial control API exposes raw database error messages');
}
if (source.route.includes('return noStoreJson({ error: error.message')) {
  throw new Error('financial control API exposes raw database error messages');
}

requireFragments(source.server, 'server trust-boundary primitives', [
  'export async function createAuthenticatedRequestContext(',
  'export function createAdminClient()',
  'SUPABASE_SERVICE_ROLE_KEY',
]);

const schemaMigration = /EXPECTED_DATABASE_MIGRATION\s*=\s*['"](\d{4})['"]/.exec(source.schema);
const schemaCount = /EXPECTED_DATABASE_MIGRATION_COUNT\s*=\s*(\d+)/.exec(source.schema);
const schemaName = /EXPECTED_DATABASE_MIGRATION_NAME\s*=\s*['"]([^'"]+)['"]/.exec(source.schema);
if (!schemaMigration || Number(schemaMigration[1]) < 113) {
  throw new Error('runtime schema contract must include financial server boundaries through 0113');
}
if (!schemaCount || Number(schemaCount[1]) < 113) {
  throw new Error('runtime schema migration count must include 0113');
}
if (!schemaName || schemaName[1] !== 'investment_financial_server_boundaries') {
  throw new Error('runtime schema name must identify the 0113 financial server boundary');
}

console.log('Investment financial privilege boundary invariants: PASS');
