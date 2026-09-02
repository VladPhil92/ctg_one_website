import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const healthUrl = process.env.HEALTH_URL || 'https://ctgone.com/api/health';
const apiOrigin = process.env.WALLET_API_ORIGIN || new URL(healthUrl).origin;
const endpoint = new URL('/api/wallet/identity/provider-readiness', apiOrigin).toString();
const requestTimeoutMs = Number(process.env.WALLET_PROVIDER_READINESS_TIMEOUT_MS || '10000');
const attempts = Number(process.env.WALLET_PROVIDER_READINESS_ATTEMPTS || '3');
const intervalMs = Number(process.env.WALLET_PROVIDER_READINESS_INTERVAL_MS || '5000');
const evidencePath = process.env.WALLET_PROVIDER_READINESS_EVIDENCE_PATH
  || 'canary-evidence/wallet-provider-readiness.json';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function requireCondition(condition, message, details = {}) {
  if (condition) return;
  const error = new Error(message);
  error.details = details;
  throw error;
}

async function persistEvidence(payload) {
  await mkdir(dirname(evidencePath), { recursive: true });
  await writeFile(evidencePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function probe() {
  const response = await fetch(endpoint, {
    method: 'GET',
    redirect: 'manual',
    signal: AbortSignal.timeout(requestTimeoutMs),
    headers: { Accept: 'application/json' },
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  return {
    status: response.status,
    cacheControl: response.headers.get('cache-control'),
    contentType: response.headers.get('content-type'),
    body,
  };
}

async function main() {
  let last = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      last = await probe();
      if (last.status === 200 && last.body?.ready === true) break;
    } catch (error) {
      last = {
        status: null,
        body: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }

    if (attempt < attempts) await sleep(intervalMs);
  }

  const evidence = {
    version: 'ctg-wallet-provider-readiness-evidence-v1',
    checkedAt: new Date().toISOString(),
    apiOrigin,
    endpoint,
    result: last,
  };
  await persistEvidence(evidence);

  requireCondition(last?.status === 200, 'Privy registry readiness endpoint is not healthy', last ?? {});
  requireCondition(last?.body?.version === 'ctg-wallet-provider-readiness-v1', 'Unexpected provider-readiness contract version', last ?? {});
  requireCondition(last?.body?.ready === true, 'Privy user registry is not ready', last ?? {});
  requireCondition(last?.body?.check?.ready === true, 'Privy registry child check is not ready', last ?? {});
  requireCondition(last?.body?.check?.code === 'PRIVY_USER_REGISTRY_READY', 'Unexpected Privy registry readiness code', last ?? {});
  requireCondition(
    String(last?.cacheControl || '').toLowerCase().includes('no-store'),
    'Provider readiness must be non-cacheable',
    last ?? {},
  );

  console.log(JSON.stringify({ ok: true, endpoint, code: last.body.check.code }, null, 2));
}

main().catch(async (error) => {
  const failure = {
    version: 'ctg-wallet-provider-readiness-evidence-v1',
    checkedAt: new Date().toISOString(),
    apiOrigin,
    endpoint,
    ok: false,
    message: error instanceof Error ? error.message : String(error),
    details: error?.details ?? null,
  };
  try {
    await persistEvidence(failure);
  } catch {
    // Preserve the original canary failure.
  }
  console.error(JSON.stringify(failure, null, 2));
  process.exitCode = 1;
});
