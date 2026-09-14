import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient, createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { evaluateShadowReward, type RewardShadowRule, type RewardShadowRuntime } from '@/lib/rewards/shadow-evaluation';
import type { RewardPilotCalculationType } from '@/lib/rewards/pilot-simulation';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 24 * 1024;
const MAX_DOMAIN_VALUE = 1_000_000_000_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9][a-z0-9_.-]{1,63}$/;
const EXTERNAL_EVENT_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{1,127}$/;
const DIGEST = /^[0-9a-fA-F]{64}$/;
const MAX_EVENT_AGE_MS = 90 * 24 * 60 * 60 * 1000;
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;

type JsonRecord = Record<string, unknown>;
type ShadowAdmin = ReturnType<typeof createAdminClient>;
type RuntimeRow = {
  id: number;
  processing_enabled: boolean;
  max_amount_cents: number;
  max_points_per_event: number;
  max_events_per_subject_per_day: number;
  updated_reason: string;
  updated_at: string;
};
type ShadowEventRow = {
  id: string;
  source_domain: string;
  external_event_id: string;
  event_code: string;
  subject_user_id: string;
  amount_cents: number;
  event_kind: 'original' | 'reversal';
  reversal_of_event_id: string | null;
  payload_digest: string;
  occurred_at: string;
  created_at: string;
};
type EvaluationRow = {
  id: string;
  source_event_id: string;
  pilot_unit_id: string | null;
  rule_id: string | null;
  decision: 'eligible' | 'ineligible' | 'blocked' | 'no_unit' | 'no_rule' | 'reversal';
  direction: 'credit' | 'debit' | 'none';
  calculated_points: number;
  reason_code: string;
  rule_snapshot: Record<string, unknown>;
  runtime_snapshot: Record<string, unknown>;
  created_at: string;
};
type AdminContext = { userId: string; admin: ShadowAdmin };

function json(body: unknown, status = 200) {
  const response = NextResponse.json(body, { status });
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

function isResponse(value: AdminContext | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}

function cleanText(value: unknown, max: number, min = 0) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length >= min && text.length <= max ? text : null;
}

function cleanSlug(value: unknown) {
  if (typeof value !== 'string') return null;
  const text = value.trim().toLowerCase();
  return SLUG.test(text) ? text : null;
}

function boundedInteger(value: unknown, min = 0, max = MAX_DOMAIN_VALUE) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max ? value : null;
}

function cleanOccurredAt(value: unknown) {
  if (typeof value !== 'string') return null;
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) return null;
  const now = Date.now();
  if (milliseconds > now + MAX_FUTURE_SKEW_MS || milliseconds < now - MAX_EVENT_AGE_MS) return null;
  return new Date(milliseconds).toISOString();
}

async function readBody(request: NextRequest): Promise<JsonRecord | null> {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return null;
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as JsonRecord : null;
  } catch {
    return null;
  }
}

async function requireSuperAdmin(): Promise<AdminContext | NextResponse> {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: 'REWARDS_SHADOW_ENGINE_UNAVAILABLE' }, 503);
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

async function loadRuntime(admin: ShadowAdmin) {
  const { data, error } = await admin.from('reward_shadow_runtime_config')
    .select('id,processing_enabled,max_amount_cents,max_points_per_event,max_events_per_subject_per_day,updated_reason,updated_at')
    .eq('id', 1).maybeSingle();
  return { runtime: data as RuntimeRow | null, error };
}

function runtimeDomain(row: RuntimeRow): RewardShadowRuntime {
  return {
    processingEnabled: row.processing_enabled,
    maxAmountCents: row.max_amount_cents,
    maxPointsPerEvent: row.max_points_per_event,
    maxEventsPerSubjectPerDay: row.max_events_per_subject_per_day,
  };
}

async function loadEvaluation(admin: ShadowAdmin, sourceEventId: string) {
  const { data, error } = await admin.from('reward_shadow_evaluations')
    .select('id,source_event_id,pilot_unit_id,rule_id,decision,direction,calculated_points,reason_code,rule_snapshot,runtime_snapshot,created_at')
    .eq('source_event_id', sourceEventId).maybeSingle();
  return { evaluation: data as EvaluationRow | null, error };
}

