import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const flags = await read('src/lib/investment/flags.ts');
const payments = await read('src/lib/payment-instructions.ts');
const nextConfig = await read('next.config.js');
const health = await read('src/app/api/health/route.ts');

const expectedFlags = [
  'CTG_INVESTMENT_PUBLIC_REGISTRATION_ENABLED',
  'CTG_INVESTMENT_PUBLIC_FUNDING_ENABLED',
  'CTG_INVESTMENT_PAYMENT_GATEWAY_ENABLED',
  'CTG_INVESTMENT_AUTOMATIC_SETTLEMENT_ENABLED',
  'CTG_INVESTMENT_AUTOMATIC_WITHDRAWALS_ENABLED',
  'CTG_INVESTMENT_KYC_PROVIDER_ENABLED',
  'CTG_INVESTMENT_WHATSAPP_NOTIFICATIONS_ENABLED',
];

assert.match(
  flags,
  /process\.env\[name\]\s*===\s*['"]true['"]/,
  'Investment feature flags must fail closed unless explicitly set to true.'
);

for (const name of expectedFlags) {
  assert.ok(flags.includes(name), `Missing required investment safety flag: ${name}`);
}

assert.ok(
  payments.includes("const PENDING = 'PENDING_CONFIGURATION'"),
  'Payment instructions must retain an explicit pending sentinel.'
);
assert.ok(
  payments.includes('PAYMENT_INSTRUCTIONS_CONFIGURED'),
  'Payment instructions must expose a derived fail-closed safety switch.'
);
assert.ok(
  payments.includes('.every(configured)'),
  'Payment channels must require every displayed value to be configured.'
);

for (const header of [
  'X-Content-Type-Options',
  'X-Frame-Options',
  'Referrer-Policy',
  'Permissions-Policy',
  'Cross-Origin-Opener-Policy',
]) {
  assert.ok(nextConfig.includes(header), `Missing baseline security header: ${header}`);
}

assert.ok(
  health.includes("'Cache-Control': 'no-store, max-age=0'"),
  'Health responses must not be cached.'
);
assert.ok(
  !health.includes('SUPABASE_SERVICE_ROLE_KEY'),
  'Health endpoint must never expose or inspect the Supabase service-role secret.'
);

console.log('Critical invariants: PASS');
