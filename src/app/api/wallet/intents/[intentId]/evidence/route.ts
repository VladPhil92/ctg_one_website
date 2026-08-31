import { NextResponse } from 'next/server';

import { getDeploymentMetadata } from '@/lib/observability/deployment';
import { probeRuntimeSchemaCompatibility } from '@/lib/observability/runtime-schema';
import {
  createAdminClient,
  createAuthenticatedRequestContext,
  isSupabaseConfigured,
} from '@/lib/supabase/server';
import {
  buildWalletCanaryEvidenceBundleV1,
  normalizeWalletCanaryEvidenceIntent,
  normalizeWalletCanaryEvidenceObservation,
  WalletCanaryEvidenceError,
} from '@/lib/wallet/canary-evidence';
import { applyWalletCors, walletCorsPreflight } from '@/lib/wallet/cors';

const CORS_METHODS = ['GET', 'OPTIONS'] as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GIT_COMMIT_RE = /^[0-9a-f]{40}$/;
const EVIDENCE_SELECT = [
  'id',
  'status',
  'intent_type',
  'rail',
  'chain_id',
  'asset_symbol',
  'amount_base_units',
  'destination_address',
  'created_at',
  'authorized_at',
  'simulation_digest_sha256',
  'canary_client_commit_sha',
  'canary_client_bound_at',
  'tx_hash',
  'submitted_at',
  'chain_last_checked_at',
  'chain_observed_at',
  'chain_confirmed_at',
  'chain_block_number',
  'chain_confirmations',
  'chain_reconciliation_digest_sha256',
  'chain_failure_code',
  'settled_at',
].join(',');
const OBSERVATION_SELECT = [
  'id',
  'tx_hash',
  'observation_status',
  'evidence_digest_sha256',
  'chain_observed',
  'block_number',
  'confirmations',
  'failure_code',
  'checked_at',
].join(',');

function noStoreJson(request: Request, body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'no-referrer');
  return applyWalletCors(request, NextResponse.json(body, { ...init, headers }), CORS_METHODS);
}

function getIntentId(request: Request) {
  const pathname = new URL(request.url).pathname;
  const match = /^\/api\/wallet\/intents\/([^/]+)\/evidence\/?$/.exec(pathname);
  const intentId = match?.[1] ?? '';
  return UUID_RE.test(intentId) ? intentId : null;
}

export function OPTIONS(request: Request) {
  return walletCorsPreflight(request, CORS_METHODS);
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return noStoreJson(request, { error: 'WALLET_CANARY_EVIDENCE_UNAVAILABLE' }, { status: 503 });
  }

  const auth = await createAuthenticatedRequestContext(request);
  if (!auth) return noStoreJson(request, { error: 'UNAUTHENTICATED' }, { status: 401 });

  const intentId = getIntentId(request);
  if (!intentId) return noStoreJson(request, { error: 'WALLET_CANARY_EVIDENCE_INTENT_ID_INVALID' }, { status: 400 });

  const admin = createAdminClient();
  const { data: rawIntent, error: intentError } = await admin
    .from('wallet_intents_v2')
    .select(EVIDENCE_SELECT)
    .eq('id', intentId)
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (intentError) {
    return noStoreJson(request, { error: 'WALLET_CANARY_EVIDENCE_READ_FAILED' }, { status: 503 });
  }
  if (!rawIntent) {
    return noStoreJson(request, { error: 'WALLET_CANARY_EVIDENCE_INTENT_NOT_FOUND' }, { status: 404 });
  }

  const clientCommit = typeof rawIntent.canary_client_commit_sha === 'string'
    ? rawIntent.canary_client_commit_sha.toLowerCase()
    : '';
  const clientBoundAt = typeof rawIntent.canary_client_bound_at === 'string'
    ? rawIntent.canary_client_bound_at
    : '';
  if (!GIT_COMMIT_RE.test(clientCommit) || Number.isNaN(Date.parse(clientBoundAt))) {
    return noStoreJson(request, { error: 'WALLET_CANARY_EVIDENCE_CLIENT_PROVENANCE_MISSING' }, { status: 409 });
  }

  const { data: rawObservations, error: observationError } = await admin
    .from('wallet_chain_reconciliation_observations_v1')
    .select(OBSERVATION_SELECT)
    .eq('intent_id', intentId)
    .eq('subject_user_id', auth.user.id)
    .order('checked_at', { ascending: true })
    .order('id', { ascending: true });

  if (observationError) {
    return noStoreJson(request, { error: 'WALLET_CANARY_EVIDENCE_OBSERVATION_READ_FAILED' }, { status: 503 });
  }

  try {
    const intent = normalizeWalletCanaryEvidenceIntent(rawIntent);
    const observations = (rawObservations ?? []).map((observation) => normalizeWalletCanaryEvidenceObservation(observation));
    const schema = await probeRuntimeSchemaCompatibility();
    const bundle = buildWalletCanaryEvidenceBundleV1({
      intent,
      deployment: getDeploymentMetadata(),
      clientArtifact: {
        repository: 'VladPhil92/CTG-Wallet',
        commit: clientCommit,
        boundAt: clientBoundAt,
      },
      observations,
      schema: {
        compatible: schema.compatible,
        observedMigrationCount: schema.observedMigrationCount,
        observedLatestMigrationName: schema.observedLatestMigrationName,
      },
    });

    return noStoreJson(request, bundle);
  } catch (error) {
    if (error instanceof WalletCanaryEvidenceError) {
      return noStoreJson(request, { error: error.code }, { status: 409 });
    }
    return noStoreJson(request, { error: 'WALLET_CANARY_EVIDENCE_BUILD_FAILED' }, { status: 503 });
  }
}
