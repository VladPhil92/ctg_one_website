import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient, createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { calculateRewardPreview, type RewardPilotCalculationType } from '@/lib/rewards/pilot-simulation';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 24 * 1024;
const SLUG = /^[a-z0-9][a-z0-9_.-]{1,63}$/;
const UNIT_CODE = /^[a-z0-9][a-z0-9_-]{1,47}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STAGES = new Set(['draft', 'validated', 'archived']);
const CALCULATION_TYPES = new Set<RewardPilotCalculationType>(['fixed_points', 'points_per_cop_block']);
const MAX_DOMAIN_VALUE = 1_000_000_000_000;

type JsonRecord = Record<string, unknown>;

type AdminContext = {
  userId: string;
  admin: ReturnType<typeof createAdminClient>;
};

function json(body: unknown, status = 200) {
  const response = NextResponse.json(body, { status });
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

function boundedInteger(value: unknown, { min = 0, max = MAX_DOMAIN_VALUE } = {}) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max ? value : null;
}

function optionalBoundedInteger(value: unknown, min = 1) {
  if (value === null || value === undefined || value === '') return null;
  return boundedInteger(value, { min });
}

function cleanText(value: unknown, max: number, min = 0) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length >= min && text.length <= max ? text : null;
}

function cleanSlug(value: unknown, pattern = SLUG) {
  if (typeof value !== 'string') return null;
  const slug = value.trim().toLowerCase();
  return pattern.test(slug) ? slug : null;
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
    return json({ error: 'REWARDS_CONTROL_PLANE_UNAVAILABLE' }, 503);
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

function isResponse(value: AdminContext | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}

export async function GET() {
  const context = await requireSuperAdmin();
  if (isResponse(context)) return context;

  const [unitsResult, rulesResult, simulationsResult] = await Promise.all([
    context.admin.from('reward_pilot_units')
      .select('id,code,name,source_domain,stage,notes,created_at,updated_at')
      .order('created_at', { ascending: false }).limit(100),
    context.admin.from('reward_rule_drafts')
      .select('id,pilot_unit_id,name,event_code,calculation_type,fixed_points,points_per_block,cop_block_cents,minimum_amount_cents,maximum_points_per_event,stage,notes,created_at,updated_at')
      .order('created_at', { ascending: false }).limit(200),
    context.admin.from('reward_rule_simulations')
      .select('id,rule_id,input_amount_cents,calculated_points,calculation_snapshot,created_at')
      .order('created_at', { ascending: false }).limit(100),
  ]);

  const failure = unitsResult.error ?? rulesResult.error ?? simulationsResult.error;
  if (failure) return json({ error: 'REWARDS_CONTROL_PLANE_READ_FAILED' }, 503);

  return json({
    phase: 'pilot_control_plane_v2',
    commercialStatus: 'inactive',
    ledgerEffects: false,
    units: unitsResult.data ?? [],
    rules: rulesResult.data ?? [],
    simulations: simulationsResult.data ?? [],
  });
}

export async function POST(request: NextRequest) {
  const context = await requireSuperAdmin();
  if (isResponse(context)) return context;

  const body = await readBody(request);
  if (!body || typeof body.action !== 'string') return json({ error: 'INVALID_REQUEST' }, 400);

  if (body.action === 'create_unit') {
    const code = cleanSlug(body.code, UNIT_CODE);
    const name = cleanText(body.name, 100, 2);
    const sourceDomain = cleanSlug(body.sourceDomain);
    const notes = body.notes === '' || body.notes === null || body.notes === undefined ? null : cleanText(body.notes, 600);
    if (!code || !name || !sourceDomain || (body.notes && notes === null)) return json({ error: 'INVALID_UNIT' }, 400);

    const { data, error } = await context.admin.from('reward_pilot_units').insert({
      code, name, source_domain: sourceDomain, notes, created_by: context.userId,
    }).select('id,code,name,source_domain,stage,notes,created_at,updated_at').single();
    if (error) return json({ error: 'UNIT_CREATE_FAILED' }, 409);
    return json({ ok: true, unit: data }, 201);
  }

  if (body.action === 'create_rule') {
    const pilotUnitId = typeof body.pilotUnitId === 'string' && UUID.test(body.pilotUnitId) ? body.pilotUnitId : null;
    const name = cleanText(body.name, 120, 2);
    const eventCode = cleanSlug(body.eventCode);
    const calculationType = typeof body.calculationType === 'string' && CALCULATION_TYPES.has(body.calculationType as RewardPilotCalculationType)
      ? body.calculationType as RewardPilotCalculationType : null;
    const minimumAmountCents = boundedInteger(body.minimumAmountCents);
    const maximumPointsPerEvent = optionalBoundedInteger(body.maximumPointsPerEvent);
    const fixedPoints = optionalBoundedInteger(body.fixedPoints);
    const pointsPerBlock = optionalBoundedInteger(body.pointsPerBlock);
    const copBlockCents = optionalBoundedInteger(body.copBlockCents);
    const notes = body.notes === '' || body.notes === null || body.notes === undefined ? null : cleanText(body.notes, 600);

    const formulaValid = calculationType === 'fixed_points'
      ? fixedPoints !== null && pointsPerBlock === null && copBlockCents === null
      : calculationType === 'points_per_cop_block'
        ? fixedPoints === null && pointsPerBlock !== null && copBlockCents !== null
        : false;

    if (!pilotUnitId || !name || !eventCode || minimumAmountCents === null || !formulaValid || (body.notes && notes === null)) {
      return json({ error: 'INVALID_RULE' }, 400);
    }

    const { data, error } = await context.admin.from('reward_rule_drafts').insert({
      pilot_unit_id: pilotUnitId,
      name,
      event_code: eventCode,
      calculation_type: calculationType,
      fixed_points: fixedPoints,
      points_per_block: pointsPerBlock,
      cop_block_cents: copBlockCents,
      minimum_amount_cents: minimumAmountCents,
      maximum_points_per_event: maximumPointsPerEvent,
      notes,
      created_by: context.userId,
    }).select('id,pilot_unit_id,name,event_code,calculation_type,fixed_points,points_per_block,cop_block_cents,minimum_amount_cents,maximum_points_per_event,stage,notes,created_at,updated_at').single();
    if (error) return json({ error: 'RULE_CREATE_FAILED' }, 409);
    return json({ ok: true, rule: data }, 201);
  }

  if (body.action === 'set_stage') {
    const entity = body.entity === 'unit' || body.entity === 'rule' ? body.entity : null;
    const id = typeof body.id === 'string' && UUID.test(body.id) ? body.id : null;
    const stage = typeof body.stage === 'string' && STAGES.has(body.stage) ? body.stage : null;
    if (!entity || !id || !stage) return json({ error: 'INVALID_STAGE_CHANGE' }, 400);

    const table = entity === 'unit' ? 'reward_pilot_units' : 'reward_rule_drafts';
    const { error } = await context.admin.from(table).update({ stage }).eq('id', id);
    if (error) return json({ error: 'STAGE_CHANGE_FAILED' }, 409);
    return json({ ok: true, stage });
  }

  if (body.action === 'simulate_rule') {
    const ruleId = typeof body.ruleId === 'string' && UUID.test(body.ruleId) ? body.ruleId : null;
    const inputAmountCents = boundedInteger(body.inputAmountCents);
    if (!ruleId || inputAmountCents === null) return json({ error: 'INVALID_SIMULATION' }, 400);

    const { data: rule, error: ruleError } = await context.admin.from('reward_rule_drafts')
      .select('id,pilot_unit_id,name,event_code,calculation_type,fixed_points,points_per_block,cop_block_cents,minimum_amount_cents,maximum_points_per_event,stage')
      .eq('id', ruleId).maybeSingle();
    if (ruleError || !rule || rule.stage === 'archived') return json({ error: 'RULE_NOT_SIMULATABLE' }, 404);

    let preview;
    try {
      preview = calculateRewardPreview({
        calculationType: rule.calculation_type as RewardPilotCalculationType,
        fixedPoints: rule.fixed_points,
        pointsPerBlock: rule.points_per_block,
        copBlockCents: rule.cop_block_cents,
        minimumAmountCents: rule.minimum_amount_cents,
        maximumPointsPerEvent: rule.maximum_points_per_event,
        inputAmountCents,
      });
    } catch {
      return json({ error: 'SIMULATION_DOMAIN_ERROR' }, 400);
    }

    const snapshot = {
      phase: 'pilot_control_plane_v2',
      nonBinding: true,
      ledgerEffects: false,
      rule: {
        id: rule.id,
        pilotUnitId: rule.pilot_unit_id,
        eventCode: rule.event_code,
        calculationType: rule.calculation_type,
        fixedPoints: rule.fixed_points,
        pointsPerBlock: rule.points_per_block,
        copBlockCents: rule.cop_block_cents,
        minimumAmountCents: rule.minimum_amount_cents,
        maximumPointsPerEvent: rule.maximum_points_per_event,
        stage: rule.stage,
      },
      inputAmountCents,
      result: preview,
    };

    const { data, error } = await context.admin.from('reward_rule_simulations').insert({
      rule_id: rule.id,
      input_amount_cents: inputAmountCents,
      calculated_points: preview.points,
      calculation_snapshot: snapshot,
      created_by: context.userId,
    }).select('id,rule_id,input_amount_cents,calculated_points,calculation_snapshot,created_at').single();
    if (error) return json({ error: 'SIMULATION_WRITE_FAILED' }, 503);

    return json({ ok: true, simulation: data, preview }, 201);
  }

  return json({ error: 'UNSUPPORTED_ACTION' }, 400);
}
