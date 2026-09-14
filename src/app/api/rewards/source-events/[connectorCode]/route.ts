import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { sha256Hex, verifyRewardsSourceSignature } from '@/lib/rewards/source-signature';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 24 * 1024;
const MAX_DOMAIN_VALUE = 1_000_000_000_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CONNECTOR_CODE = /^[a-z0-9][a-z0-9_-]{1,47}$/;
const EVENT_CODE = /^[a-z0-9][a-z0-9_.-]{1,63}$/;
const EXTERNAL_EVENT_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{1,127}$/;
const NONCE = /^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/;
const MAX_EVENT_AGE_MS = 90 * 24 * 60 * 60 * 1000;
const MAX_FUTURE_EVENT_SKEW_MS = 5 * 60 * 1000;

type SourceAdmin = ReturnType<typeof createAdminClient>;
type JsonRecord = Record<string, unknown>;
type ConnectorRow = {
  id: string;
  pilot_unit_id: string;
  connector_code: string;
  source_domain: string;
  key_fingerprint_sha256: string;
  auth_scheme: 'ed25519_v1';
  public_key_pem: string;
  stage: 'draft' | 'validated' | 'archived';
  ingestion_enabled: boolean;
  max_clock_skew_seconds: number;
};
type SignedSourcePayload =
  | {
      eventKind: 'original';
      externalEventId: string;
      eventCode: string;
      subjectUserId: string;
      amountCents: number;
      occurredAt: string;
    }
  | {
      eventKind: 'reversal';
      externalEventId: string;
      eventCode: string;
      reversalOfExternalEventId: string;
      occurredAt: string;
    };
type DeliveryOutcome =
  | 'accepted'
  | 'idempotent_retry'
  | 'invalid_signature'
  | 'stale_timestamp'
  | 'connector_disabled'
  | 'event_not_allowed'
  | 'invalid_payload'
  | 'nonce_payload_conflict'
  | 'idempotency_conflict'
  | 'processing_failed';
type RateLimitRow = { allowed: boolean; remaining: number; retry_after_seconds: number };
type AtomicProcessingResult = {
  idempotentRetry: boolean;
  shadowEventId: string;
  decision: string;
  direction: string;
  hypotheticalPoints: number;
  reasonCode: string;
};

function json(body: unknown, status = 200) {
  const response = NextResponse.json(body, { status });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

function cleanOccurredAt(value: unknown) {
  if (typeof value !== 'string') return null;
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) return null;
  const now = Date.now();
  if (milliseconds > now + MAX_FUTURE_EVENT_SKEW_MS || milliseconds < now - MAX_EVENT_AGE_MS) return null;
  return new Date(milliseconds).toISOString();
}

function parsePayload(raw: string): SignedSourcePayload | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const body = parsed as JsonRecord;
  const eventKind = body.eventKind === 'original' || body.eventKind === 'reversal' ? body.eventKind : null;
  const externalEventId = typeof body.externalEventId === 'string' && EXTERNAL_EVENT_ID.test(body.externalEventId)
    ? body.externalEventId : null;
  const eventCode = typeof body.eventCode === 'string' && EVENT_CODE.test(body.eventCode)
    ? body.eventCode : null;
  const occurredAt = cleanOccurredAt(body.occurredAt);
  if (!eventKind || !externalEventId || !eventCode || !occurredAt) return null;

  if (eventKind === 'reversal') {
    const reversalOfExternalEventId = typeof body.reversalOfExternalEventId === 'string' && EXTERNAL_EVENT_ID.test(body.reversalOfExternalEventId)
      ? body.reversalOfExternalEventId : null;
    if (!reversalOfExternalEventId || reversalOfExternalEventId === externalEventId) return null;
    return { eventKind, externalEventId, eventCode, reversalOfExternalEventId, occurredAt };
  }

  const subjectUserId = typeof body.subjectUserId === 'string' && UUID.test(body.subjectUserId) ? body.subjectUserId : null;
  const amountCents = typeof body.amountCents === 'number' && Number.isSafeInteger(body.amountCents)
    && body.amountCents >= 0 && body.amountCents <= MAX_DOMAIN_VALUE ? body.amountCents : null;
  if (!subjectUserId || amountCents === null) return null;
  return { eventKind, externalEventId, eventCode, subjectUserId, amountCents, occurredAt };
}

