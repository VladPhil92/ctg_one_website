import { createBoldCrowdfundingCheckout, BoldCrowdfundingUnavailableError } from '@/lib/payments/bold-crowdfunding';
import { federationSecretState } from '@/lib/federation/vertice';
import { BoundedJsonError, isJsonRequest, noStoreJson, readBoundedJson } from '@/lib/federation/secure-json';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY = /^[A-Za-z0-9._:-]{16,128}$/;
const BASE_UNITS = /^[1-9][0-9]{0,77}$/;
const ALLOWED_KEYS = new Set([
  'externalCampaignId',
  'externalContributionId',
  'contributorSubjectUserId',
  'idempotencyKey',
  'rail',
  'amountCop',
  'amountBaseUnits',
]);

type Body = {
  externalCampaignId?: unknown;
  externalContributionId?: unknown;
  contributorSubjectUserId?: unknown;
  idempotencyKey?: unknown;
  rail?: unknown;
  amountCop?: unknown;
  amountBaseUnits?: unknown;
};

type RateRow = { allowed: boolean; retry_after_seconds: number };
type Contribution = {
  id?: string;
  rail?: string;
  status?: string;
  amountCents?: number | string | null;
  walletIntentId?: string | null;
  providerReference?: string | null;
  providerCheckoutUrl?: string | null;
};
type RpcResult = { replayed?: boolean; contribution?: Contribution };

function parseBody(value: unknown): Body | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (Object.keys(row).some((key) => !ALLOWED_KEYS.has(key))) return null;
  return row;
}

