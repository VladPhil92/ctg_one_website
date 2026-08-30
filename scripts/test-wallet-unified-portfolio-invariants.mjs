import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pagePath = path.join(root, 'src/app/dashboard/wallet/page.tsx');

if (!fs.existsSync(pagePath)) {
  throw new Error('canonical wallet dashboard page is missing');
}

const page = fs.readFileSync(pagePath, 'utf8');

for (const fragment of [
  "fetch('/api/wallet/overview'",
  "credentials: 'same-origin'",
  "cache: 'no-store'",
  'WALLET_OVERVIEW_VERSION',
  'WalletOverviewV2',
  'overview.balance.availableBalanceCents',
  'overview?.blockchain?.positions',
  'overview?.activity.slice(0, 20)',
  "overview?.identity?.status === 'verified'",
  "account.chainFamily === 'evm'",
  "account.status === 'verified'",
  'account.isPrimary',
  "router.replace('/iniciar-sesion?next=/dashboard/wallet')",
  'Esta fase es de lectura',
]) {
  if (!page.includes(fragment)) {
    throw new Error(`wallet unified portfolio page missing invariant fragment: ${fragment}`);
  }
}

for (const forbidden of [
  "method: 'POST'",
  "method: 'PUT'",
  "method: 'PATCH'",
  "method: 'DELETE'",
  'sendTransaction',
  'writeContract',
  'signTransaction',
  'privateKey',
  '.insert(',
  '.update(',
  '.upsert(',
  '.delete(',
]) {
  if (page.includes(forbidden)) {
    throw new Error(`wallet unified portfolio must remain read-only: ${forbidden}`);
  }
}

if (/total(?:Portfolio|Balance|Value)|patrimonioTotal|portfolioValue/i.test(page)) {
  throw new Error('wallet unified portfolio must not invent a commingled cross-authority valuation');
}

console.log('Wallet unified portfolio/history invariants: PASS');