async function countDailyOriginalEvents(admin: ShadowAdmin, event: ShadowEventRow) {
  const occurred = new Date(event.occurred_at);
  const start = new Date(Date.UTC(occurred.getUTCFullYear(), occurred.getUTCMonth(), occurred.getUTCDate()));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const { count, error } = await admin.from('reward_shadow_events')
    .select('id', { count: 'exact', head: true })
    .eq('subject_user_id', event.subject_user_id)
    .eq('event_kind', 'original')
    .gte('occurred_at', start.toISOString())
    .lt('occurred_at', end.toISOString());
  return { count: count ?? 0, error };
}

async function ensureOriginalEvaluation(context: AdminContext, event: ShadowEventRow) {
  const existing = await loadEvaluation(context.admin, event.id);
  if (existing.error) return { evaluation: null, error: 'SHADOW_EVALUATION_READ_FAILED' };
  if (existing.evaluation) return { evaluation: existing.evaluation, error: null };

  const { runtime, error: runtimeError } = await loadRuntime(context.admin);
  if (runtimeError || !runtime) return { evaluation: null, error: 'SHADOW_RUNTIME_READ_FAILED' };

  const { data: unit, error: unitError } = await context.admin.from('reward_pilot_units')
    .select('id,source_domain,stage').eq('source_domain', event.source_domain).eq('stage', 'validated').maybeSingle();
  if (unitError) return { evaluation: null, error: 'SHADOW_UNIT_READ_FAILED' };

  let rule: RewardShadowRule | null = null;
  if (unit) {
    const { data: ruleRow, error: ruleError } = await context.admin.from('reward_rule_drafts')
      .select('id,pilot_unit_id,event_code,calculation_type,fixed_points,points_per_block,cop_block_cents,minimum_amount_cents,maximum_points_per_event,stage')
      .eq('pilot_unit_id', unit.id).eq('event_code', event.event_code).eq('stage', 'validated').maybeSingle();
    if (ruleError) return { evaluation: null, error: 'SHADOW_RULE_READ_FAILED' };
    if (ruleRow) {
      rule = {
        id: ruleRow.id,
        pilotUnitId: ruleRow.pilot_unit_id,
        eventCode: ruleRow.event_code,
        calculationType: ruleRow.calculation_type as RewardPilotCalculationType,
        fixedPoints: ruleRow.fixed_points,
        pointsPerBlock: ruleRow.points_per_block,
        copBlockCents: ruleRow.cop_block_cents,
        minimumAmountCents: ruleRow.minimum_amount_cents,
        maximumPointsPerEvent: ruleRow.maximum_points_per_event,
      };
    }
  }

  const daily = await countDailyOriginalEvents(context.admin, event);
  if (daily.error) return { evaluation: null, error: 'SHADOW_DAILY_LIMIT_READ_FAILED' };

  let result;
  try {
    result = evaluateShadowReward({
      runtime: runtimeDomain(runtime),
      validatedUnitAvailable: Boolean(unit),
      rule,
      inputAmountCents: event.amount_cents,
      subjectDailyOriginalCount: daily.count,
    });
  } catch {
    result = {
      decision: 'blocked' as const,
      direction: 'none' as const,
      calculatedPoints: 0,
      reasonCode: 'rule_evaluation_error',
      previewReason: null,
      blocks: null,
    };
  }

  const runtimeSnapshot = {
    phase: 'shadow_earning_engine_v3',
    nonBinding: true,
    ledgerEffects: false,
    ingestionMode: 'admin_replay_only',
    processingEnabled: runtime.processing_enabled,
    maxAmountCents: runtime.max_amount_cents,
    maxPointsPerEvent: runtime.max_points_per_event,
    maxEventsPerSubjectPerDay: runtime.max_events_per_subject_per_day,
    subjectDailyOriginalCount: daily.count,
  };
  const ruleSnapshot = rule ? {
    pilotUnitId: rule.pilotUnitId,
    ruleId: rule.id,
    eventCode: rule.eventCode,
    calculationType: rule.calculationType,
    fixedPoints: rule.fixedPoints,
    pointsPerBlock: rule.pointsPerBlock,
    copBlockCents: rule.copBlockCents,
    minimumAmountCents: rule.minimumAmountCents,
    maximumPointsPerEvent: rule.maximumPointsPerEvent,
    previewReason: result.previewReason,
    blocks: result.blocks,
  } : {};

  const { data, error } = await context.admin.from('reward_shadow_evaluations').insert({
    source_event_id: event.id,
    pilot_unit_id: unit?.id ?? null,
    rule_id: rule?.id ?? null,
    decision: result.decision,
    direction: result.direction,
    calculated_points: result.calculatedPoints,
    reason_code: result.reasonCode,
    rule_snapshot: ruleSnapshot,
    runtime_snapshot: runtimeSnapshot,
    created_by: context.userId,
  }).select('id,source_event_id,pilot_unit_id,rule_id,decision,direction,calculated_points,reason_code,rule_snapshot,runtime_snapshot,created_at').single();

  if (!error) return { evaluation: data as EvaluationRow, error: null };
  const raced = await loadEvaluation(context.admin, event.id);
  if (!raced.error && raced.evaluation) return { evaluation: raced.evaluation, error: null };
  return { evaluation: null, error: 'SHADOW_EVALUATION_WRITE_FAILED' };
}

