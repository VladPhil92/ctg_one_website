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
const CLIENT_COMMIT_HEADER = 'x-ctg-wallet-build-commit';
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

function getVerifiedClientArtifact(request: Request) {
  const expected = process.env.WALLET_CANARY_CLIENT_COMMIT?.trim().toLowerCase() ?? '';
  if (!GIT_COMMIT_RE.test(expected)) return { error: 'WALLET_CANARY_EVIDENCE_CLIENT_PROVENANCE_UNAVAILABLE' as const };

  const asserted = request.headers.get(CLIENT_COMMIT_HEADER)?.trim().toLowerCase() ?? '';
  if (!GIT_COMMIT_RE.test(asserted)) return { error: 'WALLET_CANARY_EVIDENCE_CLIENT_COMMIT_REQUIRED' as const };
  if (asserted !== expected) return { error: 'WALLET_CANARY_EVIDENCE_CLIENT_COMMIT_MISMATCH' as const };

  return {
    clientArtifact: {
      repository: 'VladPhil92/CTG-Wallet' as const,
      commit: expected,
    },
  };
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

  const provenance = getVerifiedClientArtifact(request);
  if ('error' in provenance) {
    const status = provenance.error === 'WALLET_CANARY_EVIDENCE_CLIENT_PROVENANCE_UNAVAILABLE'
      ? 503
      : provenance.error === 'WALLET_CANARY_EVIDENCE_CLIENT_COMMIT_MISMATCH'
        ? 409
        : 400;
    return noStoreJson(request, { error: provenance.error }, { status });
  }

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

  const { data: rawObservations, error: observationError } = await admin
    .from('wallet_chain_reconciliation_observations_v1')
    .select(OBSERVATION_SELECT)
    .eq('intent_id', intentId)
    .order('id', { ascending: true });

  if (observationError) {
    return noStoreJson(request, { error: 'WALLET_CANARY_EVIDENCE_OBSERVATION_READ_FAILED' }, { status: 503 });
  }

  try {
    const intent = normalizeWalletCanaryEvidenceIntent(rawIntent);
    const observations = (rawObservations ?? []).map(normalizeWalletCanaryEvidenceObservation);
    const schema = await probeRuntimeSchemaCompatibility();
    const bundle = buildWalletCanaryEvidenceBundleV1({
      intent,
      deployment: getDeploymentMetadata(),
      clientArtifact: provenance.clientArtifact,
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