function mapRpcError(message: string) {
  if (message.includes('NOT_REGISTERED')) return noStoreJson({ error: 'CAMPAIGN_NOT_REGISTERED' }, 404);
  if (message.includes('NOT_ELIGIBLE')) return noStoreJson({ error: 'CAMPAIGN_NOT_ELIGIBLE' }, 409);
  if (message.includes('KYC_REQUIRED') || message.includes('CRYPTO_IDENTITY_REQUIRED')) {
    return noStoreJson({ error: 'CRYPTO_IDENTITY_ASSURANCE_REQUIRED' }, 403);
  }
  if (message.includes('TREASURY_REQUIRED')) return noStoreJson({ error: 'CRYPTO_TREASURY_NOT_CERTIFIED' }, 409);
  if (message.includes('IDEMPOTENCY_CONFLICT')) return noStoreJson({ error: 'IDEMPOTENCY_CONFLICT' }, 409);
  if (message.includes('RATE_LIMITED')) return noStoreJson({ error: 'RATE_LIMITED' }, 429);
  return noStoreJson({ error: 'CROWDFUNDING_INTENT_FAILED' }, 503);
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return noStoreJson({ error: 'CROWDFUNDING_FEDERATION_UNAVAILABLE' }, 503);
  }

  const secret = federationSecretState(request);
  if (secret === 'unconfigured') return noStoreJson({ error: 'FEDERATION_SECRET_NOT_CONFIGURED' }, 503);
  if (secret !== 'authorized') return noStoreJson({ error: 'UNAUTHORIZED' }, 401);
  if (!isJsonRequest(request)) return noStoreJson({ error: 'UNSUPPORTED_MEDIA_TYPE' }, 415);

  const admin = createAdminClient();
  const { data: rateData, error: rateError } = await admin.rpc('consume_service_api_rate_limit', {
    p_scope: 'federation.vertice.crowdfunding.contributions',
    p_actor_key: 'vertice',
  });
  if (rateError) return noStoreJson({ error: 'FEDERATION_RATE_LIMIT_UNAVAILABLE' }, 503);
  const rate = (Array.isArray(rateData) ? rateData[0] : rateData) as RateRow | null;
  if (!rate) return noStoreJson({ error: 'FEDERATION_RATE_LIMIT_UNAVAILABLE' }, 503);
  if (rate.allowed !== true) {
    const retryAfterSeconds = Math.max(1, Number(rate.retry_after_seconds ?? 1));
    return noStoreJson({ error: 'RATE_LIMITED', retryAfterSeconds }, 429, { 'Retry-After': String(retryAfterSeconds) });
  }

  let body: Body;
  try {
    const parsed = parseBody(await readBoundedJson(request));
    if (!parsed) return noStoreJson({ error: 'INVALID_CONTRIBUTION_REQUEST' }, 400);
    body = parsed;
  } catch (error) {
    if (error instanceof BoundedJsonError) return noStoreJson({ error: error.code }, error.status);
    return noStoreJson({ error: 'INVALID_JSON' }, 400);
  }

  const externalCampaignId = typeof body.externalCampaignId === 'string' ? body.externalCampaignId.trim() : '';
  const externalContributionId = typeof body.externalContributionId === 'string' ? body.externalContributionId.trim() : '';
  const contributorSubjectUserId = body.contributorSubjectUserId == null
    ? null
    : typeof body.contributorSubjectUserId === 'string'
      ? body.contributorSubjectUserId.trim()
      : '';
  const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey.trim() : '';
  const rail = typeof body.rail === 'string' ? body.rail.trim().toLowerCase() : '';

  if (!UUID.test(externalCampaignId) || !UUID.test(externalContributionId) || !IDEMPOTENCY.test(idempotencyKey)) {
    return noStoreJson({ error: 'INVALID_CONTRIBUTION_REQUEST' }, 400);
  }
  if (contributorSubjectUserId !== null && !UUID.test(contributorSubjectUserId)) {
    return noStoreJson({ error: 'INVALID_CONTRIBUTOR_IDENTITY' }, 400);
  }
  if (!['bold', 'ctg_wallet_crypto'].includes(rail)) {
    return noStoreJson({ error: 'UNSUPPORTED_CROWDFUNDING_RAIL' }, 400);
  }

  let amountCents: number | null = null;
  let amountBaseUnits: string | null = null;
  if (rail === 'bold') {
    if (!Number.isSafeInteger(body.amountCop) || (body.amountCop as number) < 1_000 || (body.amountCop as number) > 50_000_000) {
      return noStoreJson({ error: 'INVALID_COP_AMOUNT' }, 400);
    }
    if (body.amountBaseUnits != null) return noStoreJson({ error: 'INVALID_AMOUNT_SHAPE' }, 400);
    amountCents = (body.amountCop as number) * 100;
  } else {
    if (body.amountCop != null) return noStoreJson({ error: 'INVALID_AMOUNT_SHAPE' }, 400);
    amountBaseUnits = typeof body.amountBaseUnits === 'string' ? body.amountBaseUnits.trim() : '';
    if (!BASE_UNITS.test(amountBaseUnits) || contributorSubjectUserId === null) {
      return noStoreJson({ error: 'INVALID_CRYPTO_CONTRIBUTION' }, 400);
    }
  }

  const { data, error } = await admin.rpc('create_vertice_crowdfunding_contribution_server', {
    p_external_campaign_id: externalCampaignId,
    p_external_contribution_id: externalContributionId,
    p_contributor_user_id: contributorSubjectUserId,
    p_idempotency_key: idempotencyKey,
    p_rail: rail,
    p_amount_cents: amountCents,
    p_amount_base_units: amountBaseUnits,
  });
  if (error) return mapRpcError(error.message ?? '');

  const result = data as RpcResult | null;
  const contribution = result?.contribution;
  if (!contribution?.id || contribution.rail !== rail) {
    return noStoreJson({ error: 'CROWDFUNDING_INTENT_RESPONSE_INVALID' }, 503);
  }

  if (rail === 'ctg_wallet_crypto') {
    if (!contribution.walletIntentId) return noStoreJson({ error: 'WALLET_INTENT_RESPONSE_INVALID' }, 503);
    return noStoreJson({
      replayed: result?.replayed === true,
      contribution,
      execution: {
        authority: 'ctg_one',
        client: 'ctg_wallet',
        walletOrigin: 'https://wallet.ctgone.com',
        walletIntentId: contribution.walletIntentId,
        chainId: 137,
        assetSymbol: 'USDC',
      },
    }, result?.replayed === true ? 200 : 201);
  }

  if (contribution.providerReference && contribution.providerCheckoutUrl) {
    return noStoreJson({
      replayed: true,
      contribution,
      checkout: { provider: 'bold', checkoutUrl: contribution.providerCheckoutUrl },
    }, 200);
  }

  try {
    const amountCop = Math.trunc(Number(contribution.amountCents) / 100);
    const reference = `VCF_${contribution.id.replaceAll('-', '')}`.slice(0, 60);
    const checkout = await createBoldCrowdfundingCheckout({
      reference,
      amountCop,
      description: `Aporte Vértice ${externalCampaignId.slice(0, 8)}`,
    });

    const { error: bindError } = await admin.rpc('bind_vertice_crowdfunding_bold_checkout_server', {
      p_contribution_id: contribution.id,
      p_provider_reference: checkout.paymentLink,
      p_provider_external_reference: reference,
      p_checkout_url: checkout.checkoutUrl,
    });
    if (bindError) return noStoreJson({ error: 'BOLD_CHECKOUT_BINDING_FAILED' }, 503);

    return noStoreJson({
      replayed: result?.replayed === true,
      contribution: {
        ...contribution,
        status: 'pending_external',
        providerReference: checkout.paymentLink,
        providerCheckoutUrl: checkout.checkoutUrl,
      },
      checkout: { provider: 'bold', checkoutUrl: checkout.checkoutUrl },
    }, result?.replayed === true ? 200 : 201);
  } catch (error) {
    if (error instanceof BoldCrowdfundingUnavailableError) {
      return noStoreJson({
        error: 'BOLD_CROWDFUNDING_UNAVAILABLE',
        intentCreated: true,
        contributionId: contribution.id,
      }, 503);
    }
    return noStoreJson({ error: 'BOLD_CROWDFUNDING_UNAVAILABLE' }, 503);
  }
}
