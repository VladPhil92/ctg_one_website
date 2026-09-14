import 'server-only';

import { createAdminClient } from '@/lib/supabase/server';
import { evaluateShadowReward, type RewardShadowRule, type RewardShadowRuntime } from '@/lib/rewards/shadow-evaluation';
import type { RewardPilotCalculationType } from '@/lib/rewards/pilot-simulation';

type ShadowAdmin = ReturnType<typeof createAdminClient>;

export type SignedSourceConnector = {
  id: string;
  pilot_unit_id: string;
  connector_code: string;
  source_domain: string;
  key_fingerprint_sha256: string;
};

export type SignedSourceOriginalPayload = {
  eventKind: 'original';
  externalEventId: string;
  eventCode: string;
  subjectUserId: string;
  amountCents: number;
  occurredAt: string;
};

export type SignedSourceReversalPayload = {
  eventKind: 'reversal';
  externalEventId: string;
  eventCode: string;
  reversalOfExternalEventId: string;
  occurredAt: string;
};

export type SignedSourcePayload = SignedSourceOriginalPayload | SignedSourceReversalPayload;

type RuntimeRow = {
  processing_enabled: boolean;
  max_amount_cents: number;
  max_points_per_event: number;
  max_events_per_subject_per_day: number;
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

export type SignedSourceProcessingResult =
  | { ok: true; status: 200 | 201; idempotentReplay: boolean; event: ShadowEventRow; evaluation: EvaluationRow }
  | { ok: false; status: 404 | 409 | 503; error: string };

const EVENT_SELECT = 'id,source_domain,external_event_id,event_code,subject_user_id,amount_cents,event_kind,reversal_of_event_id,payload_digest,occurred_at,created_at';
const EVALUATION_SELECT = 'id,source_event_id,pilot_unit_id,rule_id,decision,direction,calculated_points,reason_code,rule_snapshot,runtime_snapshot,created_at';

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
    .select(EVALUATION_SELECT).eq('source_event_id', sourceEventId).maybeSingle();
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

async function ensureOriginalEvaluation(admin: ShadowAdmin, connector: SignedSourceConnector, event: ShadowEventRow) {
  const existing = await loadEvaluation(admin, event.id);
  if (existing.error) return { evaluation: null, error: 'SOURCE_EVALUATION_READ_FAILED' };
  if (existing.evaluation) return { evaluation: existing.evaluation, error: null };

  const [runtimeResult, unitResult] = await Promise.all([
    admin.from('reward_shadow_runtime_config')
      .select('processing_enabled,max_amount_cents,max_points_per_event,max_events_per_subject_per_day')
      .eq('id', 1).maybeSingle(),
    admin.from('reward_pilot_units')
      .select('id,source_domain,stage')
      .eq('id', connector.pilot_unit_id).maybeSingle(),
  ]);
  const runtime = runtimeResult.data as RuntimeRow | null;
  if (runtimeResult.error || !runtime) return { evaluation: null, error: 'SOURCE_RUNTIME_READ_FAILED' };
  if (unitResult.error) return { evaluation: null, error: 'SOURCE_UNIT_READ_FAILED' };
  const unit = unitResult.data;
  const validatedUnitAvailable = Boolean(
    unit && unit.stage === 'validated' && unit.source_domain === connector.source_domain,
  );

  let rule: RewardShadowRule | null = null;
  if (validatedUnitAvailable && unit) {
    const { data: ruleRow, error: ruleError } = await admin.from('reward_rule_drafts')
      .select('id,pilot_unit_id,event_code,calculation_type,fixed_points,points_per_block,cop_block_cents,minimum_amount_cents,maximum_points_per_event,stage')
      .eq('pilot_unit_id', unit.id)
      .eq('event_code', event.event_code)
      .eq('stage', 'validated')
      .maybeSingle();
    if (ruleError) return { evaluation: null, error: 'SOURCE_RULE_READ_FAILED' };
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

  const daily = await countDailyOriginalEvents(admin, event);
  if (daily.error) return { evaluation: null, error: 'SOURCE_DAILY_LIMIT_READ_FAILED' };

  let result;
  try {
    result = evaluateShadowReward({
      runtime: runtimeDomain(runtime),
      validatedUnitAvailable,
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

  const { data, error } = await admin.from('reward_shadow_evaluations').insert({
    source_event_id: event.id,
    pilot_unit_id: validatedUnitAvailable && unit ? unit.id : null,
    rule_id: rule?.id ?? null,
    decision: result.decision,
    direction: result.direction,
    calculated_points: result.calculatedPoints,
    reason_code: result.reasonCode,
    rule_snapshot: rule ? {
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
    } : {},
    runtime_snapshot: {
      phase: 'signed_source_connectors_v4',
      nonBinding: true,
      ledgerEffects: false,
      ingestionMode: 'signed_source_ed25519',
      connectorId: connector.id,
      connectorCode: connector.connector_code,
      keyFingerprintSha256: connector.key_fingerprint_sha256,
      processingEnabled: runtime.processing_enabled,
      maxAmountCents: runtime.max_amount_cents,
      maxPointsPerEvent: runtime.max_points_per_event,
      maxEventsPerSubjectPerDay: runtime.max_events_per_subject_per_day,
      subjectDailyOriginalCount: daily.count,
    },
    created_by: null,
  }).select(EVALUATION_SELECT).single();

  if (!error && data) return { evaluation: data as EvaluationRow, error: null };
  const raced = await loadEvaluation(admin, event.id);
  if (!raced.error && raced.evaluation) return { evaluation: raced.evaluation, error: null };
  return { evaluation: null, error: 'SOURCE_EVALUATION_WRITE_FAILED' };
}

async function ensureReversalEvaluation(admin: ShadowAdmin, connector: SignedSourceConnector, original: ShadowEventRow, reversal: ShadowEventRow) {
  const existing = await loadEvaluation(admin, reversal.id);
  if (existing.error) return { evaluation: null, error: 'SOURCE_REVERSAL_EVALUATION_READ_FAILED' };
  if (existing.evaluation) return { evaluation: existing.evaluation, error: null };

  const originalResult = await ensureOriginalEvaluation(admin, connector, original);
  if (originalResult.error || !originalResult.evaluation) {
    return { evaluation: null, error: originalResult.error ?? 'SOURCE_ORIGINAL_EVALUATION_FAILED' };
  }
  const originalEvaluation = originalResult.evaluation;
  const reversalPoints = originalEvaluation.direction === 'credit' ? originalEvaluation.calculated_points : 0;

  const { data, error } = await admin.from('reward_shadow_evaluations').insert({
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
      phase: 'signed_source_connectors_v4',
      nonBinding: true,
      ledgerEffects: false,
      ingestionMode: 'signed_source_ed25519',
      connectorId: connector.id,
      connectorCode: connector.connector_code,
      keyFingerprintSha256: connector.key_fingerprint_sha256,
      reversalBypassesKillSwitch: true,
    },
    created_by: null,
  }).select(EVALUATION_SELECT).single();

  if (!error && data) return { evaluation: data as EvaluationRow, error: null };
  const raced = await loadEvaluation(admin, reversal.id);
  if (!raced.error && raced.evaluation) return { evaluation: raced.evaluation, error: null };
  return { evaluation: null, error: 'SOURCE_REVERSAL_EVALUATION_WRITE_FAILED' };
}

function originalMatches(event: ShadowEventRow, payload: SignedSourceOriginalPayload, payloadDigest: string) {
  return event.event_kind === 'original'
    && event.event_code === payload.eventCode
    && event.subject_user_id === payload.subjectUserId
    && event.amount_cents === payload.amountCents
    && event.payload_digest.toLowerCase() === payloadDigest.toLowerCase()
    && new Date(event.occurred_at).getTime() === new Date(payload.occurredAt).getTime();
}

function reversalMatches(event: ShadowEventRow, originalId: string, payload: SignedSourceReversalPayload, payloadDigest: string) {
  return event.event_kind === 'reversal'
    && event.reversal_of_event_id === originalId
    && event.external_event_id === payload.externalEventId
    && event.event_code === payload.eventCode
    && event.payload_digest.toLowerCase() === payloadDigest.toLowerCase()
    && new Date(event.occurred_at).getTime() === new Date(payload.occurredAt).getTime();
}

async function processOriginal(admin: ShadowAdmin, connector: SignedSourceConnector, payload: SignedSourceOriginalPayload, payloadDigest: string): Promise<SignedSourceProcessingResult> {
  const { data: existingData, error: existingError } = await admin.from('reward_shadow_events')
    .select(EVENT_SELECT)
    .eq('source_domain', connector.source_domain)
    .eq('external_event_id', payload.externalEventId)
    .maybeSingle();
  if (existingError) return { ok: false, status: 503, error: 'SOURCE_EVENT_READ_FAILED' };

  let event = existingData as ShadowEventRow | null;
  let idempotentReplay = Boolean(event);
  if (event && !originalMatches(event, payload, payloadDigest)) {
    return { ok: false, status: 409, error: 'IDEMPOTENCY_CONFLICT' };
  }

  if (!event) {
    const { data, error } = await admin.from('reward_shadow_events').insert({
      source_domain: connector.source_domain,
      external_event_id: payload.externalEventId,
      event_code: payload.eventCode,
      subject_user_id: payload.subjectUserId,
      amount_cents: payload.amountCents,
      event_kind: 'original',
      reversal_of_event_id: null,
      payload_digest: payloadDigest,
      occurred_at: payload.occurredAt,
      created_by: null,
    }).select(EVENT_SELECT).single();
    event = data as ShadowEventRow | null;
    if (error || !event) {
      const { data: raced, error: racedError } = await admin.from('reward_shadow_events')
        .select(EVENT_SELECT)
        .eq('source_domain', connector.source_domain)
        .eq('external_event_id', payload.externalEventId)
        .maybeSingle();
      if (racedError || !raced) return { ok: false, status: 503, error: 'SOURCE_EVENT_WRITE_FAILED' };
      if (!originalMatches(raced as ShadowEventRow, payload, payloadDigest)) {
        return { ok: false, status: 409, error: 'IDEMPOTENCY_CONFLICT' };
      }
      event = raced as ShadowEventRow;
      idempotentReplay = true;
    }
  }

  const evaluationResult = await ensureOriginalEvaluation(admin, connector, event);
  if (evaluationResult.error || !evaluationResult.evaluation) {
    return { ok: false, status: 503, error: evaluationResult.error ?? 'SOURCE_EVALUATION_FAILED' };
  }
  return {
    ok: true,
    status: idempotentReplay ? 200 : 201,
    idempotentReplay,
    event,
    evaluation: evaluationResult.evaluation,
  };
}

async function processReversal(admin: ShadowAdmin, connector: SignedSourceConnector, payload: SignedSourceReversalPayload, payloadDigest: string): Promise<SignedSourceProcessingResult> {
  const { data: originalData, error: originalError } = await admin.from('reward_shadow_events')
    .select(EVENT_SELECT)
    .eq('source_domain', connector.source_domain)
    .eq('external_event_id', payload.reversalOfExternalEventId)
    .maybeSingle();
  const original = originalData as ShadowEventRow | null;
  if (originalError) return { ok: false, status: 503, error: 'SOURCE_ORIGINAL_READ_FAILED' };
  if (!original || original.event_kind !== 'original') return { ok: false, status: 404, error: 'SOURCE_ORIGINAL_NOT_FOUND' };
  if (original.event_code !== payload.eventCode) return { ok: false, status: 409, error: 'SOURCE_REVERSAL_EVENT_CODE_MISMATCH' };

  const { data: externalCollision, error: collisionError } = await admin.from('reward_shadow_events')
    .select(EVENT_SELECT)
    .eq('source_domain', connector.source_domain)
    .eq('external_event_id', payload.externalEventId)
    .maybeSingle();
  if (collisionError) return { ok: false, status: 503, error: 'SOURCE_REVERSAL_READ_FAILED' };
  if (externalCollision) {
    const collision = externalCollision as ShadowEventRow;
    if (!reversalMatches(collision, original.id, payload, payloadDigest)) {
      return { ok: false, status: 409, error: 'IDEMPOTENCY_CONFLICT' };
    }
    const evaluationResult = await ensureReversalEvaluation(admin, connector, original, collision);
    if (evaluationResult.error || !evaluationResult.evaluation) {
      return { ok: false, status: 503, error: evaluationResult.error ?? 'SOURCE_REVERSAL_EVALUATION_FAILED' };
    }
    return { ok: true, status: 200, idempotentReplay: true, event: collision, evaluation: evaluationResult.evaluation };
  }

  const { data: priorData, error: priorError } = await admin.from('reward_shadow_events')
    .select(EVENT_SELECT).eq('reversal_of_event_id', original.id).maybeSingle();
  if (priorError) return { ok: false, status: 503, error: 'SOURCE_REVERSAL_READ_FAILED' };
  if (priorData) {
    const prior = priorData as ShadowEventRow;
    if (!reversalMatches(prior, original.id, payload, payloadDigest)) {
      return { ok: false, status: 409, error: 'SOURCE_ORIGINAL_ALREADY_REVERSED' };
    }
    const evaluationResult = await ensureReversalEvaluation(admin, connector, original, prior);
    if (evaluationResult.error || !evaluationResult.evaluation) {
      return { ok: false, status: 503, error: evaluationResult.error ?? 'SOURCE_REVERSAL_EVALUATION_FAILED' };
    }
    return { ok: true, status: 200, idempotentReplay: true, event: prior, evaluation: evaluationResult.evaluation };
  }

  const { data, error } = await admin.from('reward_shadow_events').insert({
    source_domain: connector.source_domain,
    external_event_id: payload.externalEventId,
    event_code: original.event_code,
    subject_user_id: original.subject_user_id,
    amount_cents: original.amount_cents,
    event_kind: 'reversal',
    reversal_of_event_id: original.id,
    payload_digest: payloadDigest,
    occurred_at: payload.occurredAt,
    created_by: null,
  }).select(EVENT_SELECT).single();
  let reversal = data as ShadowEventRow | null;
  let idempotentReplay = false;
  if (error || !reversal) {
    const { data: raced, error: racedError } = await admin.from('reward_shadow_events')
      .select(EVENT_SELECT).eq('reversal_of_event_id', original.id).maybeSingle();
    if (racedError || !raced) return { ok: false, status: 503, error: 'SOURCE_REVERSAL_WRITE_FAILED' };
    if (!reversalMatches(raced as ShadowEventRow, original.id, payload, payloadDigest)) {
      return { ok: false, status: 409, error: 'SOURCE_ORIGINAL_ALREADY_REVERSED' };
    }
    reversal = raced as ShadowEventRow;
    idempotentReplay = true;
  }

  const evaluationResult = await ensureReversalEvaluation(admin, connector, original, reversal);
  if (evaluationResult.error || !evaluationResult.evaluation) {
    return { ok: false, status: 503, error: evaluationResult.error ?? 'SOURCE_REVERSAL_EVALUATION_FAILED' };
  }
  return {
    ok: true,
    status: idempotentReplay ? 200 : 201,
    idempotentReplay,
    event: reversal,
    evaluation: evaluationResult.evaluation,
  };
}

export async function processSignedSourcePayload(admin: ShadowAdmin, connector: SignedSourceConnector, payload: SignedSourcePayload, payloadDigest: string) {
  if (payload.eventKind === 'reversal') {
    return processReversal(admin, connector, payload, payloadDigest);
  }
  return processOriginal(admin, connector, payload, payloadDigest);
}
