import { appendFile, mkdir, writeFile } from 'node:fs/promises';
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

function readinessCode(result) {
  return result?.body?.check?.code || null;
}

function classifyDiagnostic(result) {
  const code = readinessCode(result);
  if (code === 'PRIVY_USER_REGISTRY_NOT_CONFIGURED') {
    return {
      category: 'runtime_configuration',
      code,
      requiredRuntimeConfiguration: [
        'NEXT_PUBLIC_PRIVY_APP_ID (or PRIVY_APP_ID)',
        'PRIVY_APP_SECRET',
      ],
      remediation: 'Provision the real Privy App ID and server-only App Secret directly in the Render production environment, redeploy, then rerun this canary. Never commit secret values.',
      secretValuesIncluded: false,
    };
  }

  if (code) {
    return {
      category: 'provider_unavailable_or_rejected',
      code,
      remediation: 'Inspect the bounded provider readiness code and Privy production configuration. Do not enable a fallback or bypass the ownership preflight.',
      secretValuesIncluded: false,
    };
  }

  return {
    category: 'transport_or_contract_failure',
    code: null,
    remediation: 'Inspect HTTP status, response contract, deployment health and provider reachability before changing Wallet trust boundaries.',
    secretValuesIncluded: false,
  };
}

async function persistEvidence(payload) {
  await mkdir(dirname(evidencePath), { recursive: true });
  await writeFile(evidencePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function appendGitHubSummary(diagnostic, result) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;

  const lines = [
    '### CTG Wallet provider readiness',
    '',
    `- Status: ${result?.status ?? 'transport failure'}`,
    `- Code: ${diagnostic.code ?? 'unavailable'}`,
    `- Category: ${diagnostic.category}`,
    `- Remediation: ${diagnostic.remediation}`,
    '- Secret values included in evidence: no',
    '',
  ];

  await appendFile(summaryPath, `${lines.join('\n')}\n`, 'utf8');
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
      if (readinessCode(last) === 'PRIVY_USER_REGISTRY_NOT_CONFIGURED') break;
    } catch (error) {
      last = {
        status: null,
        body: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }

    if (attempt < attempts) await sleep(intervalMs);
  }

  const diagnostic = classifyDiagnostic(last);
  const evidence = {
    version: 'ctg-wallet-provider-readiness-evidence-v1',
    checkedAt: new Date().toISOString(),
    apiOrigin,
    endpoint,
    result: last,
    diagnostic,
  };
  await persistEvidence(evidence);
  await appendGitHubSummary(diagnostic, last);

  requireCondition(last?.status === 200, 'Privy registry readiness endpoint is not healthy', {
    result: last,
    diagnostic,
  });
  requireCondition(last?.body?.version === 'ctg-wallet-provider-readiness-v1', 'Unexpected provider-readiness contract version', {
    result: last,
    diagnostic,
  });
  requireCondition(last?.body?.ready === true, 'Privy user registry is not ready', {
    result: last,
    diagnostic,
  });
  requireCondition(last?.body?.check?.ready === true, 'Privy registry child check is not ready', {
    result: last,
    diagnostic,
  });
  requireCondition(last?.body?.check?.code === 'PRIVY_USER_REGISTRY_READY', 'Unexpected Privy registry readiness code', {
    result: last,
    diagnostic,
  });
  requireCondition(
    String(last?.cacheControl || '').toLowerCase().includes('no-store'),
    'Provider readiness must be non-cacheable',
    { result: last, diagnostic },
  );

  console.log(JSON.stringify({ ok: true, endpoint, code: last.body.check.code }, null, 2));
}

main().catch(async (error) => {
  const details = error?.details ?? null;
  const diagnostic = details?.diagnostic ?? classifyDiagnostic(details?.result ?? details);
  const failure = {
    version: 'ctg-wallet-provider-readiness-evidence-v1',
    checkedAt: new Date().toISOString(),
    apiOrigin,
    endpoint,
    ok: false,
    message: error instanceof Error ? error.message : String(error),
    details,
    diagnostic,
  };
  try {
    await persistEvidence(failure);
    await appendGitHubSummary(diagnostic, details?.result ?? details);
  } catch {
    // Preserve the original canary failure.
  }
  console.error(JSON.stringify(failure, null, 2));
  process.exitCode = 1;
});
