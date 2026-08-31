import 'server-only';

import { createHash } from 'node:crypto';

export const WALLET_LIFECYCLE_OPERATIONS_VERSION = 'ctg-wallet-lifecycle-operations-v1' as const;

export const WALLET_AUTHORIZED_OPERATIONS_SELECT = [
  'id',
  'status',
  'intent_type',
  'rail',
  'chain_id',
  'authorized_at',
].join(',');

export const WALLET_FAILED_OPERATIONS_SELECT = [
  'id',
  'status',
  'intent_type',
  'rail',
  'chain_id',
  'chain_failure_code',
  'updated_at',
].join(',');

export const WALLET_DURABLE_ALERT_SELECT = [
  'intent_id',
  'operational_correlation_id',
  'alert_kind',
  'state',
  'lifecycle_status',
  'submitted_age_seconds',
  'confirmations',
  'first_detected_at',
  'last_detected_at',
].join(',');

export type WalletLifecycleSeverity = 'healthy' | 'warning' | 'critical';
export type WalletLifecycleAlertCode =
  | 'WALLET_AUTHORIZED_WITHOUT_SUBMISSION'
  | 'WALLET_SUBMISSION_NOT_OBSERVED'
  | 'WALLET_PENDING_EXTERNAL_STUCK'
  | 'WALLET_CONFIRMED_EXTERNAL_NOT_RECONCILED'
  | 'WALLET_TERMINAL_CHAIN_FAILURE';

export type WalletLifecycleOperationalItem = {
  intentFingerprint: string;
  serverCorrelationId: string | null;
  lifecycleStatus: string;
  severity: Exclude<WalletLifecycleSeverity, 'healthy'>;
  alertCode: WalletLifecycleAlertCode;
  ageSeconds: number;
  confirmations: number | null;
  failureCode: string | null;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FAILURE_CODE_RE = /^WALLET_CHAIN_[A-Z0-9_]{3,96}$/;
const DURABLE_ALERT_KINDS = new Set(['submission_stuck', 'reconciliation_stuck', 'confirmation_stuck']);
const DURABLE_ALERT_STATUSES = new Set(['submitted', 'pending_external', 'confirmed_external']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validIso(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function nonNegativeInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export function walletIntentFingerprint(intentId: string): string {
  const normalized = intentId.trim().toLowerCase();
  if (!UUID_RE.test(normalized)) throw new Error('WALLET_OPERATIONAL_INTENT_ID_INVALID');
  return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}

export function classifyAuthorizedWalletIntent(
  value: unknown,
  authorizedStuckAfterSeconds: number,
  nowMs = Date.now(),
): WalletLifecycleOperationalItem | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== 'string'
    || !UUID_RE.test(value.id)
    || value.status !== 'authorized'
    || value.intent_type !== 'crypto_send'
    || value.rail !== 'polygon'
    || value.chain_id !== 137
    || !validIso(value.authorized_at)
  ) return null;

  const ageSeconds = Math.max(0, Math.floor((nowMs - Date.parse(value.authorized_at)) / 1000));
  if (ageSeconds < authorizedStuckAfterSeconds) return null;

  return {
    intentFingerprint: walletIntentFingerprint(value.id),
    serverCorrelationId: null,
    lifecycleStatus: 'authorized',
    severity: 'warning',
    alertCode: 'WALLET_AUTHORIZED_WITHOUT_SUBMISSION',
    ageSeconds,
    confirmations: null,
    failureCode: null,
  };
}

export function normalizeDurableWalletAlert(value: unknown): WalletLifecycleOperationalItem | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.intent_id !== 'string'
    || !UUID_RE.test(value.intent_id)
    || typeof value.operational_correlation_id !== 'string'
    || !UUID_RE.test(value.operational_correlation_id)
    || typeof value.alert_kind !== 'string'
    || !DURABLE_ALERT_KINDS.has(value.alert_kind)
    || value.state !== 'open'
    || typeof value.lifecycle_status !== 'string'
    || !DURABLE_ALERT_STATUSES.has(value.lifecycle_status)
    || !validIso(value.first_detected_at)
    || !validIso(value.last_detected_at)
  ) return null;

  const ageSeconds = nonNegativeInteger(value.submitted_age_seconds);
  if (ageSeconds === null) return null;
  const confirmations = value.confirmations === null ? null : nonNegativeInteger(value.confirmations);
  if (value.confirmations !== null && confirmations === null) return null;

  const kind = value.alert_kind;
  return {
    intentFingerprint: walletIntentFingerprint(value.intent_id),
    serverCorrelationId: value.operational_correlation_id.toLowerCase(),
    lifecycleStatus: value.lifecycle_status,
    severity: kind === 'reconciliation_stuck' ? 'warning' : 'critical',
    alertCode: kind === 'submission_stuck'
      ? 'WALLET_SUBMISSION_NOT_OBSERVED'
      : kind === 'confirmation_stuck'
        ? 'WALLET_CONFIRMED_EXTERNAL_NOT_RECONCILED'
        : 'WALLET_PENDING_EXTERNAL_STUCK',
    ageSeconds,
    confirmations,
    failureCode: null,
  };
}

export function normalizeRecentFailedWalletIntent(
  value: unknown,
  failedLookbackSeconds: number,
  nowMs = Date.now(),
): WalletLifecycleOperationalItem | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== 'string'
    || !UUID_RE.test(value.id)
    || value.status !== 'failed'
    || value.intent_type !== 'crypto_send'
    || value.rail !== 'polygon'
    || value.chain_id !== 137
    || !validIso(value.updated_at)
    || typeof value.chain_failure_code !== 'string'
    || !FAILURE_CODE_RE.test(value.chain_failure_code)
  ) return null;

  const ageSeconds = Math.max(0, Math.floor((nowMs - Date.parse(value.updated_at)) / 1000));
  if (ageSeconds > failedLookbackSeconds) return null;

  return {
    intentFingerprint: walletIntentFingerprint(value.id),
    serverCorrelationId: null,
    lifecycleStatus: 'failed',
    severity: 'warning',
    alertCode: 'WALLET_TERMINAL_CHAIN_FAILURE',
    ageSeconds,
    confirmations: null,
    failureCode: value.chain_failure_code,
  };
}

export function summarizeWalletLifecycleOperations(items: WalletLifecycleOperationalItem[]) {
  const critical = items.filter((item) => item.severity === 'critical').length;
  const warning = items.length - critical;
  const alertsByCode: Partial<Record<WalletLifecycleAlertCode, number>> = {};
  let oldestAgeSeconds = 0;

  for (const item of items) {
    oldestAgeSeconds = Math.max(oldestAgeSeconds, item.ageSeconds);
    alertsByCode[item.alertCode] = (alertsByCode[item.alertCode] ?? 0) + 1;
  }

  const severity: WalletLifecycleSeverity = critical > 0 ? 'critical' : warning > 0 ? 'warning' : 'healthy';
  return {
    version: WALLET_LIFECYCLE_OPERATIONS_VERSION,
    severity,
    alerts: { critical, warning, total: items.length },
    alertsByCode,
    oldestAgeSeconds,
    items,
  };
}