function requesterIdentity(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip')?.trim() || 'unknown';
}

async function consumeRateLimit(admin: SourceAdmin, scope: string, actorKey: string) {
  const { data, error } = await admin.rpc('consume_service_api_rate_limit', {
    p_scope: scope,
    p_actor_key: actorKey,
  });
  if (error) return { row: null as RateLimitRow | null, error: true };
  const rows = (data ?? []) as RateLimitRow[];
  return { row: rows[0] ?? null, error: false };
}

function rateLimited(retryAfterSeconds: number) {
  const response = json({ error: 'SOURCE_RATE_LIMITED' }, 429);
  response.headers.set('Retry-After', String(Math.max(1, retryAfterSeconds)));
  return response;
}

async function recordAttempt(admin: SourceAdmin, args: {
  connector: ConnectorRow;
  nonce: string;
  signedAt: string;
  payloadDigest: string;
  signatureDigest: string;
  externalEventId?: string | null;
  eventCode?: string | null;
  outcome: DeliveryOutcome;
  shadowEventId?: string | null;
  httpStatus: number;
  detailCode: string;
}) {
  const { error } = await admin.from('reward_source_delivery_attempts').insert({
    connector_id: args.connector.id,
    request_nonce: args.nonce,
    signed_at: args.signedAt,
    payload_digest: args.payloadDigest,
    signature_digest: args.signatureDigest,
    key_fingerprint_sha256: args.connector.key_fingerprint_sha256,
    external_event_id: args.externalEventId ?? null,
    event_code: args.eventCode ?? null,
    outcome: args.outcome,
    shadow_event_id: args.shadowEventId ?? null,
    http_status: args.httpStatus,
    detail_code: args.detailCode,
  });
  return !error;
}

async function reserveNonce(admin: SourceAdmin, connector: ConnectorRow, nonce: string, signedAt: string, payloadDigest: string) {
  const { error } = await admin.from('reward_source_nonces').insert({
    connector_id: connector.id,
    nonce,
    signed_at: signedAt,
    payload_digest: payloadDigest,
  });
  if (!error) return { state: 'new' as const };

  const { data, error: readError } = await admin.from('reward_source_nonces')
    .select('signed_at,payload_digest')
    .eq('connector_id', connector.id)
    .eq('nonce', nonce)
    .maybeSingle();
  if (readError || !data) return { state: 'error' as const };
  const same = data.payload_digest.toLowerCase() === payloadDigest
    && new Date(data.signed_at).getTime() === new Date(signedAt).getTime();
  return { state: same ? 'retry' as const : 'conflict' as const };
}

function mapAtomicError(message: string) {
  const known: Array<[string, number, DeliveryOutcome]> = [
    ['IDEMPOTENCY_CONFLICT', 409, 'idempotency_conflict'],
    ['SOURCE_ORIGINAL_ALREADY_REVERSED', 409, 'idempotency_conflict'],
    ['SOURCE_REVERSAL_EVENT_CODE_MISMATCH', 409, 'idempotency_conflict'],
    ['SOURCE_ORIGINAL_NOT_DELIVERED_BY_CONNECTOR', 409, 'processing_failed'],
    ['SOURCE_KEY_CHANGED', 409, 'processing_failed'],
    ['SOURCE_ORIGINAL_NOT_FOUND', 404, 'processing_failed'],
    ['SOURCE_EVENT_NOT_ALLOWED', 403, 'event_not_allowed'],
    ['SOURCE_CONNECTOR_DISABLED', 403, 'connector_disabled'],
  ];
  const match = known.find(([code]) => message.includes(code));
  return match ? { code: match[0], status: match[1], outcome: match[2] } : { code: 'SOURCE_PROCESSING_FAILED', status: 503, outcome: 'processing_failed' as DeliveryOutcome };
}

