import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const runbook = fs.readFileSync(path.join(root, 'docs', 'infrastructure', 'BACKUP_RESTORE.md'), 'utf8');
const envExample = fs.readFileSync(path.join(root, '.env.local.example'), 'utf8');
const lower = runbook.toLowerCase();

for (const required of [
  'database data recovery: unverified',
  'storage object recovery: unverified',
  'schema reconstruction: verified in ci',
  'rpo',
  'rto',
  'restore rehearsal',
  'storage',
  'forward corrective migration',
]) {
  if (!lower.includes(required)) {
    throw new Error(`Recovery runbook missing required invariant: ${required}`);
  }
}

for (const flag of [
  'CTG_INVESTMENT_PUBLIC_FUNDING_ENABLED=false',
  'CTG_INVESTMENT_AUTOMATIC_SETTLEMENT_ENABLED=false',
  'CTG_INVESTMENT_AUTOMATIC_WITHDRAWALS_ENABLED=false',
  'CTG_INVESTMENT_PAYMENT_GATEWAY_ENABLED=false',
]) {
  if (!envExample.includes(flag)) {
    throw new Error(`Recovery-sensitive capability must default fail-closed: ${flag}`);
  }
}

if (/CTG_INVESTMENT_(PUBLIC_FUNDING|AUTOMATIC_SETTLEMENT|AUTOMATIC_WITHDRAWALS|PAYMENT_GATEWAY)_ENABLED=true/.test(envExample)) {
  throw new Error('Recovery-sensitive investment capability defaults must never be enabled in the example environment.');
}

console.log('Recovery readiness invariants passed.');
