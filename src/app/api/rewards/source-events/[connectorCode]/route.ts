import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { sha256Hex, verifyRewardsSourceSignature } from '@/lib/rewards/source-signature';
import { processSignedSourcePayload, type SignedSourceConnector, type SignedSourcePayload } from '@/lib/rewards/source-shadow-processing';

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
type ConnectorRow = SignedSourceConnector & {
  auth_scheme: 'ed25519_v1';
  public_key_pem: string;
  stage: 'draft' | 'validated' | 'archived';
  ingestion_enabled: boolean;
  max_clock_skew_seconds: number;
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

export async function POST(request: NextRequest, context: { params: Promise<{ connectorCode: string }> }) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: 'REWARDS_SOURCE_INGESTION_UNAVAILABLE' }, 503);
  }

  const { connectorCode: rawConnectorCode } = await context.params;
  const connectorCode = rawConnectorCode.toLowerCase();
  if (!CONNECTOR_CODE.test(connectorCode)) return json({ error: 'SOURCE_CONNECTOR_NOT_FOUND' }, 404);

  const declaredLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return json({ error: 'SOURCE_PAYLOAD_TOO_LARGE' }, 413);
  }
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    return json({ error: 'SOURCE_PAYLOAD_TOO_LARGE' }, 413);
  }

  const admin = createAdminClient();
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

  if (connector.stage !== 'validated' || !connector.ingestion_enabled) {
    await recordAttempt(admin, {
      connector, nonce, signedAt, payloadDigest, signatureDigest,
      externalEventId: payload.externalEventId, eventCode: payload.eventCode,
      outcome: 'connector_disabled', httpStatus: 403, detailCode: 'CONNECTOR_DISABLED',
    });
    return json({ error: 'SOURCE_CONNECTOR_DISABLED' }, 403);
  }

  const { data: allowlisted, error: allowlistError } = await admin.from('reward_source_connector_event_allowlist')
    .select('event_code')
    .eq('connector_id', connector.id)
    .eq('event_code', payload.eventCode)
    .maybeSingle();
  if (allowlistError) return json({ error: 'SOURCE_ALLOWLIST_READ_FAILED' }, 503);
  if (!allowlisted) {
    await recordAttempt(admin, {
      connector, nonce, signedAt, payloadDigest, signatureDigest,
      externalEventId: payload.externalEventId, eventCode: payload.eventCode,
      outcome: 'event_not_allowed', httpStatus: 403, detailCode: 'EVENT_NOT_ALLOWLISTED',
    });
    return json({ error: 'SOURCE_EVENT_NOT_ALLOWED' }, 403);
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

  const processing = await processSignedSourcePayload(admin, connector, payload, payloadDigest);
  if (!processing.ok) {
    const outcome: DeliveryOutcome = processing.status === 409 ? 'idempotency_conflict' : 'processing_failed';
    const audited = await recordAttempt(admin, {
      connector, nonce, signedAt, payloadDigest, signatureDigest,
      externalEventId: payload.externalEventId, eventCode: payload.eventCode,
      outcome, httpStatus: processing.status, detailCode: processing.error,
    });
    if (!audited) return json({ error: 'SOURCE_DELIVERY_AUDIT_FAILED' }, 503);
    return json({ error: processing.error, ledgerEffects: false }, processing.status);
  }

  const idempotentRetry = nonceRetry || processing.idempotentReplay;
  const audited = await recordAttempt(admin, {
    connector, nonce, signedAt, payloadDigest, signatureDigest,
    externalEventId: payload.externalEventId, eventCode: payload.eventCode,
    outcome: idempotentRetry ? 'idempotent_retry' : 'accepted',
    shadowEventId: processing.event.id,
    httpStatus: idempotentRetry ? 200 : 201,
    detailCode: idempotentRetry ? 'IDEMPOTENT_RETRY' : 'SHADOW_EVENT_ACCEPTED',
  });
  if (!audited) return json({ error: 'SOURCE_DELIVERY_AUDIT_FAILED' }, 503);

  return json({
    ok: true,
    phase: 'signed_source_connectors_v4',
    commercialStatus: 'inactive',
    ledgerEffects: false,
    acceptedToShadow: true,
    idempotentRetry,
    shadowEventId: processing.event.id,
    evaluation: {
      decision: processing.evaluation.decision,
      direction: processing.evaluation.direction,
      hypotheticalPoints: processing.evaluation.calculated_points,
      reasonCode: processing.evaluation.reason_code,
    },
  }, idempotentRetry ? 200 : 201);
}
