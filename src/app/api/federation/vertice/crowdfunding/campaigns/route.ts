import { federationSecretState } from '@/lib/federation/vertice';
import { BoundedJsonError, isJsonRequest, noStoreJson, readBoundedJson } from '@/lib/federation/secure-json';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVM = /^0x[0-9a-fA-F]{40}$/;
const ALLOWED_KEYS = new Set([
  'externalCampaignId',
  'subjectUserId',
  'fundingModel',
  'campaignStatus',
  'cryptoTreasuryAddress',
]);

type CampaignBody = {
  externalCampaignId?: unknown;
  subjectUserId?: unknown;
  fundingModel?: unknown;
  campaignStatus?: unknown;
  cryptoTreasuryAddress?: unknown;
};

type RateRow = { allowed: boolean; retry_after_seconds: number };

function parseBody(value: unknown): CampaignBody | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (Object.keys(row).some((key) => !ALLOWED_KEYS.has(key))) return null;
  return row;
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
    p_scope: 'federation.vertice.crowdfunding.campaigns',
    p_actor_key: 'vertice',
  });
  if (rateError) return noStoreJson({ error: 'FEDERATION_RATE_LIMIT_UNAVAILABLE' }, 503);
  const rate = (Array.isArray(rateData) ? rateData[0] : rateData) as RateRow | null;
  if (!rate) return noStoreJson({ error: 'FEDERATION_RATE_LIMIT_UNAVAILABLE' }, 503);
  if (rate.allowed !== true) {
    const retryAfterSeconds = Math.max(1, Number(rate.retry_after_seconds ?? 1));
    return noStoreJson({ error: 'RATE_LIMITED', retryAfterSeconds }, 429, { 'Retry-After': String(retryAfterSeconds) });
  }

  let body: CampaignBody;
  try {
    const parsed = parseBody(await readBoundedJson(request));
    if (!parsed) return noStoreJson({ error: 'INVALID_CAMPAIGN_ATTESTATION' }, 400);
    body = parsed;
  } catch (error) {
    if (error instanceof BoundedJsonError) return noStoreJson({ error: error.code }, error.status);
    return noStoreJson({ error: 'INVALID_JSON' }, 400);
  }

  const externalCampaignId = typeof body.externalCampaignId === 'string' ? body.externalCampaignId.trim() : '';
  const subjectUserId = typeof body.subjectUserId === 'string' ? body.subjectUserId.trim() : '';
  const fundingModel = typeof body.fundingModel === 'string' ? body.fundingModel.trim().toLowerCase() : '';
  const campaignStatus = typeof body.campaignStatus === 'string' ? body.campaignStatus.trim().toLowerCase() : '';
  const cryptoTreasuryAddress = body.cryptoTreasuryAddress == null
    ? null
    : typeof body.cryptoTreasuryAddress === 'string'
      ? body.cryptoTreasuryAddress.trim().toLowerCase()
      : '';

  if (!UUID.test(externalCampaignId) || !UUID.test(subjectUserId)) {
    return noStoreJson({ error: 'INVALID_CAMPAIGN_ATTESTATION' }, 400);
  }
  if (!['donation', 'reward'].includes(fundingModel)) {
    return noStoreJson({ error: 'FUNDING_MODEL_PROHIBITED' }, 400);
  }
  if (!['active', 'suspended', 'completed'].includes(campaignStatus)) {
    return noStoreJson({ error: 'INVALID_CAMPAIGN_STATUS' }, 400);
  }
  if (cryptoTreasuryAddress !== null && !EVM.test(cryptoTreasuryAddress)) {
    return noStoreJson({ error: 'INVALID_CRYPTO_TREASURY' }, 400);
  }

  const { data, error } = await admin.rpc('register_vertice_crowdfunding_campaign_server', {
    p_external_campaign_id: externalCampaignId,
    p_subject_user_id: subjectUserId,
    p_funding_model: fundingModel,
    p_campaign_status: campaignStatus,
    p_crypto_treasury_address: cryptoTreasuryAddress,
  });

  if (error) {
    const message = error.message ?? '';
    if (message.includes('KYC_REQUIRED')) return noStoreJson({ error: 'KYC_REQUIRED' }, 403);
    if (message.includes('TREASURY_IMMUTABLE') || message.includes('ATTESTATION_CONFLICT')) {
      return noStoreJson({ error: 'CAMPAIGN_ATTESTATION_CONFLICT' }, 409);
    }
    return noStoreJson({ error: 'CAMPAIGN_ATTESTATION_FAILED' }, 503);
  }

  return noStoreJson({ campaign: data }, 200);
}
