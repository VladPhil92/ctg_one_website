import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const render = fs.readFileSync(path.join(root, 'render.yaml'), 'utf8');
const example = fs.readFileSync(path.join(root, '.env.local.example'), 'utf8');

const externallyProvisionedKeys = [
  'NEXT_PUBLIC_PRIVY_APP_ID',
  'PRIVY_JWT_VERIFICATION_KEY',
  'PRIVY_APP_SECRET',
  'POLYGON_RPC_URL',
  'CTG_TOKEN_POLYGON_ADDRESS',
  'WALLET_CRYPTO_SEND_CANARY_USER_IDS',
  'WALLET_CHAIN_RECONCILIATION_WORKER_SECRET',
];

function envBlockFor(key) {
  const marker = `      - key: ${key}\n`;
  const start = render.indexOf(marker);
  if (start < 0) return null;

  const next = render.indexOf('      - key: ', start + marker.length);
  return render.slice(start, next < 0 ? render.length : next);
}

for (const key of externallyProvisionedKeys) {
  if (!example.includes(`${key}=`)) {
    throw new Error(`wallet runtime env missing from .env.local.example: ${key}`);
  }

  const block = envBlockFor(key);
  if (!block) {
    throw new Error(`wallet runtime env missing from render.yaml: ${key}`);
  }
  if (!/^\s*sync:\s*false\s*$/m.test(block)) {
    throw new Error(`wallet runtime env must be declared sync:false in render.yaml: ${key}`);
  }
  if (/^\s*value\s*:/m.test(block)) {
    throw new Error(`wallet runtime env must not commit a production value: ${key}`);
  }
}

const executionModeKey = 'WALLET_CRYPTO_SEND_EXECUTION_MODE';
if (!example.includes(`${executionModeKey}=disabled`)) {
  throw new Error(`${executionModeKey} must default to disabled in .env.local.example`);
}

const executionModeBlock = envBlockFor(executionModeKey);
if (!executionModeBlock) {
  throw new Error(`${executionModeKey} missing from render.yaml`);
}
if (!/^\s*value:\s*["']?disabled["']?\s*$/m.test(executionModeBlock)) {
  throw new Error(`${executionModeKey} must be pinned to the fail-closed disabled default in render.yaml`);
}
if (/^\s*sync:\s*false\s*$/m.test(executionModeBlock)) {
  throw new Error(`${executionModeKey} must not rely on an unset external value for its fail-closed default`);
}

for (const serverOnlyKey of [
  'PRIVY_JWT_VERIFICATION_KEY',
  'PRIVY_APP_SECRET',
  'POLYGON_RPC_URL',
  'CTG_TOKEN_POLYGON_ADDRESS',
  'WALLET_CRYPTO_SEND_EXECUTION_MODE',
  'WALLET_CRYPTO_SEND_CANARY_USER_IDS',
  'WALLET_CHAIN_RECONCILIATION_WORKER_SECRET',
]) {
  if (serverOnlyKey.startsWith('NEXT_PUBLIC_') || serverOnlyKey.startsWith('VITE_')) {
    throw new Error(`server-only wallet configuration is browser-public: ${serverOnlyKey}`);
  }
}

console.log('Wallet runtime environment invariants: PASS');
