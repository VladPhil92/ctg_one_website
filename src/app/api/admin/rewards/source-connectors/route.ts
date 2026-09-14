import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient, createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { inspectEd25519PublicKey } from '@/lib/rewards/source-signature';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 48 * 1024;
const PAGE_SIZE = 200;
const MAX_RECON_ROWS = 5_000;
const MAX_DOMAIN_VALUE = 1_000_000_000_000;
const MAX_RECON_WINDOW_MS = 31 * 24 * 60 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CONNECTOR_CODE = /^[a-z0-9][a-z0-9_-]{1,47}$/;
const EVENT_CODE = /^[a-z0-9][a-z0-9_.-]{1,63}$/;
const DIGEST = /^[0-9a-f]{64}$/;

type JsonRecord = Record<string, unknown>;
type Admin = ReturnType<typeof createAdminClient>;
type AdminContext = { userId: string; admin: Admin };
type ConnectorRow = {
  id: string;
  pilot_unit_id: string;
  connector_code: string;
  name: string;
  source_domain: string;
  auth_scheme: 'ed25519_v1';
  key_fingerprint_sha256: string;
  stage: 'draft' | 'validated' | 'archived';
  ingestion_enabled: boolean;
  max_clock_skew_seconds: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
type EventRow = { id: string; event_kind: 'original' | 'reversal'; amount_cents: number };
type AttemptRow = { outcome: string };
type EvaluationRow = { decision: string; calculated_points: number };

function json(body: unknown, status = 200) {
  const response = NextResponse.json(body, { status });
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

function isResponse(value: AdminContext | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}

async function requireSuperAdmin(): Promise<AdminContext | NextResponse> {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: 'REWARDS_SOURCE_CONNECTORS_UNAVAILABLE' }, 503);
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: 'UNAUTHORIZED' }, 401);
  const [{ data: profile }, { data: investmentProfile }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
    supabase.from('investment_participant_profiles').select('investment_role').eq('user_id', user.id).maybeSingle(),
  ]);
  if (profile?.role !== 'admin' || investmentProfile?.investment_role !== 'SUPER_ADMIN') {
    return json({ error: 'FORBIDDEN' }, 403);
  }
  return { userId: user.id, admin: createAdminClient() };
}

async function readBody(request: NextRequest): Promise<JsonRecord | null> {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return null;
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return null;
  try {
    const value = JSON.parse(raw) as unknown;
    return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : null;
  } catch {
    return null;
  }
}

function cleanText(value: unknown, max: number, min = 0) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length >= min && text.length <= max ? text : null;
}

function cleanConnectorCode(value: unknown) {
  if (typeof value !== 'string') return null;
  const code = value.trim().toLowerCase();
  return CONNECTOR_CODE.test(code) ? code : null;
}

function cleanEventCodes(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 32) return null;
  const codes = [...new Set(value.map(item => typeof item === 'string' ? item.trim().toLowerCase() : ''))];
  return codes.length >= 1 && codes.length <= 32 && codes.every(code => EVENT_CODE.test(code)) ? codes : null;
}

function boundedInteger(value: unknown, min = 0, max = MAX_DOMAIN_VALUE) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max ? value : null;
}

