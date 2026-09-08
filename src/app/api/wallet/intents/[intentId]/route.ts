import { NextResponse } from 'next/server';

import {
  createAdminClient,
  createAuthenticatedRequestContext,
  isSupabaseConfigured,
} from '@/lib/supabase/server';
import { applyWalletCors, walletCorsPreflight } from '@/lib/wallet/cors';

const CORS_METHODS = ['GET', 'OPTIONS'] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const WALLET_INTENT_READ_COLUMNS = 'id,user_id,intent_type,idempotency_key,status,rail,chain_id,asset_symbol,amount_base_units,amount_cents,destination_address,tx_hash,external_reference,replaced_by_reference,created_at,updated_at,settled_at,expires_at' as const;

function noStoreJson(request: Request, body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'no-referrer');
  return applyWalletCors(request, NextResponse.json(body, { ...init, headers }), CORS_METHODS);
}

export function OPTIONS(request: Request) {
  return walletCorsPreflight(request, CORS_METHODS);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ intentId: string }> },
) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return noStoreJson(request, { error: 'WALLET_INTENT_UNAVAILABLE' }, { status: 503 });
  }

  const auth = await createAuthenticatedRequestContext(request);
  if (!auth) {
    return noStoreJson(request, { error: 'UNAUTHENTICATED' }, { status: 401 });
  }

  const { intentId } = await context.params;
  if (!UUID.test(intentId)) {
    return noStoreJson(request, { error: 'WALLET_INTENT_ID_INVALID' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('wallet_intents_v2')
    .select(WALLET_INTENT_READ_COLUMNS)
    .eq('id', intentId)
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (error) {
    return noStoreJson(request, { error: 'WALLET_INTENT_READ_FAILED' }, { status: 503 });
  }
  if (!data) {
    // Deliberately indistinguishable from another user's intent.
    return noStoreJson(request, { error: 'WALLET_INTENT_NOT_FOUND' }, { status: 404 });
  }

  return noStoreJson(request, {
    version: 'ctg-wallet-intent-v1',
    intent: {
      version: 'ctg-wallet-intent-v1',
      id: data.id,
      canonicalUserId: data.user_id,
      idempotencyKey: data.idempotency_key,
      kind: data.intent_type,
      status: data.status,
      rail: data.rail,
      chainId: data.chain_id,
      assetSymbol: data.asset_symbol,
      amountBaseUnits: data.amount_base_units,
      amountCents: data.amount_cents,
      destinationAddress: data.destination_address,
      txHash: data.tx_hash,
      externalReference: data.external_reference,
      replacedByReference: data.replaced_by_reference,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      settledAt: data.settled_at,
      expiresAt: data.expires_at,
    },
  });
}