function originalMatches(existing: ShadowEventRow, input: { eventCode: string; subjectUserId: string; amountCents: number; payloadDigest: string; occurredAt: string }) {
  return existing.event_kind === 'original'
    && existing.event_code === input.eventCode
    && existing.subject_user_id === input.subjectUserId
    && existing.amount_cents === input.amountCents
    && existing.payload_digest.toLowerCase() === input.payloadDigest.toLowerCase()
    && new Date(existing.occurred_at).getTime() === new Date(input.occurredAt).getTime();
}

export async function GET() {
  const context = await requireSuperAdmin();
  if (isResponse(context)) return context;

  const [runtimeResult, eventsResult, evaluationsResult] = await Promise.all([
    loadRuntime(context.admin),
    context.admin.from('reward_shadow_events')
      .select('id,source_domain,external_event_id,event_code,subject_user_id,amount_cents,event_kind,reversal_of_event_id,payload_digest,occurred_at,created_at')
      .order('created_at', { ascending: false }).limit(100),
    context.admin.from('reward_shadow_evaluations')
      .select('id,source_event_id,pilot_unit_id,rule_id,decision,direction,calculated_points,reason_code,rule_snapshot,runtime_snapshot,created_at')
      .order('created_at', { ascending: false }).limit(100),
  ]);
  if (runtimeResult.error || !runtimeResult.runtime || eventsResult.error || evaluationsResult.error) {
    return json({ error: 'REWARDS_SHADOW_ENGINE_READ_FAILED' }, 503);
  }
  return json({
    phase: 'shadow_earning_engine_v3',
    commercialStatus: 'inactive',
    ledgerEffects: false,
    ingestionMode: 'admin_replay_only',
    runtime: runtimeResult.runtime,
    events: eventsResult.data ?? [],
    evaluations: evaluationsResult.data ?? [],
  });
}

