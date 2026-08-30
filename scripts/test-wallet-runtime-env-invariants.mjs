import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const render = fs.readFileSync(path.join(root, 'render.yaml'), 'utf8');
const example = fs.readFileSync(path.join(root, '.env.local.example'), 'utf8');

const keys = [
  'NEXT_PUBLIC_PRIVY_APP_ID',
  'PRIVY_JWT_VERIFICATION_KEY',
  'POLYGON_RPC_URL',
  'CTG_TOKEN_POLYGON_ADDRESS',
];

function envBlockFor(key) {
  const marker = `      - key: ${key}\n`;
  const start = render.indexOf(marker);
  if (start < 0) return null;

  const next = render.indexOf('      - key: ', start + marker.length);
  return render.slice(start, next < 0 ? render.length : next);
}

for (const key of keys) {
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

console.log('Wallet runtime environment invariants: PASS');
