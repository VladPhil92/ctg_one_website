import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createAuthenticatedRequestContext,
  isSupabaseConfigured,
  type AuthenticatedRequestContext,
} from '@/lib/supabase/server';
import {
  isWorldMakersPlayerStateBridgeConfigured,
  readWorldMakersPlayerState,
  writeWorldMakersPlayerState,
  WorldMakersBridgeError,
  type WorldMakersRemotePlayerState,
} from '@/lib/worldmakers/player-state-bridge';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_BODY_BYTES = 64 * 1024;
const EVENT_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

const writeStateSchema = z.object({
  schemaVersion: z.literal(1),
  expectedRevision: z.number().int().min(0).max(2_147_483_647),
  saves: z.array(z.unknown()).max(32),
  missions: z.array(z.unknown()).max(512),
  discoveries: z.array(z.unknown()).max(2048),
  achievements: z.array(z.unknown()).max(512),
}).strict();

const PRIVATE_HEADERS = {
  'Cache-Control': 'no-store',
  Vary: 'Authorization, Cookie',
};

function displayNameFor(context: AuthenticatedRequestContext) {
  const value = context.user.user_metadata?.full_name;
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 80) : 'Maker';
}

function apiState(context: AuthenticatedRequestContext, state: WorldMakersRemotePlayerState) {
  return {
    schemaVersion: 2,
    player: {
      id: context.user.id,
      displayName: displayNameFor(context),
      emailVerified: Boolean(context.user.email_confirmed_at),
    },
    profile: {
      exists: state.exists,
      revision: state.revision,
      updatedAt: state.updatedAt,
    },
    synchronization: {
      identity: 'connected',
      gameRuntime: state.exists ? 'synced' : 'awaiting_first_sync',
      cloudSave: 'connected',
    },
    saves: state.saves,
    missions: state.missions,
    discoveries: state.discoveries,
    achievements: state.achievements,
    capabilities: {
      cloudSave: true,
      missionSync: true,
      discoverySync: true,
      achievementSync: true,
    },
  };
}

function bridgeErrorResponse(error: unknown) {
  if (error instanceof WorldMakersBridgeError) {
    if (error.code === 'revision_conflict') {
      return NextResponse.json(
        { error: 'revision_conflict' },
        { status: 409, headers: PRIVATE_HEADERS },
      );
    }

    if (error.code === 'not_configured' || error.code === 'upstream_unavailable') {
      return NextResponse.json(
        { error: 'player_state_unavailable' },
        { status: 503, headers: PRIVATE_HEADERS },
      );
    }
  }

  return NextResponse.json(
    { error: 'player_state_bridge_error' },
    { status: 502, headers: PRIVATE_HEADERS },
  );
}

async function readJsonWithByteLimit(request: NextRequest): Promise<
  | { ok: true; value: unknown }
  | { ok: false; tooLarge: boolean }
> {
  const contentLengthHeader = request.headers.get('content-length');
  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader);
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return { ok: false, tooLarge: true };
    }
  }

  const reader = request.body?.getReader();
  if (!reader) return { ok: false, tooLarge: false };

  const decoder = new TextDecoder();
  let totalBytes = 0;
  let text = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_BODY_BYTES) {
        await reader.cancel();
        return { ok: false, tooLarge: true };
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, tooLarge: false };
  }
}

function isCookieWriteOriginAllowed(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin) return true;

  try {
    const originUrl = new URL(origin);
    const requestHost = request.headers.get('host')?.toLowerCase();
    return Boolean(requestHost && originUrl.host.toLowerCase() === requestHost);
  } catch {
    return false;
  }
}

async function authenticate(request: NextRequest) {
  if (!isSupabaseConfigured) return null;
  return createAuthenticatedRequestContext(request);
}

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured || !isWorldMakersPlayerStateBridgeConfigured) {
    return NextResponse.json(
      { error: 'player_state_unavailable' },
      { status: 503, headers: PRIVATE_HEADERS },
    );
  }

  const context = await authenticate(request);
  if (!context) {
    return NextResponse.json(
      { error: 'authentication_required' },
      { status: 401, headers: PRIVATE_HEADERS },
    );
  }

  try {
    const state = await readWorldMakersPlayerState(context.user.id);
    return NextResponse.json(apiState(context, state), { headers: PRIVATE_HEADERS });
  } catch (error) {
    return bridgeErrorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  if (!isSupabaseConfigured || !isWorldMakersPlayerStateBridgeConfigured) {
    return NextResponse.json(
      { error: 'player_state_unavailable' },
      { status: 503, headers: PRIVATE_HEADERS },
    );
  }

  const context = await authenticate(request);
  if (!context) {
    return NextResponse.json(
      { error: 'authentication_required' },
      { status: 401, headers: PRIVATE_HEADERS },
    );
  }

  if (context.transport === 'cookie' && !isCookieWriteOriginAllowed(request)) {
    return NextResponse.json(
      { error: 'origin_not_allowed' },
      { status: 403, headers: PRIVATE_HEADERS },
    );
  }

  const eventId = request.headers.get('idempotency-key')?.trim() ?? '';
  if (!EVENT_ID_PATTERN.test(eventId)) {
    return NextResponse.json(
      { error: 'idempotency_key_required' },
      { status: 400, headers: PRIVATE_HEADERS },
    );
  }

  const rawBody = await readJsonWithByteLimit(request);
  if (!rawBody.ok) {
    return NextResponse.json(
      { error: rawBody.tooLarge ? 'payload_too_large' : 'invalid_payload' },
      { status: rawBody.tooLarge ? 413 : 400, headers: PRIVATE_HEADERS },
    );
  }

  const parsed = writeStateSchema.safeParse(rawBody.value);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_payload' },
      { status: 400, headers: PRIVATE_HEADERS },
    );
  }

  try {
    const state = await writeWorldMakersPlayerState(context.user.id, {
      ...parsed.data,
      eventId,
      displayName: displayNameFor(context),
    });
    return NextResponse.json(apiState(context, state), { headers: PRIVATE_HEADERS });
  } catch (error) {
    return bridgeErrorResponse(error);
  }
}
