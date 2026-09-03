import fs from 'node:fs';
import path from 'node:path';

await import('./test-wallet-provider-readiness-operations-invariants.mjs');

const root = process.cwd();
const migrationPath = path.join(
  root,
  'supabase/migrations/20260829231000_0076_wallet_identity_bridge.sql'
);
const architecturePath = path.join(root, 'docs/CTG_ONE_WALLET_UNIFICATION.md');
const domainPath = path.join(root, 'src/lib/wallet/domain.ts');
const corsPath = path.join(root, 'src/lib/wallet/cors.ts');

for (const file of [migrationPath, architecturePath, domainPath, corsPath]) {
  if (!fs.existsSync(file)) {
    throw new Error(`wallet unification invariant file missing: ${path.relative(root, file)}`);
  }
}

const migration = fs.readFileSync(migrationPath, 'utf8');
const architecture = fs.readFileSync(architecturePath, 'utf8');
const domain = fs.readFileSync(domainPath, 'utf8');
const cors = fs.readFileSync(corsPath, 'utf8');

const requiredMigrationFragments = [
  'create table public.wallet_identity_links',
  'user_id uuid not null references public.profiles(id)',
  "provider text not null check (provider in ('privy'))",
  'unique (user_id, provider)',
  'unique (provider, provider_user_id)',
  'constraint wallet_identity_links_id_user_unique unique (id, user_id)',
  'alter table public.wallet_identity_links enable row level security',
  'create policy wallet_identity_links_read_own',
  'using (user_id = auth.uid())',
  'revoke insert, update, delete, truncate, references, trigger',
  'on public.wallet_identity_links from authenticated',
  'create table public.wallet_external_accounts',
  "chain_family text not null check (chain_family in ('evm','bitcoin'))",
  'constraint wallet_external_accounts_identity_link_user_fk',
  'foreign key (identity_link_id, user_id)',
  'references public.wallet_identity_links(id, user_id)',
  'constraint wallet_external_accounts_chain_address_unique',
  'unique (chain_family, address_normalized)',
  'alter table public.wallet_external_accounts enable row level security',
  'create policy wallet_external_accounts_read_own',
  'on public.wallet_external_accounts from authenticated',
  'wallet_external_accounts_one_primary_per_family',
];

for (const fragment of requiredMigrationFragments) {
  if (!migration.includes(fragment)) {
    throw new Error(`wallet identity migration missing invariant fragment: ${fragment}`);
  }
}

const forbiddenMigrationFragments = [
  'grant insert on public.wallet_identity_links to authenticated',
  'grant update on public.wallet_identity_links to authenticated',
  'grant delete on public.wallet_identity_links to authenticated',
  'grant insert on public.wallet_external_accounts to authenticated',
  'grant update on public.wallet_external_accounts to authenticated',
  'grant delete on public.wallet_external_accounts to authenticated',
];

for (const fragment of forbiddenMigrationFragments) {
  if (migration.includes(fragment)) {
    throw new Error(`wallet identity migration weakens trusted boundary: ${fragment}`);
  }
}

const requiredArchitectureFragments = [
  'Supabase auth.users.id',
  'public.profiles.id',
  'A Privy user is an **external wallet identity attached to the CTG user**',
  'Zustand/localStorage',
  'No wallet should be replaced silently.',
  'Investment release governance remains tracked separately in #219.',
];

for (const fragment of requiredArchitectureFragments) {
  if (!architecture.includes(fragment)) {
    throw new Error(`wallet architecture missing canonical boundary: ${fragment}`);
  }
}

const requiredDomainFragments = [
  "export const CANONICAL_WALLET_IDENTITY = 'supabase-profile' as const",
  "export type WalletIdentityProvider = 'privy'",
  "export type WalletChainFamily = 'evm' | 'bitcoin'",
  "return chainFamily === 'evm' ? trimmed.toLowerCase() : trimmed",
  "return linkMode === 'legacy_preserve'",
];

for (const fragment of requiredDomainFragments) {
  if (!domain.includes(fragment)) {
    throw new Error(`wallet domain missing invariant fragment: ${fragment}`);
  }
}

const requiredCorsFragments = [
  "const PRODUCTION_WALLET_ORIGINS = new Set([",
  "'https://wallet.ctgone.com'",
  "'https://ctg-one-wallet.vercel.app'",
  '...PRODUCTION_WALLET_ORIGINS',
  'process.env.CTG_WALLET_ALLOWED_ORIGINS',
  "headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, Privy-ID-Token')",
];

for (const fragment of requiredCorsFragments) {
  if (!cors.includes(fragment)) {
    throw new Error(`wallet CORS boundary missing canonical production invariant: ${fragment}`);
  }
}

if (cors.includes("headers.set('Access-Control-Allow-Origin', '*')")) {
  throw new Error('wallet CORS boundary must never allow wildcard origins');
}

console.log('Wallet unification invariants: OK');
