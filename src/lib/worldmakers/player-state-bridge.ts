import 'server-only';

import { createHash, createHmac, randomBytes } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

const WORLDMAKERS_SUPABASE_URL = process.env.WORLDMAKERS_SUPABASE_URL?.trim();
const WORLDMAKERS_SUPABASE_PUBLISHABLE_KEY =
  process.env.WORLDMAKERS_SUPABASE_PUBLISHABLE_KEY?.trim();
const WORLDMAKERS_BRIDGE_HMAC_SECRET = process.env.WORLDMAKERS_BRIDGE_HMAC_SECRET?.trim();

export const isWorldMakersPlayerStateBridgeConfigured = Boolean(
  WORLDMAKERS_SUPABASE_URL &&
    WORLDMAKERS_SUPABASE_PUBLISHABLE_KEY &&
    WORLDMAKERS_BRIDGE_HMAC_SECRET &&
    WORLDMAKERS_BRIDGE_HMAC_SECRET.length >= 32,
);

const remoteStateSchema = z.object({
  schemaVersion: z.literal(1),
  exists: z.boolean(),
  playerProfileId: z.string().min(1),
  revision: z.number().int().min(0),
  displayName: z.string().nullable(),
  saves: z.array(z.unknown()),
  missions: z.array(z.unknown()),
  discoveries: z.array(z.unknown()),
  achievements: z.array(z.unknown()),
  updatedAt: z.string().nullable(),
});

export type WorldMakersRemotePlayerState = z.infer<typeof remoteStateSchema>;

export type WorldMakersPlayerStateWrite = {
  expectedRevision: number;
  eventId: string;
  displayName: string;
  saves: unknown[];
  missions: unknown[];
  discoveries: unknown[];
  achievements: unknown[];
};

export type WorldMakersBridgeErrorCode =
  | 'not_configured'
  | 'revision_conflict'
  | 'rejected'
  | 'upstream_unavailable'
  | 'invalid_upstream_response';

export class WorldMakersBridgeError extends Error {
  readonly code: WorldMakersBridgeErrorCode;

  constructor(code: WorldMakersBridgeErrorCode, message: string) {
    super(message);
    this.name = 'WorldMakersBridgeError';
    this.code = code;
  }
}

let bridgeClient: SupabaseClient | null = null;

function getBridgeClient(): SupabaseClient {
  if (!isWorldMakersPlayerStateBridgeConfigured) {
    throw new WorldMakersBridgeError('not_configured', 'World Makers player-state bridge is not configured');
  }

  if (!bridgeClient) {
    bridgeClient = createClient(
      WORLDMAKERS_SUPABASE_URL!,
      WORLDMAKERS_SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      },
    );
  }

  return bridgeClient;
}

function buildSignature(input: {
  operation: 'read' | 'write';
  subject: string;
  timestamp: number;
  nonce: string;
  eventId: string | null;
  expectedRevision: number | null;
  payload: string;
}): string {
  if (!WORLDMAKERS_BRIDGE_HMAC_SECRET) {
    throw new WorldMakersBridgeError('not_configured', 'World Makers bridge secret is unavailable');
  }

  const payloadHash = createHash('sha256').update(input.payload, 'utf8').digest('hex');
  const canonical = [
    'v1',
    input.operation,
    input.subject,
    String(input.timestamp),
    input.nonce,
    input.eventId ?? '',
    input.expectedRevision === null ? '' : String(input.expectedRevision),
    payloadHash,
  ].join('|');

  return createHmac('sha256', WORLDMAKERS_BRIDGE_HMAC_SECRET)
    .update(canonical, 'utf8')
    .digest('hex');
}

function mapBridgeFailure(message: string | undefined): WorldMakersBridgeError {
  const normalized = message ?? '';

  if (normalized.includes('bridge_profile_conflict')) {
    return new WorldMakersBridgeError('revision_conflict', 'Player-state revision conflict');
  }

  if (
    normalized.includes('bridge_auth_failed') ||
    normalized.includes('bridge_replay') ||
    normalized.includes('bridge_invalid_') ||
    normalized.includes('bridge_timestamp_expired')
  ) {
    return new WorldMakersBridgeError('rejected', 'World Makers bridge rejected the request');
  }

  if (normalized.includes('bridge_secret_unavailable')) {
    return new WorldMakersBridgeError('upstream_unavailable', 'World Makers bridge secret is unavailable');
  }

  return new WorldMakersBridgeError('upstream_unavailable', 'World Makers player-state store is unavailable');
}

async function invokeBridge(input: {
  operation: 'read' | 'write';
  subject: string;
  eventId: string | null;
  expectedRevision: number | null;
  payload: string;
}): Promise<WorldMakersRemotePlayerState> {
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = randomBytes(24).toString('base64url');
  const signature = buildSignature({ ...input, timestamp, nonce });
  const client = getBridgeClient();

  const { data, error } = await client.rpc('wm_bridge_player_state', {
    p_operation: input.operation,
    p_subject: input.subject,
    p_timestamp: timestamp,
    p_nonce: nonce,
    p_event_id: input.eventId,
    p_expected_revision: input.expectedRevision,
    p_payload: input.payload,
    p_signature: signature,
  });

  if (error) {
    throw mapBridgeFailure(error.message);
  }

  const parsed = remoteStateSchema.safeParse(data);
  if (!parsed.success) {
    throw new WorldMakersBridgeError(
      'invalid_upstream_response',
      'World Makers player-state store returned an invalid response',
    );
  }

  return parsed.data;
}

export async function readWorldMakersPlayerState(
  ctgOneUserId: string,
): Promise<WorldMakersRemotePlayerState> {
  return invokeBridge({
    operation: 'read',
    subject: ctgOneUserId,
    eventId: null,
    expectedRevision: null,
    payload: '',
  });
}

export async function writeWorldMakersPlayerState(
  ctgOneUserId: string,
  input: WorldMakersPlayerStateWrite,
): Promise<WorldMakersRemotePlayerState> {
  const payload = JSON.stringify({
    displayName: input.displayName,
    saves: input.saves,
    missions: input.missions,
    discoveries: input.discoveries,
    achievements: input.achievements,
  });

  return invokeBridge({
    operation: 'write',
    subject: ctgOneUserId,
    eventId: input.eventId,
    expectedRevision: input.expectedRevision,
    payload,
  });
}
