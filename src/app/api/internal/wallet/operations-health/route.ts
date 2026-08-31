import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

import { logger } from '@/lib/observability/logger';
import { formatTraceparent, getRequestObservabilityContext } from '@/lib/observability/request-context';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/server';
import {
  classifyAuthorizedWalletIntent,
  normalizeDurableWalletAlert,
  normalizeRecentFailedWalletIntent,
  summarizeWalletLifecycleOperations,
  WALLET_AUTHORIZED_OPERATIONS_SELECT,
  WALLET_DURABLE_ALERT_SELECT,
  WALLET_FAILED_OPERATIONS_SELECT,
  WALLET_LIFECYCLE_OPERATIONS_VERSION,
  type WalletLifecycleOperationalItem,
} from '@/lib/wallet/lifecycle-operations';

export const dynamic = 'force-dynamic';

const MAX_AUTHORIZED_SAMPLE = 50;
const MAX_DURABLE_ALERT_SAMPLE = 100;
const MAX_FAILED_SAMPLE = 25;
const DEFAULT_AUTHORIZED_STUCK_AFTER_SECONDS = 10 * 60;
const DEFAULT_FAILED_LOOKBACK_SECONDS = 24 * 60 * 60;
const MIN_THRESHOLD_SECONDS = 5 * 60;
const MAX_THRESHOLD_SECONDS = 24 * 60 * 60;

function boundedInteger(raw: string | undefined, fallback: number) {
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed)
    && parsed >= MIN_THRESHOLD_SECONDS
    && parsed <= MAX_THRESHOLD_SECONDS
    ? parsed
    : fallback;
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

export async function GET(request: Request) {
  const context = getRequestObservabilityContext(request);
  const startedAt = Date.now();

  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return responseWithContext(request, { error: 'WALLET_OPERATIONS_UNAVAILABLE' }, { status: 503 });
  }

  const secretState = workerSecretState(request);
  if (secretState === 'unconfigured') {
    return responseWithContext(request, { error: 'WALLET_CHAIN_WORKER_NOT_CONFIGURED' }, { status: 503 });
  }
  if (secretState !== 'authorized') {
    logger.warn('wallet.operations.unauthorized', context);
    return responseWithContext(request, { error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const authorizedStuckAfterSeconds = boundedInteger(
    process.env.WALLET_OPERATIONS_AUTHORIZED_STUCK_AFTER_SECONDS,
    DEFAULT_AUTHORIZED_STUCK_AFTER_SECONDS,
  );
  const failedLookbackSeconds = boundedInteger(
    process.env.WALLET_OPERATIONS_FAILED_LOOKBACK_SECONDS,
    DEFAULT_FAILED_LOOKBACK_SECONDS,
  );
  const failedSince = new Date(Date.now() - failedLookbackSeconds * 1000).toISOString();
  const admin = createAdminClient();

  const [authorizedResult, durableAlertsResult, failedResult] = await Promise.all([
    admin
      .from('wallet_intents_v2')
      .select(WALLET_AUTHORIZED_OPERATIONS_SELECT)
      .eq('intent_type', 'crypto_send')
      .eq('rail', 'polygon')
      .eq('chain_id', 137)
      .eq('status', 'authorized')
      .order('authorized_at', { ascending: true })
      .limit(MAX_AUTHORIZED_SAMPLE),
    admin
      .from('wallet_chain_operational_alerts_v1')
      .select(WALLET_DURABLE_ALERT_SELECT)
      .eq('state', 'open')
      .order('last_detected_at', { ascending: false })
      .limit(MAX_DURABLE_ALERT_SAMPLE),
    admin
      .from('wallet_intents_v2')
      .select(WALLET_FAILED_OPERATIONS_SELECT)
      .eq('intent_type', 'crypto_send')
      .eq('rail', 'polygon')
      .eq('chain_id', 137)
      .eq('status', 'failed')
      .gte('updated_at', failedSince)
      .order('updated_at', { ascending: false })
      .limit(MAX_FAILED_SAMPLE),
  ]);

  if (authorizedResult.error || durableAlertsResult.error || failedResult.error) {
    logger.error('wallet.operations.read_failed', {
      ...context,
      duration_ms: Date.now() - startedAt,
    });
    return responseWithContext(request, { error: 'WALLET_OPERATIONS_READ_FAILED' }, { status: 503 });
  }

  const items: WalletLifecycleOperationalItem[] = [];
  let invalid = 0;

  for (const raw of authorizedResult.data ?? []) {
    const item = classifyAuthorizedWalletIntent(raw, authorizedStuckAfterSeconds);
    if (item) items.push(item);
  }

  for (const raw of durableAlertsResult.data ?? []) {
    const item = normalizeDurableWalletAlert(raw);
    if (item) items.push(item);
    else invalid += 1;
  }

  for (const raw of failedResult.data ?? []) {
    const item = normalizeRecentFailedWalletIntent(raw, failedLookbackSeconds);
    if (item) items.push(item);
    else invalid += 1;
  }

  const summary = summarizeWalletLifecycleOperations(items);
  for (const item of summary.items) {
    const fields = {
      ...context,
      intent_fingerprint: item.intentFingerprint,
      wallet_correlation_id: item.serverCorrelationId,
      lifecycle_status: item.lifecycleStatus,
      alert_code: item.alertCode,
      age_seconds: item.ageSeconds,
      confirmations: item.confirmations,
      failure_code: item.failureCode,
    };
    if (item.severity === 'critical') logger.error('wallet.operations.lifecycle_alert', fields);
    else logger.warn('wallet.operations.lifecycle_alert', fields);
  }

  const response = {
    ...summary,
    requestId: context.request_id,
    thresholds: {
      authorizedStuckAfterSeconds,
      failedLookbackSeconds,
    },
    sample: {
      authorizedLimit: MAX_AUTHORIZED_SAMPLE,
      durableAlertLimit: MAX_DURABLE_ALERT_SAMPLE,
      failedLimit: MAX_FAILED_SAMPLE,
      authorizedScanned: authorizedResult.data?.length ?? 0,
      durableAlertsScanned: durableAlertsResult.data?.length ?? 0,
      failedScanned: failedResult.data?.length ?? 0,
      invalid,
      bounded: true,
    },
    durationMs: Date.now() - startedAt,
  };

  logger.info('wallet.operations.completed', {
    ...context,
    version: WALLET_LIFECYCLE_OPERATIONS_VERSION,
    severity: response.severity,
    alerts: response.alerts,
    alerts_by_code: response.alertsByCode,
    oldest_age_seconds: response.oldestAgeSeconds,
    sample: response.sample,
    duration_ms: response.durationMs,
  });

  return responseWithContext(request, response);
}