export async function POST(request: NextRequest) {
  const context = await requireSuperAdmin();
  if (isResponse(context)) return context;
  const body = await readBody(request);
  if (!body || typeof body.action !== 'string') return json({ error: 'INVALID_REQUEST' }, 400);

  if (body.action === 'configure_runtime') {
    const processingEnabled = typeof body.processingEnabled === 'boolean' ? body.processingEnabled : null;
    const maxAmountCents = boundedInteger(body.maxAmountCents, 1);
    const maxPointsPerEvent = boundedInteger(body.maxPointsPerEvent, 1);
    const maxEventsPerSubjectPerDay = boundedInteger(body.maxEventsPerSubjectPerDay, 1, 1000);
    const reason = cleanText(body.reason, 300, 4);
    if (processingEnabled === null || maxAmountCents === null || maxPointsPerEvent === null || maxEventsPerSubjectPerDay === null || !reason) {
      return json({ error: 'INVALID_RUNTIME_CONFIGURATION' }, 400);
    }
    const { data, error } = await context.admin.from('reward_shadow_runtime_config').update({
      processing_enabled: processingEnabled,
      max_amount_cents: maxAmountCents,
      max_points_per_event: maxPointsPerEvent,
      max_events_per_subject_per_day: maxEventsPerSubjectPerDay,
      updated_reason: reason,
      updated_by: context.userId,
      updated_at: new Date().toISOString(),
    }).eq('id', 1)
      .select('id,processing_enabled,max_amount_cents,max_points_per_event,max_events_per_subject_per_day,updated_reason,updated_at').single();
    if (error) return json({ error: 'RUNTIME_CONFIGURATION_FAILED' }, 503);
    return json({ ok: true, runtime: data, ledgerEffects: false });
  }

  if (body.action === 'ingest_event') {
    const sourceDomain = cleanSlug(body.sourceDomain);
    const externalEventId = typeof body.externalEventId === 'string' && EXTERNAL_EVENT_ID.test(body.externalEventId.trim()) ? body.externalEventId.trim() : null;
    const eventCode = cleanSlug(body.eventCode);
    const subjectUserId = typeof body.subjectUserId === 'string' && UUID.test(body.subjectUserId) ? body.subjectUserId : null;
    const amountCents = boundedInteger(body.amountCents);
    const payloadDigest = typeof body.payloadDigest === 'string' && DIGEST.test(body.payloadDigest) ? body.payloadDigest.toLowerCase() : null;
    const occurredAt = cleanOccurredAt(body.occurredAt);
    if (!sourceDomain || !externalEventId || !eventCode || !subjectUserId || amountCents === null || !payloadDigest || !occurredAt) {
      return json({ error: 'INVALID_SHADOW_EVENT' }, 400);
    }

    const canonical = { eventCode, subjectUserId, amountCents, payloadDigest, occurredAt };
    const { data: existing, error: existingError } = await context.admin.from('reward_shadow_events')
      .select('id,source_domain,external_event_id,event_code,subject_user_id,amount_cents,event_kind,reversal_of_event_id,payload_digest,occurred_at,created_at')
      .eq('source_domain', sourceDomain).eq('external_event_id', externalEventId).maybeSingle();
    if (existingError) return json({ error: 'SHADOW_EVENT_READ_FAILED' }, 503);
    if (existing) {
      const event = existing as ShadowEventRow;
      if (!originalMatches(event, canonical)) return json({ error: 'IDEMPOTENCY_CONFLICT' }, 409);
      const evaluated = await ensureOriginalEvaluation(context, event);
      if (evaluated.error || !evaluated.evaluation) return json({ error: evaluated.error ?? 'SHADOW_EVALUATION_FAILED' }, 503);
      return json({ ok: true, idempotentReplay: true, event, evaluation: evaluated.evaluation, ledgerEffects: false });
    }

    const { data: inserted, error: insertError } = await context.admin.from('reward_shadow_events').insert({
      source_domain: sourceDomain,
      external_event_id: externalEventId,
      event_code: eventCode,
      subject_user_id: subjectUserId,
      amount_cents: amountCents,
      event_kind: 'original',
      reversal_of_event_id: null,
      payload_digest: payloadDigest,
      occurred_at: occurredAt,
      created_by: context.userId,
    }).select('id,source_domain,external_event_id,event_code,subject_user_id,amount_cents,event_kind,reversal_of_event_id,payload_digest,occurred_at,created_at').single();

    let event = inserted as ShadowEventRow | null;
    if (insertError || !event) {
      const { data: raced } = await context.admin.from('reward_shadow_events')
        .select('id,source_domain,external_event_id,event_code,subject_user_id,amount_cents,event_kind,reversal_of_event_id,payload_digest,occurred_at,created_at')
        .eq('source_domain', sourceDomain).eq('external_event_id', externalEventId).maybeSingle();
      if (!raced || !originalMatches(raced as ShadowEventRow, canonical)) return json({ error: 'IDEMPOTENCY_CONFLICT' }, 409);
      event = raced as ShadowEventRow;
    }

    const evaluated = await ensureOriginalEvaluation(context, event);
    if (evaluated.error || !evaluated.evaluation) return json({ error: evaluated.error ?? 'SHADOW_EVALUATION_FAILED' }, 503);
    return json({ ok: true, idempotentReplay: false, event, evaluation: evaluated.evaluation, ledgerEffects: false }, 201);
  }

  if (body.action === 'reverse_event') {
    const sourceEventId = typeof body.sourceEventId === 'string' && UUID.test(body.sourceEventId) ? body.sourceEventId : null;
    const externalEventId = typeof body.externalEventId === 'string' && EXTERNAL_EVENT_ID.test(body.externalEventId.trim()) ? body.externalEventId.trim() : null;
    const payloadDigest = typeof body.payloadDigest === 'string' && DIGEST.test(body.payloadDigest) ? body.payloadDigest.toLowerCase() : null;
    const occurredAt = cleanOccurredAt(body.occurredAt);
    if (!sourceEventId || !externalEventId || !payloadDigest || !occurredAt) return json({ error: 'INVALID_REVERSAL' }, 400);

    const { data: originalData, error: originalError } = await context.admin.from('reward_shadow_events')
      .select('id,source_domain,external_event_id,event_code,subject_user_id,amount_cents,event_kind,reversal_of_event_id,payload_digest,occurred_at,created_at')
      .eq('id', sourceEventId).maybeSingle();
    const original = originalData as ShadowEventRow | null;
    if (originalError || !original || original.event_kind !== 'original') return json({ error: 'ORIGINAL_EVENT_NOT_FOUND' }, 404);

    const originalEvaluationResult = await ensureOriginalEvaluation(context, original);
    if (originalEvaluationResult.error || !originalEvaluationResult.evaluation) {
      return json({ error: originalEvaluationResult.error ?? 'ORIGINAL_EVALUATION_FAILED' }, 503);
    }
    const originalEvaluation = originalEvaluationResult.evaluation;

    const { data: priorReversal, error: priorError } = await context.admin.from('reward_shadow_events')
      .select('id,source_domain,external_event_id,event_code,subject_user_id,amount_cents,event_kind,reversal_of_event_id,payload_digest,occurred_at,created_at')
      .eq('reversal_of_event_id', original.id).maybeSingle();
    if (priorError) return json({ error: 'REVERSAL_READ_FAILED' }, 503);
    if (priorReversal) {
      const prior = priorReversal as ShadowEventRow;
      if (prior.external_event_id !== externalEventId || prior.payload_digest.toLowerCase() !== payloadDigest) {
        return json({ error: 'ORIGINAL_ALREADY_REVERSED' }, 409);
      }
      const evaluation = await loadEvaluation(context.admin, prior.id);
      if (evaluation.error || !evaluation.evaluation) return json({ error: 'REVERSAL_EVALUATION_READ_FAILED' }, 503);
      return json({ ok: true, idempotentReplay: true, event: prior, evaluation: evaluation.evaluation, ledgerEffects: false });
    }

    const { data: reversalData, error: reversalError } = await context.admin.from('reward_shadow_events').insert({
      source_domain: original.source_domain,
      external_event_id: externalEventId,
      event_code: original.event_code,
      subject_user_id: original.subject_user_id,
      amount_cents: original.amount_cents,
      event_kind: 'reversal',
      reversal_of_event_id: original.id,
      payload_digest: payloadDigest,
      occurred_at: occurredAt,
      created_by: context.userId,
    }).select('id,source_domain,external_event_id,event_code,subject_user_id,amount_cents,event_kind,reversal_of_event_id,payload_digest,occurred_at,created_at').single();
    if (reversalError || !reversalData) return json({ error: 'REVERSAL_CREATE_FAILED' }, 409);
    const reversal = reversalData as ShadowEventRow;

    const reversalPoints = originalEvaluation.direction === 'credit' ? originalEvaluation.calculated_points : 0;
    const { data: evaluationData, error: evaluationError } = await context.admin.from('reward_shadow_evaluations').insert({
      source_event_id: reversal.id,
      pilot_unit_id: originalEvaluation.pilot_unit_id,
      rule_id: originalEvaluation.rule_id,
      decision: 'reversal',
      direction: 'debit',
      calculated_points: reversalPoints,
      reason_code: 'source_event_reversed',
      rule_snapshot: {
        originalEventId: original.id,
        originalEvaluationId: originalEvaluation.id,
        originalDecision: originalEvaluation.decision,
        originalDirection: originalEvaluation.direction,
        originalCalculatedPoints: originalEvaluation.calculated_points,
      },
      runtime_snapshot: {
        phase: 'shadow_earning_engine_v3',
        nonBinding: true,
        ledgerEffects: false,
        reversalBypassesKillSwitch: true,
      },
      created_by: context.userId,
    }).select('id,source_event_id,pilot_unit_id,rule_id,decision,direction,calculated_points,reason_code,rule_snapshot,runtime_snapshot,created_at').single();
    if (evaluationError || !evaluationData) return json({ error: 'REVERSAL_EVALUATION_WRITE_FAILED' }, 503);

    return json({ ok: true, idempotentReplay: false, event: reversal, evaluation: evaluationData, ledgerEffects: false }, 201);
  }

  return json({ error: 'UNSUPPORTED_ACTION' }, 400);
}
