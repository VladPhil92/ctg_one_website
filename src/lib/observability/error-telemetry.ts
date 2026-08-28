import 'server-only';

import { createHash } from 'node:crypto';

export type ErrorClass =
  | 'timeout'
  | 'rate_limit'
  | 'validation'
  | 'authentication'
  | 'authorization'
  | 'database'
  | 'upstream'
  | 'internal';

export type SafeErrorTelemetry = {
  error_class: ErrorClass;
  error_type: string;
  error_code: string | null;
  error_fingerprint: string;
  retryable: boolean;
};

type ErrorLike = {
  name?: unknown;
  message?: unknown;
  code?: unknown;
  status?: unknown;
  statusCode?: unknown;
};

const SAFE_TOKEN = /^[A-Za-z0-9_.:-]{1,64}$/;

function safeToken(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return SAFE_TOKEN.test(trimmed) ? trimmed : null;
}

function safeStatus(error: ErrorLike): number | null {
  const candidate = typeof error.status === 'number' ? error.status : error.statusCode;
  return typeof candidate === 'number' && Number.isInteger(candidate) && candidate >= 100 && candidate <= 599
    ? candidate
    : null;
}

function normalizedMessageForFingerprint(value: unknown) {
  if (typeof value !== 'string') return '';
  return value
    .toLowerCase()
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, '{uuid}')
    .replace(/\b\d+\b/g, '#')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 512);
}

function classifyError(name: string, code: string | null, status: number | null): ErrorClass {
  const normalized = `${name} ${code ?? ''}`.toLowerCase();

  if (normalized.includes('timeout') || normalized.includes('abort')) return 'timeout';
  if (status === 429 || normalized.includes('rate_limit')) return 'rate_limit';
  if (status === 400 || status === 422 || normalized.includes('validation')) return 'validation';
  if (status === 401 || normalized.includes('auth_required')) return 'authentication';
  if (status === 403 || normalized.includes('admin_required') || normalized.includes('forbidden')) return 'authorization';
  if (code?.startsWith('23') || code?.startsWith('PGRST') || normalized.includes('postgres')) return 'database';
  if (status != null && status >= 500) return 'upstream';
  return 'internal';
}

export function getSafeErrorTelemetry(error: unknown): SafeErrorTelemetry {
  const candidate = error && typeof error === 'object' ? error as ErrorLike : {};
  const errorType = safeToken(candidate.name) ?? (error instanceof Error ? 'Error' : 'UnknownError');
  const errorCode = safeToken(candidate.code);
  const status = safeStatus(candidate);
  const errorClass = classifyError(errorType, errorCode, status);
  const normalizedMessage = normalizedMessageForFingerprint(candidate.message);
  const fingerprint = createHash('sha256')
    .update(`${errorClass}|${errorType}|${errorCode ?? ''}|${status ?? ''}|${normalizedMessage}`)
    .digest('hex')
    .slice(0, 20);

  return {
    error_class: errorClass,
    error_type: errorType,
    error_code: errorCode,
    error_fingerprint: fingerprint,
    retryable: errorClass === 'timeout' || errorClass === 'rate_limit' || errorClass === 'upstream',
  };
}