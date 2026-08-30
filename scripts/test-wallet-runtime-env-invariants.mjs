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

for (const key of keys) {
  if (!example.includes(`${key}=`)) {
    throw new Error(`wallet runtime env missing from .env.local.example: ${key}`);
  }

  const declaration = new RegExp(`- key: ${key}\\n\\s+sync: false`);
  if (!declaration.test(render)) {
    throw new Error(`wallet runtime env must be declared sync:false in render.yaml: ${key}`);
  }

  const literalValue = new RegExp(`- key: ${key}\\n\\s+value:`);
  if (literalValue.test(render)) {
    throw new Error(`wallet runtime env must not commit a production value: ${key}`);
  }
}

console.log('Wallet runtime environment invariants: PASS');
