import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

import { formatTraceparent, getRequestObservabilityContext } from '@/lib/observability/request-context';
import { logger } from '@/lib/observability/logger';
import {
  createAdminClient,
  isSupabaseConfigured,
} from '@/lib/supabase/server';
import {
  WalletChainReconciliationError,
} from '@/lib/wallet/chain-reconciliation';
import {
  normalizeWalletChainIntentSnapshot,
  reconcileWalletChainIntentV1,
  WALLET_CHAIN_INTENT_SELECT,
  WALLET_CHAIN_RECONCILABLE_STATUSES,
  WalletChainPersistenceError,
} from '@/lib/wallet/chain-reconciliation-service';

export const dynamic = 'force-dynamic';

const WORKER_VERSION = 'ctg-wallet-chain-worker-v1' as const;
const MAX_BODY_BYTES = 256;
const DEFAULT_BATCH_SIZE = 10;
const MAX_BATCH_SIZE = 25;
const DEFAULT_STUCK_AFTER_SECONDS = 15 * 60;
const MIN_STUCK_AFTER_SECONDS = 5 * 60;
const MAX_STUCK_AFTER_SECONDS = 24 * 60 * 60;
const ALLOWED_BODY_KEYS = new Set(['version']);

type WorkerCounts = {
  scanned: number;
  pendingExternal: number;
  confirmedExternal: number;
  reconciled: number;
  failed: number;
  invalid: number;
  errors: number;
  stuck: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validBody(value: unknown) {
  return isRecord(value)
    && !Object.keys(value).some((key) => !ALLOWED_BODY_KEYS.has(key))
    && value.version === WORKER_VERSION;
}

function boundedInteger(
  raw: string | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

function configuredBatchSize() {
  return boundedInteger(
    process.env.WALLET_CHAIN_WORKER_BATCH_SIZE,
    DEFAULT_BATCH_SIZE,
    1,
    MAX_BATCH_SIZE,
  );
}

function configuredStuckAfterSeconds() {
  return boundedInteger(
    process.env.WALLET_CHAIN_STUCK_AFTER_SECONDS,
    DEFAULT_STUCK_AFTER_SECONDS,
    MIN_STUCK_AFTER_SECONDS,
    MAX_STUCK_AFTER_SECONDS,
  );
}

function workerSecretState(request: Request): 'unconfigured' | 'authorized' | 'unauthorized' {
  const expected = process.env.WALLET_CHAIN_RECONCILIATION_WORKER_SECRET?.trim() ?? '';
  if (expected.length < 32) return 'unconfigured';

  const supplied = request.headers.get('x-ctg-wallet-worker-secret')?.trim() ?? '';
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  if (expectedBytes.length !== suppliedBytes.length) return 'unauthorized';

  return timingSafeEqual(expectedBytes, suppliedBytes) ? 'authorized' : 'unauthorized';
}

function intentFingerprint(intentId: string) {
  return createHash('sha256').update(intentId).digest('hex').slice(0, 16);
}

function ageSeconds(iso: string, nowMs: number) {
  const submittedMs = Date.parse(iso);
  if (!Number.isFinite(submittedMs)) return null;
  return Math.max(0, Math.floor((nowMs - submittedMs) / 1000));
}

function responseWithContext(
  request: Request,
  body: unknown,
  init: ResponseInit = {},
) {
  const context = getRequestObservabilityContext(request);
  const headers = new Headers(init.headers);
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('X-Request-ID', context.request_id);
  headers.set('traceparent', formatTraceparent(context));
  return NextResponse.json(body, { ...init, headers });
}

export async function POST(request: Request) {
  const context = getRequestObservabilityContext(request);
  const startedAt = Date.now();

  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return responseWithContext(
      request,
      { error: 'WALLET_CHAIN_WORKER_UNAVAILABLE' },
      { status: 503 },
    );
  }

  const secretState = workerSecretState(request);
  if (secretState === 'unconfigured') {
    return responseWithContext(
      request,
      { error: 'WALLET_CHAIN_WORKER_NOT_CONFIGURED' },
      { status: 503 },
    );
  }
  if (secretState !== 'authorized') {
    logger.warn('wallet.chain.worker.unauthorized', context);
    return responseWithContext(
      request,
      { error: 'UNAUTHORIZED' },
      { status: 401 },
    );
  }

  const contentType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
  if (contentType !== 'application/json') {
    return responseWithContext(request, { error: 'WALLET_CHAIN_WORKER_CONTENT_TYPE_INVALID' }, { status: 415 });
  }

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return responseWithContext(request, { error: 'WALLET_CHAIN_WORKER_BODY_TOO_LARGE' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return responseWithContext(request, { error: 'WALLET_CHAIN_WORKER_BODY_INVALID' }, { status: 400 });
  }
  if (!validBody(body)) {
    return responseWithContext(request, { error: 'WALLET_CHAIN_WORKER_REQUEST_INVALID' }, { status: 400 });
  }

  const admin = createAdminClient();
  const batchSize = configuredBatchSize();
  const stuckAfterSeconds = configuredStuckAfterSeconds();

  const { data: candidates, error: candidateError } = await admin
    .from('wallet_intents_v2')
    .select(WALLET_CHAIN_INTENT_SELECT)
    .in('status', [...WALLET_CHAIN_RECONCILABLE_STATUSES])
    .not('tx_hash', 'is', null)
    .order('chain_last_checked_at', { ascending: true, nullsFirst: true })
    .order('submitted_at', { ascending: true })
    .limit(batchSize);

  if (candidateError) {
    logger.error('wallet.chain.worker.read_failed', {
      ...context,
      duration_ms: Date.now() - startedAt,
    });
    return responseWithContext(
      request,
      { error: 'WALLET_CHAIN_WORKER_READ_FAILED' },
      { status: 503 },
    );
  }

  const rows = candidates ?? [];
  const counts: WorkerCounts = {
    scanned: rows.length,
    pendingExternal: 0,
    confirmedExternal: 0,
    reconciled: 0,
    failed: 0,
    invalid: 0,
    errors: 0,
    stuck: 0,
  };
  const errorsByCode = new Map<string, number>();
  let oldestSubmittedAgeSeconds = 0;
  const nowMs = Date.now();

  for (const rawIntent of rows) {
    const intent = normalizeWalletChainIntentSnapshot(rawIntent);
    if (!intent) {
      counts.invalid += 1;
      logger.error('wallet.chain.worker.invalid_intent_shape', context);
      continue;
    }

    const submittedAgeSeconds = ageSeconds(intent.submitted_at, nowMs) ?? 0;
    oldestSubmittedAgeSeconds = Math.max(oldestSubmittedAgeSeconds, submittedAgeSeconds);
    const fingerprint = intentFingerprint(intent.id);

    try {
      const result = await reconcileWalletChainIntentV1(admin, intent);
      const nextStatus = result.record.status;

      if (nextStatus === 'pending_external') counts.pendingExternal += 1;
      else if (nextStatus === 'confirmed_external') counts.confirmedExternal += 1;
      else if (nextStatus === 'reconciled') counts.reconciled += 1;
      else if (nextStatus === 'failed') counts.failed += 1;
      else counts.errors += 1;

      if (
        (nextStatus === 'pending_external' || nextStatus === 'confirmed_external')
        && submittedAgeSeconds >= stuckAfterSeconds
      ) {
        counts.stuck += 1;
        logger.warn('wallet.chain.worker.stuck_intent', {
          ...context,
          intent_fingerprint: fingerprint,
          prior_status: intent.status,
          observed_status: nextStatus,
          submitted_age_seconds: submittedAgeSeconds,
          confirmations: result.observation.confirmations,
        });
      } else {
        logger.info('wallet.chain.worker.intent_observed', {
          ...context,
          intent_fingerprint: fingerprint,
          prior_status: intent.status,
          observed_status: nextStatus,
          submitted_age_seconds: submittedAgeSeconds,
          confirmations: result.observation.confirmations,
        });
      }
    } catch (error) {
      counts.errors += 1;
      if (submittedAgeSeconds >= stuckAfterSeconds) counts.stuck += 1;

      const code = error instanceof WalletChainReconciliationError
        ? error.code
        : error instanceof WalletChainPersistenceError
          ? error.code
          : 'WALLET_CHAIN_WORKER_UNEXPECTED_FAILURE';
      errorsByCode.set(code, (errorsByCode.get(code) ?? 0) + 1);

      logger.error('wallet.chain.worker.intent_failed', {
        ...context,
        intent_fingerprint: fingerprint,
        prior_status: intent.status,
        submitted_age_seconds: submittedAgeSeconds,
        error_code: code,
      });
    }
  }

  const summary = {
    version: WORKER_VERSION,
    requestId: context.request_id,
    batchSize,
    stuckAfterSeconds,
    counts,
    oldestSubmittedAgeSeconds,
    errorsByCode: Object.fromEntries(errorsByCode),
    durationMs: Date.now() - startedAt,
  };

  logger.info('wallet.chain.worker.completed', {
    ...context,
    batch_size: batchSize,
    stuck_after_seconds: stuckAfterSeconds,
    counts,
    oldest_submitted_age_seconds: oldestSubmittedAgeSeconds,
    errors_by_code: summary.errorsByCode,
    duration_ms: summary.durationMs,
  });

  return responseWithContext(request, summary);
}