function cleanDate(value: unknown) {
  if (typeof value !== 'string') return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

async function loadRows<T>(loader: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>) {
  const rows: T[] = [];
  for (let offset = 0; offset < MAX_RECON_ROWS; offset += PAGE_SIZE) {
    const { data, error } = await loader(offset, offset + PAGE_SIZE - 1);
    if (error) return { rows: [] as T[], error: true, overflow: false };
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return { rows, error: false, overflow: false };
  }
  return { rows: [] as T[], error: false, overflow: true };
}

async function getConnector(admin: Admin, id: string) {
  const { data, error } = await admin.from('reward_source_connectors')
    .select('id,pilot_unit_id,connector_code,name,source_domain,auth_scheme,key_fingerprint_sha256,stage,ingestion_enabled,max_clock_skew_seconds,notes,created_at,updated_at')
    .eq('id', id).maybeSingle();
  return { connector: data as ConnectorRow | null, error };
}

function atomicError(message: string, fallback: string) {
  const known: Array<[string, number]> = [
    ['PILOT_UNIT_NOT_AVAILABLE', 409],
    ['CONNECTOR_NOT_AVAILABLE', 404],
    ['CONNECTOR_NOT_FOUND', 404],
    ['DISABLE_CONNECTOR_BEFORE_ALLOWLIST_CHANGE', 409],
    ['INVALID_ALLOWLIST', 400],
    ['INVALID_STAGE_CHANGE', 400],
    ['PILOT_UNIT_MUST_BE_VALIDATED', 409],
    ['CONNECTOR_ALLOWLIST_REQUIRED', 409],
    ['CONNECTOR_MUST_BE_VALIDATED', 409],
    ['GLOBAL_SHADOW_KILL_SWITCH_CLOSED', 409],
    ['KEY_FINGERPRINT_UNCHANGED', 409],
  ];
  const match = known.find(([code]) => message.includes(code));
  if (match) return { error: match[0], status: match[1] };
  if (message.includes('duplicate key')) return { error: fallback, status: 409 };
  return { error: fallback, status: 503 };
}

export async function GET() {
  const context = await requireSuperAdmin();
  if (isResponse(context)) return context;

  const [connectors, allowlist, attempts, reconciliations, configEvents] = await Promise.all([
    context.admin.from('reward_source_connectors')
      .select('id,pilot_unit_id,connector_code,name,source_domain,auth_scheme,key_fingerprint_sha256,stage,ingestion_enabled,max_clock_skew_seconds,notes,created_at,updated_at')
      .order('created_at', { ascending: false }).limit(200),
    context.admin.from('reward_source_connector_event_allowlist')
      .select('connector_id,event_code').order('event_code').limit(1000),
    context.admin.from('reward_source_delivery_attempts')
      .select('id,connector_id,request_nonce,signed_at,payload_digest,key_fingerprint_sha256,external_event_id,event_code,outcome,shadow_event_id,http_status,detail_code,created_at')
      .order('created_at', { ascending: false }).limit(100),
    context.admin.from('reward_source_reconciliation_runs')
      .select('id,connector_id,window_start,window_end,export_digest,declared_original_count,declared_reversal_count,declared_amount_cents,observed_original_count,observed_reversal_count,observed_amount_cents,accepted_delivery_count,rejected_delivery_count,hypothetical_eligible_points,original_count_delta,reversal_count_delta,amount_delta_cents,status,created_at')
      .order('created_at', { ascending: false }).limit(100),
    context.admin.from('reward_source_connector_config_events')
      .select('id,connector_id,event_type,config_snapshot,created_at')
      .order('created_at', { ascending: false }).limit(100),
  ]);
  if (connectors.error || allowlist.error || attempts.error || reconciliations.error || configEvents.error) {
    return json({ error: 'REWARDS_SOURCE_CONNECTORS_READ_FAILED' }, 503);
  }

  return json({
    phase: 'signed_source_connectors_v4',
    commercialStatus: 'inactive',
    ledgerEffects: false,
    sourceAuth: 'ed25519_v1',
    connectors: connectors.data ?? [],
    allowlist: allowlist.data ?? [],
    attempts: attempts.data ?? [],
    reconciliations: reconciliations.data ?? [],
    configEvents: configEvents.data ?? [],
  });
}

export async function POST(request: NextRequest) {
  const context = await requireSuperAdmin();
  if (isResponse(context)) return context;
  const body = await readBody(request);
  if (!body || typeof body.action !== 'string') return json({ error: 'INVALID_REQUEST' }, 400);

  if (body.action === 'create_connector') {
    const pilotUnitId = typeof body.pilotUnitId === 'string' && UUID.test(body.pilotUnitId) ? body.pilotUnitId : null;
    const connectorCode = cleanConnectorCode(body.connectorCode);
    const name = cleanText(body.name, 100, 2);
    const publicKeyPem = cleanText(body.publicKeyPem, 2000, 80);
    const maxClockSkewSeconds = boundedInteger(body.maxClockSkewSeconds, 30, 900);
    const notes = body.notes === null || body.notes === undefined || body.notes === '' ? null : cleanText(body.notes, 600);
    if (!pilotUnitId || !connectorCode || !name || !publicKeyPem || maxClockSkewSeconds === null || (body.notes && notes === null)) {
      return json({ error: 'INVALID_CONNECTOR' }, 400);
    }
    let key;
    try {
      key = inspectEd25519PublicKey(publicKeyPem);
    } catch {
      return json({ error: 'INVALID_ED25519_PUBLIC_KEY' }, 400);
    }

    const { data, error } = await context.admin.rpc('create_reward_source_connector_atomic', {
      p_pilot_unit_id: pilotUnitId,
      p_connector_code: connectorCode,
      p_name: name,
      p_public_key_pem: key.normalizedPem,
      p_key_fingerprint_sha256: key.fingerprintSha256,
      p_max_clock_skew_seconds: maxClockSkewSeconds,
      p_notes: notes,
      p_actor: context.userId,
    });
    if (error || !data || typeof data !== 'object' || Array.isArray(data) || typeof (data as JsonRecord).id !== 'string') {
      const mapped = atomicError(error?.message ?? '', 'CONNECTOR_CREATE_FAILED');
      return json({ error: mapped.error }, mapped.status);
    }
    const loaded = await getConnector(context.admin, String((data as JsonRecord).id));
    if (loaded.error || !loaded.connector) return json({ error: 'CONNECTOR_REFRESH_FAILED' }, 503);
    return json({ ok: true, connector: loaded.connector, privateKeyStored: false, ledgerEffects: false }, 201);
  }

  if (body.action === 'replace_allowlist') {
    const connectorId = typeof body.connectorId === 'string' && UUID.test(body.connectorId) ? body.connectorId : null;
    const eventCodes = cleanEventCodes(body.eventCodes);
    if (!connectorId || !eventCodes) return json({ error: 'INVALID_ALLOWLIST' }, 400);
    const { error } = await context.admin.rpc('replace_reward_source_allowlist_atomic', {
      p_connector_id: connectorId,
      p_event_codes: eventCodes,
      p_actor: context.userId,
    });
    if (error) {
      const mapped = atomicError(error.message, 'ALLOWLIST_REPLACE_FAILED');
      return json({ error: mapped.error }, mapped.status);
    }
    return json({ ok: true, eventCodes, ledgerEffects: false });
  }

  if (body.action === 'set_stage') {
    const connectorId = typeof body.connectorId === 'string' && UUID.test(body.connectorId) ? body.connectorId : null;
    const stage = body.stage === 'draft' || body.stage === 'validated' || body.stage === 'archived' ? body.stage : null;
    if (!connectorId || !stage) return json({ error: 'INVALID_STAGE_CHANGE' }, 400);
    const { error } = await context.admin.rpc('set_reward_source_connector_stage_atomic', {
      p_connector_id: connectorId,
      p_stage: stage,
      p_actor: context.userId,
    });
    if (error) {
      const mapped = atomicError(error.message, 'CONNECTOR_STAGE_CHANGE_FAILED');
      return json({ error: mapped.error }, mapped.status);
    }
    const loaded = await getConnector(context.admin, connectorId);
    if (loaded.error || !loaded.connector) return json({ error: 'CONNECTOR_REFRESH_FAILED' }, 503);
    return json({ ok: true, connector: loaded.connector, ledgerEffects: false });
  }

  if (body.action === 'set_ingestion') {
    const connectorId = typeof body.connectorId === 'string' && UUID.test(body.connectorId) ? body.connectorId : null;
    const enabled = typeof body.enabled === 'boolean' ? body.enabled : null;
    if (!connectorId || enabled === null) return json({ error: 'INVALID_INGESTION_CHANGE' }, 400);
    const { error } = await context.admin.rpc('set_reward_source_connector_ingestion_atomic', {
      p_connector_id: connectorId,
      p_enabled: enabled,
      p_actor: context.userId,
    });
    if (error) {
      const mapped = atomicError(error.message, 'CONNECTOR_INGESTION_CHANGE_FAILED');
      return json({ error: mapped.error }, mapped.status);
    }
    const loaded = await getConnector(context.admin, connectorId);
    if (loaded.error || !loaded.connector) return json({ error: 'CONNECTOR_REFRESH_FAILED' }, 503);
    return json({ ok: true, connector: loaded.connector, ledgerEffects: false });
  }

  if (body.action === 'rotate_key') {
    const connectorId = typeof body.connectorId === 'string' && UUID.test(body.connectorId) ? body.connectorId : null;
    const publicKeyPem = cleanText(body.publicKeyPem, 2000, 80);
    if (!connectorId || !publicKeyPem) return json({ error: 'INVALID_KEY_ROTATION' }, 400);
    let key;
    try {
      key = inspectEd25519PublicKey(publicKeyPem);
    } catch {
      return json({ error: 'INVALID_ED25519_PUBLIC_KEY' }, 400);
    }
    const { error } = await context.admin.rpc('rotate_reward_source_connector_key_atomic', {
      p_connector_id: connectorId,
      p_public_key_pem: key.normalizedPem,
      p_key_fingerprint_sha256: key.fingerprintSha256,
      p_actor: context.userId,
    });
    if (error) {
      const mapped = atomicError(error.message, 'KEY_ROTATION_FAILED');
      return json({ error: mapped.error }, mapped.status);
    }
    const loaded = await getConnector(context.admin, connectorId);
    if (loaded.error || !loaded.connector) return json({ error: 'CONNECTOR_REFRESH_FAILED' }, 503);
    return json({ ok: true, connector: loaded.connector, ingestionDisabledForSafety: true, ledgerEffects: false });
  }

  if (body.action === 'reconcile') {
    const connectorId = typeof body.connectorId === 'string' && UUID.test(body.connectorId) ? body.connectorId : null;
    const windowStart = cleanDate(body.windowStart);
    const windowEnd = cleanDate(body.windowEnd);
    const exportDigest = typeof body.exportDigest === 'string' && DIGEST.test(body.exportDigest.toLowerCase()) ? body.exportDigest.toLowerCase() : null;
    const declaredOriginalCount = boundedInteger(body.declaredOriginalCount, 0, MAX_RECON_ROWS);
    const declaredReversalCount = boundedInteger(body.declaredReversalCount, 0, MAX_RECON_ROWS);
    const declaredAmountCents = boundedInteger(body.declaredAmountCents);
    if (!connectorId || !windowStart || !windowEnd || !exportDigest || declaredOriginalCount === null || declaredReversalCount === null || declaredAmountCents === null) {
      return json({ error: 'INVALID_RECONCILIATION' }, 400);
    }
    const startMs = Date.parse(windowStart);
    const endMs = Date.parse(windowEnd);
    if (endMs <= startMs || endMs - startMs > MAX_RECON_WINDOW_MS || endMs > Date.now() + 5 * 60 * 1000) {
      return json({ error: 'INVALID_RECONCILIATION_WINDOW' }, 400);
    }
    const loaded = await getConnector(context.admin, connectorId);
    if (loaded.error) return json({ error: 'CONNECTOR_READ_FAILED' }, 503);
    if (!loaded.connector) return json({ error: 'CONNECTOR_NOT_FOUND' }, 404);
    const connector = loaded.connector;

    const eventsResult = await loadRows<EventRow>((from, to) => context.admin.from('reward_shadow_events')
      .select('id,event_kind,amount_cents')
      .eq('source_domain', connector.source_domain)
      .gte('occurred_at', windowStart)
      .lt('occurred_at', windowEnd)
      .order('occurred_at', { ascending: true })
      .range(from, to));
    const attemptsResult = await loadRows<AttemptRow>((from, to) => context.admin.from('reward_source_delivery_attempts')
      .select('outcome')
      .eq('connector_id', connector.id)
      .gte('created_at', windowStart)
      .lt('created_at', windowEnd)
      .order('created_at', { ascending: true })
      .range(from, to));
    if (eventsResult.error || attemptsResult.error) return json({ error: 'RECONCILIATION_READ_FAILED' }, 503);
    if (eventsResult.overflow || attemptsResult.overflow) return json({ error: 'RECONCILIATION_RESULT_LIMIT_EXCEEDED' }, 503);

    const evaluations: EvaluationRow[] = [];
    const eventIds = eventsResult.rows.map(event => event.id);
    for (let offset = 0; offset < eventIds.length; offset += PAGE_SIZE) {
      const ids = eventIds.slice(offset, offset + PAGE_SIZE);
      if (ids.length === 0) continue;
      const { data, error } = await context.admin.from('reward_shadow_evaluations')
        .select('decision,calculated_points').in('source_event_id', ids);
      if (error) return json({ error: 'RECONCILIATION_EVALUATION_READ_FAILED' }, 503);
      evaluations.push(...((data ?? []) as EvaluationRow[]));
    }

    const originals = eventsResult.rows.filter(event => event.event_kind === 'original');
    const reversals = eventsResult.rows.filter(event => event.event_kind === 'reversal');
    const observedAmountCents = originals.reduce((sum, event) => sum + event.amount_cents, 0);
    if (!Number.isSafeInteger(observedAmountCents)) return json({ error: 'RECONCILIATION_AMOUNT_OVERFLOW' }, 503);
    const hypotheticalEligiblePoints = evaluations
      .filter(item => item.decision === 'eligible')
      .reduce((sum, item) => sum + item.calculated_points, 0);
    if (!Number.isSafeInteger(hypotheticalEligiblePoints)) return json({ error: 'RECONCILIATION_POINTS_OVERFLOW' }, 503);
    const acceptedDeliveryCount = attemptsResult.rows.filter(item => item.outcome === 'accepted' || item.outcome === 'idempotent_retry').length;
    const rejectedDeliveryCount = attemptsResult.rows.length - acceptedDeliveryCount;
    const originalCountDelta = originals.length - declaredOriginalCount;
    const reversalCountDelta = reversals.length - declaredReversalCount;
    const amountDeltaCents = observedAmountCents - declaredAmountCents;
    const status = originalCountDelta === 0 && reversalCountDelta === 0 && amountDeltaCents === 0 ? 'matched' : 'mismatch';
    const snapshot = {
      phase: 'signed_source_connectors_v4',
      nonBinding: true,
      ledgerEffects: false,
      connectorCode: connector.connector_code,
      sourceDomain: connector.source_domain,
      keyFingerprintSha256: connector.key_fingerprint_sha256,
      sourceDeclared: { originalCount: declaredOriginalCount, reversalCount: declaredReversalCount, amountCents: declaredAmountCents, exportDigest },
      observed: { originalCount: originals.length, reversalCount: reversals.length, amountCents: observedAmountCents, acceptedDeliveryCount, rejectedDeliveryCount, hypotheticalEligiblePoints },
      delta: { originalCount: originalCountDelta, reversalCount: reversalCountDelta, amountCents: amountDeltaCents },
    };

    const { data, error } = await context.admin.from('reward_source_reconciliation_runs').insert({
      connector_id: connector.id,
      window_start: windowStart,
      window_end: windowEnd,
      export_digest: exportDigest,
      declared_original_count: declaredOriginalCount,
      declared_reversal_count: declaredReversalCount,
      declared_amount_cents: declaredAmountCents,
      observed_original_count: originals.length,
      observed_reversal_count: reversals.length,
      observed_amount_cents: observedAmountCents,
      accepted_delivery_count: acceptedDeliveryCount,
      rejected_delivery_count: rejectedDeliveryCount,
      hypothetical_eligible_points: hypotheticalEligiblePoints,
      original_count_delta: originalCountDelta,
      reversal_count_delta: reversalCountDelta,
      amount_delta_cents: amountDeltaCents,
      status,
      reconciliation_snapshot: snapshot,
      created_by: context.userId,
    }).select('id,connector_id,window_start,window_end,export_digest,declared_original_count,declared_reversal_count,declared_amount_cents,observed_original_count,observed_reversal_count,observed_amount_cents,accepted_delivery_count,rejected_delivery_count,hypothetical_eligible_points,original_count_delta,reversal_count_delta,amount_delta_cents,status,created_at').single();
    if (error || !data) return json({ error: 'RECONCILIATION_WRITE_FAILED' }, 503);
    return json({ ok: true, reconciliation: data, ledgerEffects: false }, 201);
  }

  return json({ error: 'UNSUPPORTED_ACTION' }, 400);
}