export async function POST(request: NextRequest, context: { params: Promise<{ connectorCode: string }> }) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: 'REWARDS_SOURCE_INGESTION_UNAVAILABLE' }, 503);
  }

  const { connectorCode: rawConnectorCode } = await context.params;
  const connectorCode = rawConnectorCode.toLowerCase();
  if (!CONNECTOR_CODE.test(connectorCode)) return json({ error: 'SOURCE_CONNECTOR_NOT_FOUND' }, 404);

  const admin = createAdminClient();
  const requesterKey = `r_${sha256Hex(`${connectorCode}|${requesterIdentity(request)}`).slice(0, 40)}`;
  const connectorKey = `c_${connectorCode}`;
  const [requesterLimit, connectorLimit] = await Promise.all([
    consumeRateLimit(admin, 'rewards.source.preverify', requesterKey),
    consumeRateLimit(admin, 'rewards.source.connector', connectorKey),
  ]);
  if (requesterLimit.error || connectorLimit.error || !requesterLimit.row || !connectorLimit.row) {
    return json({ error: 'SOURCE_RATE_LIMIT_UNAVAILABLE' }, 503);
  }
  if (!requesterLimit.row.allowed || !connectorLimit.row.allowed) {
    return rateLimited(Math.max(requesterLimit.row.retry_after_seconds, connectorLimit.row.retry_after_seconds));
  }

  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return json({ error: 'SOURCE_PAYLOAD_TOO_LARGE' }, 413);
  }
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    return json({ error: 'SOURCE_PAYLOAD_TOO_LARGE' }, 413);
  }

  const { data: connectorData, error: connectorError } = await admin.from('reward_source_connectors')
    .select('id,pilot_unit_id,connector_code,source_domain,key_fingerprint_sha256,auth_scheme,public_key_pem,stage,ingestion_enabled,max_clock_skew_seconds')
    .eq('connector_code', connectorCode)
    .maybeSingle();
  if (connectorError) return json({ error: 'SOURCE_CONNECTOR_READ_FAILED' }, 503);
  if (!connectorData) return json({ error: 'SOURCE_CONNECTOR_NOT_FOUND' }, 404);
  const connector = connectorData as ConnectorRow;

  const timestamp = request.headers.get('x-ctg-rewards-timestamp') ?? '';
  const nonce = request.headers.get('x-ctg-rewards-nonce') ?? '';
  const signatureBase64 = request.headers.get('x-ctg-rewards-signature') ?? '';
  if (!/^\d{10,12}$/.test(timestamp) || !NONCE.test(nonce) || !signatureBase64) {
    return json({ error: 'SOURCE_SIGNATURE_HEADERS_INVALID' }, 401);
  }

  const signedSeconds = Number(timestamp);
  if (!Number.isSafeInteger(signedSeconds)) return json({ error: 'SOURCE_TIMESTAMP_INVALID' }, 401);
  const signedAtDate = new Date(signedSeconds * 1000);
  if (!Number.isFinite(signedAtDate.getTime())) return json({ error: 'SOURCE_TIMESTAMP_INVALID' }, 401);
  const signedAt = signedAtDate.toISOString();
  const payloadDigest = sha256Hex(raw);
  const signatureDigest = sha256Hex(signatureBase64);

  const signatureValid = verifyRewardsSourceSignature({
    connectorCode,
    timestamp,
    nonce,
    payloadDigest,
    publicKeyPem: connector.public_key_pem,
    signatureBase64,
  });
  if (!signatureValid) {
    await recordAttempt(admin, {
      connector, nonce, signedAt, payloadDigest, signatureDigest,
      outcome: 'invalid_signature', httpStatus: 401, detailCode: 'INVALID_SIGNATURE',
    });
    return json({ error: 'SOURCE_SIGNATURE_INVALID' }, 401);
  }

  const clockSkewMs = Math.abs(Date.now() - signedAtDate.getTime());
  if (clockSkewMs > connector.max_clock_skew_seconds * 1000) {
    await recordAttempt(admin, {
      connector, nonce, signedAt, payloadDigest, signatureDigest,
      outcome: 'stale_timestamp', httpStatus: 401, detailCode: 'TIMESTAMP_OUTSIDE_WINDOW',
    });
    return json({ error: 'SOURCE_TIMESTAMP_OUTSIDE_WINDOW' }, 401);
  }

  const nonceReservation = await reserveNonce(admin, connector, nonce, signedAt, payloadDigest);
  if (nonceReservation.state === 'error') return json({ error: 'SOURCE_NONCE_RESERVATION_FAILED' }, 503);
  if (nonceReservation.state === 'conflict') {
    await recordAttempt(admin, {
      connector, nonce, signedAt, payloadDigest, signatureDigest,
      outcome: 'nonce_payload_conflict', httpStatus: 409, detailCode: 'NONCE_PAYLOAD_CONFLICT',
    });
    return json({ error: 'SOURCE_NONCE_PAYLOAD_CONFLICT' }, 409);
  }
  const nonceRetry = nonceReservation.state === 'retry';

  const payload = parsePayload(raw);
  if (!payload) {
    await recordAttempt(admin, {
      connector, nonce, signedAt, payloadDigest, signatureDigest,
      outcome: 'invalid_payload', httpStatus: 400, detailCode: 'INVALID_EVENT_PAYLOAD',
    });
    return json({ error: 'SOURCE_EVENT_PAYLOAD_INVALID' }, 400);
  }

  if (payload.eventKind === 'original') {
    const { data: profile, error: profileError } = await admin.from('profiles')
      .select('id').eq('id', payload.subjectUserId).maybeSingle();
    if (profileError) return json({ error: 'SOURCE_SUBJECT_READ_FAILED' }, 503);
    if (!profile) {
      await recordAttempt(admin, {
        connector, nonce, signedAt, payloadDigest, signatureDigest,
        externalEventId: payload.externalEventId, eventCode: payload.eventCode,
        outcome: 'invalid_payload', httpStatus: 400, detailCode: 'UNKNOWN_SUBJECT_USER',
      });
      return json({ error: 'SOURCE_SUBJECT_UNKNOWN' }, 400);
    }
  }

  const { data: atomicData, error: atomicError } = await admin.rpc('process_signed_reward_source_event_atomic', {
    p_connector_id: connector.id,
    p_external_event_id: payload.externalEventId,
    p_event_code: payload.eventCode,
    p_event_kind: payload.eventKind,
    p_subject_user_id: payload.eventKind === 'original' ? payload.subjectUserId : null,
    p_amount_cents: payload.eventKind === 'original' ? payload.amountCents : null,
    p_reversal_of_external_event_id: payload.eventKind === 'reversal' ? payload.reversalOfExternalEventId : null,
    p_payload_digest: payloadDigest,
    p_occurred_at: payload.occurredAt,
    p_request_nonce: nonce,
    p_signed_at: signedAt,
    p_signature_digest: signatureDigest,
    p_key_fingerprint_sha256: connector.key_fingerprint_sha256,
    p_nonce_retry: nonceRetry,
  });

  if (atomicError || !atomicData) {
    const mapped = mapAtomicError(atomicError?.message ?? 'SOURCE_PROCESSING_FAILED');
    await recordAttempt(admin, {
      connector, nonce, signedAt, payloadDigest, signatureDigest,
      externalEventId: payload.externalEventId, eventCode: payload.eventCode,
      outcome: mapped.outcome, httpStatus: mapped.status, detailCode: mapped.code,
    });
    return json({ error: mapped.code, ledgerEffects: false }, mapped.status);
  }

  const processing = atomicData as AtomicProcessingResult;
  return json({
    ok: true,
    phase: 'signed_source_connectors_v4',
    commercialStatus: 'inactive',
    ledgerEffects: false,
    acceptedToShadow: true,
    idempotentRetry: processing.idempotentRetry,
    shadowEventId: processing.shadowEventId,
    evaluation: {
      decision: processing.decision,
      direction: processing.direction,
      hypotheticalPoints: processing.hypotheticalPoints,
      reasonCode: processing.reasonCode,
    },
  }, processing.idempotentRetry ? 200 : 201);
}
