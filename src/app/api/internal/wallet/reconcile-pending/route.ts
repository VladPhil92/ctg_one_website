import { timingSafeEqual } from 'node:crypto';
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
import { walletIntentFingerprint } from '@/lib/wallet/lifecycle-operations';
import {
  alertKindForLifecycleStatus,
  normalizeOperationalCorrelationId,
  resolveWalletOperationalAlertsV1,
  upsertWalletOperationalAlertV1,
  WalletOperationalAlertError,
} from '@/lib/wallet/operational-alerts';

export const dynamic = 'force-dynamic';

const WORKER_VERSION = 'ctg-wallet-chain-worker-v1' as const;
const MAX_BODY_BYTES = 256;
const DEFAULT_BATCH_SIZE = 10;
const MAX_BATCH_SIZE = 25;
const DEFAULT_STUCK_AFTER_SECONDS = 15 * 60;
const MIN_STUCK_AFTER_SECONDS = 5 * 60;
const MAX_STUCK_AFTER_SECONDS = 24 * 60 * 60;
const ALLOWED_BODY_KEYS = new Set(['version']);

type TerminalLifecycleStatus = 'reconciled' | 'failed';

type WorkerCounts = {
  scanned: number;
  pendingExternal: number;
  confirmedExternal: number;
  reconciled: number;
  failed: number;
  invalid: number;
  errors: number;
  stuck: number;
  alertsOpened: number;
  alertsResolved: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function terminalLifecycleStatus(value: unknown): TerminalLifecycleStatus | null {
  return value === 'reconciled' || value === 'failed' ? value : null;
}

function validBody(value: unknown) {
  return isRecord(value)
    && !Object.keys(value).some((key) => !ALLOWED_BODY_KEYS.has(key))
    && value.version === WORKER_VERSION;
}

function boundedInteger(raw: string | undefined, fallback: number, min: number, max: number) {
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

function configuredBatchSize() {
  return boundedInteger(process.env.WALLET_CHAIN_WORKER_BATCH_SIZE, DEFAULT_BATCH_SIZE, 1, MAX_BATCH_SIZE);
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

function ageSeconds(iso: string, nowMs: number) {
  const anchorMs = Date.parse(iso);
  if (!Number.isFinite(anchorMs)) return null;
  return Math.max(0, Math.floor((nowMs - anchorMs) / 1000));
}

function responseWithContext(request: Request, body: unknown, init: ResponseInit = {}) {
  const context = getRequestObservabilityContext(request);
  const headers = new Headers(init.headers);
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('X-Request-ID', context.request_id);
  headers.set('traceparent', formatTraceparent(context));
  return NextResponse.json(body, { ...init, headers });
}

async function recoverTerminalOperationalAlerts(
  admin: ReturnType<typeof createAdminClient>,
  limit: number,
) {
  const { data: openAlerts, error: openAlertError } = await admin
    .from('wallet_chain_operational_alerts_v1')
    .select('intent_id')
    .eq('state', 'open')
    .order('last_detected_at', { ascending: true })
    .limit(limit);

  if (openAlertError) {
    throw new WalletOperationalAlertError('WALLET_OPERATIONAL_ALERT_RECOVERY_READ_FAILED');
  }

  const intentIds = [...new Set(
    (openAlerts ?? []).flatMap((row) => (
      isRecord(row) && typeof row.intent_id === 'string' ? [row.intent_id] : []
    )),
  )];
  if (intentIds.length === 0) return 0;

  const { data: intents, error: intentError } = await admin
    .from('wallet_intents_v2')
    .select('id,status')
    .in('id', intentIds);

  if (intentError) {
    throw new WalletOperationalAlertError('WALLET_OPERATIONAL_ALERT_RECOVERY_INTENT_READ_FAILED');
  }

  let resolved = 0;
  for (const row of intents ?? []) {
    if (!isRecord(row) || typeof row.id !== 'string') continue;
    const status = terminalLifecycleStatus(row.status);
    if (!status) continue;
    await resolveWalletOperationalAlertsV1(admin, row.id, status);
    resolved += 1;
  }
  return resolved;
}

export async function POST(request: Request) {
  const context = getRequestObservabilityContext(request);
  const startedAt = Date.now();

  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return responseWithContext(request, { error: 'WALLET_CHAIN_WORKER_UNAVAILABLE' }, { status: 503 });
  }

  const secretState = workerSecretState(request);
  if (secretState === 'unconfigured') {
    return responseWithContext(request, { error: 'WALLET_CHAIN_WORKER_NOT_CONFIGURED' }, { status: 503 });
  }
  if (secretState !== 'authorized') {
    logger.warn('wallet.chain.worker.unauthorized', context);
    return responseWithContext(request, { error: 'UNAUTHORIZED' }, { status: 401 });
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
    .select(`${WALLET_CHAIN_INTENT_SELECT},chain_confirmed_at,operational_correlation_id`)
    .in('status', [...WALLET_CHAIN_RECONCILABLE_STATUSES])
    .not('tx_hash', 'is', null)
    .order('chain_last_checked_at', { ascending: true, nullsFirst: true })
    .order('submitted_at', { ascending: true })
    .limit(batchSize);

  if (candidateError) {
    logger.error('wallet.chain.worker.read_failed', { ...context, duration_ms: Date.now() - startedAt });
    return responseWithContext(request, { error: 'WALLET_CHAIN_WORKER_READ_FAILED' }, { status: 503 });
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
    alertsOpened: 0,
    alertsResolved: 0,
  };
  const errorsByCode = new Map<string, number>();
  let oldestSubmittedAgeSeconds = 0;
  const nowMs = Date.now();

  try {
    counts.alertsResolved += await recoverTerminalOperationalAlerts(admin, batchSize);
  } catch (error) {
    const code = error instanceof WalletOperationalAlertError
      ? error.code
      : 'WALLET_OPERATIONAL_ALERT_RECOVERY_UNEXPECTED_FAILURE';
    errorsByCode.set(code, (errorsByCode.get(code) ?? 0) + 1);
    logger.error('wallet.chain.worker.alert_recovery_failed', {
      ...context,
      error_code: code,
    });
  }

  for (const rawIntent of rows) {
    const intent = normalizeWalletChainIntentSnapshot(rawIntent);
    const correlationId = normalizeOperationalCorrelationId(
      isRecord(rawIntent) ? rawIntent.operational_correlation_id : null,
    );
    if (!intent || !correlationId) {
      counts.invalid += 1;
      logger.error('wallet.chain.worker.invalid_intent_shape', context);
      continue;
    }

    const intentFingerprint = walletIntentFingerprint(intent.id);
    const submittedAgeSeconds = ageSeconds(intent.submitted_at, nowMs) ?? 0;
    const priorConfirmedAgeSeconds = isRecord(rawIntent) && typeof rawIntent.chain_confirmed_at === 'string'
      ? ageSeconds(rawIntent.chain_confirmed_at, nowMs)
      : null;
    oldestSubmittedAgeSeconds = Math.max(oldestSubmittedAgeSeconds, submittedAgeSeconds);
    let observedStatus: string | null = null;

    try {
      const result = await reconcileWalletChainIntentV1(admin, intent);
      const nextStatus = result.record.status;
      observedStatus = nextStatus;

      if (nextStatus === 'pending_external') counts.pendingExternal += 1;
      else if (nextStatus === 'confirmed_external') counts.confirmedExternal += 1;
      else if (nextStatus === 'reconciled') counts.reconciled += 1;
      else if (nextStatus === 'failed') counts.failed += 1;
      else counts.errors += 1;

      if (nextStatus === 'reconciled' || nextStatus === 'failed') {
        await resolveWalletOperationalAlertsV1(admin, intent.id, nextStatus);
        counts.alertsResolved += 1;
      } else {
        const confirmationAgeSeconds = nextStatus === 'confirmed_external'
          && typeof result.record.chainConfirmedAt === 'string'
          ? ageSeconds(result.record.chainConfirmedAt, nowMs)
          : priorConfirmedAgeSeconds;
        const stuckAgeSeconds = nextStatus === 'confirmed_external'
          ? (confirmationAgeSeconds ?? 0)
          : submittedAgeSeconds;

        if (stuckAgeSeconds >= stuckAfterSeconds) {
          const alertKind = alertKindForLifecycleStatus(nextStatus);
          if (alertKind) {
            await upsertWalletOperationalAlertV1(admin, {
              intentId: intent.id,
              correlationId,
              alertKind,
              lifecycleStatus: nextStatus,
              submittedAgeSeconds,
              confirmations: result.observation.confirmations,
            });
            counts.alertsOpened += 1;
          }
          counts.stuck += 1;
          logger.warn('wallet.chain.worker.stuck_intent', {
            ...context,
            intent_fingerprint: intentFingerprint,
            wallet_correlation_id: correlationId,
            prior_status: intent.status,
            observed_status: nextStatus,
            submitted_age_seconds: submittedAgeSeconds,
            stuck_age_seconds: stuckAgeSeconds,
            stuck_age_anchor: nextStatus === 'confirmed_external' ? 'chain_confirmed_at' : 'submitted_at',
            confirmations: result.observation.confirmations,
          });
        } else {
          logger.info('wallet.chain.worker.intent_observed', {
            ...context,
            intent_fingerprint: intentFingerprint,
            wallet_correlation_id: correlationId,
            prior_status: intent.status,
            observed_status: nextStatus,
            submitted_age_seconds: submittedAgeSeconds,
            stuck_age_seconds: stuckAgeSeconds,
            stuck_age_anchor: nextStatus === 'confirmed_external' ? 'chain_confirmed_at' : 'submitted_at',
            confirmations: result.observation.confirmations,
          });
        }
      }
    } catch (error) {
      counts.errors += 1;
      const terminalStatusCommitted = terminalLifecycleStatus(observedStatus) !== null;
      const priorStuckAgeSeconds = intent.status === 'confirmed_external'
        ? (priorConfirmedAgeSeconds ?? 0)
        : submittedAgeSeconds;
      if (!terminalStatusCommitted && priorStuckAgeSeconds >= stuckAfterSeconds) {
        counts.stuck += 1;
        const alertKind = alertKindForLifecycleStatus(intent.status);
        if (alertKind) {
          try {
            await upsertWalletOperationalAlertV1(admin, {
              intentId: intent.id,
              correlationId,
              alertKind,
              lifecycleStatus: intent.status,
              submittedAgeSeconds,
              confirmations: null,
            });
            counts.alertsOpened += 1;
          } catch (alertError) {
            const alertCode = alertError instanceof WalletOperationalAlertError
              ? alertError.code
              : 'WALLET_OPERATIONAL_ALERT_UNEXPECTED_FAILURE';
            errorsByCode.set(alertCode, (errorsByCode.get(alertCode) ?? 0) + 1);
          }
        }
      }

      const code = error instanceof WalletChainReconciliationError
        ? error.code
        : error instanceof WalletChainPersistenceError
          ? error.code
          : error instanceof WalletOperationalAlertError
            ? error.code
            : 'WALLET_CHAIN_WORKER_UNEXPECTED_FAILURE';
      errorsByCode.set(code, (errorsByCode.get(code) ?? 0) + 1);

      logger.error('wallet.chain.worker.intent_failed', {
        ...context,
        intent_fingerprint: intentFingerprint,
        wallet_correlation_id: correlationId,
        prior_status: intent.status,
        observed_status: observedStatus,
        submitted_age_seconds: submittedAgeSeconds,
        stuck_age_seconds: priorStuckAgeSeconds,
        stuck_age_anchor: intent.status === 'confirmed_external' ? 'chain_confirmed_at' : 'submitted_at',
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
