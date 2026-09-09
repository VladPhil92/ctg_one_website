import 'server-only';

const DEFAULT_BOLD_BASE_URL = 'https://integrations.api.bold.co';
const BOLD_LINK_PATH = '/online/link/v1';
const BOLD_CHECKOUT_ORIGIN = 'https://checkout.bold.co';
const REFERENCE_PATTERN = /^[A-Za-z0-9_-]{1,60}$/;

export type BoldCrowdfundingConfig = {
  apiKey: string;
  baseUrl: string;
  callbackUrl: string;
};

export type BoldCrowdfundingCheckout = {
  paymentLink: string;
  checkoutUrl: string;
};

export type BoldWebhookEvidence = {
  eventId: string;
  paymentId: string;
  eventType: 'SALE_APPROVED' | 'SALE_REJECTED' | 'VOID_APPROVED' | 'VOID_REJECTED';
  externalReference: string | null;
  amountCop: number;
  currency: 'COP';
};

export class BoldCrowdfundingUnavailableError extends Error {
  constructor(message = 'BOLD_CROWDFUNDING_UNAVAILABLE') {
    super(message);
    this.name = 'BoldCrowdfundingUnavailableError';
  }
}

export function getBoldCrowdfundingConfig(): BoldCrowdfundingConfig | null {
  // Production activation is explicit. Having a key in the environment is not
  // sufficient to turn money movement on accidentally.
  if (process.env.BOLD_CROWDFUNDING_ENABLED !== 'true') return null;

  const apiKey = process.env.BOLD_API_KEY?.trim() ?? '';
  const callbackUrl = process.env.BOLD_CROWDFUNDING_CALLBACK_URL?.trim() ?? '';
  const baseUrl = (process.env.BOLD_API_BASE_URL?.trim() || DEFAULT_BOLD_BASE_URL).replace(/\/$/, '');

  if (apiKey.length < 20) return null;
  if (!/^https:\/\//.test(baseUrl)) return null;

  try {
    const callback = new URL(callbackUrl);
    if (callback.protocol !== 'https:') return null;
  } catch {
    return null;
  }

  return { apiKey, baseUrl, callbackUrl };
}

function parseCheckoutPayload(value: unknown): BoldCrowdfundingCheckout {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BoldCrowdfundingUnavailableError('BOLD_CROWDFUNDING_RESPONSE_INVALID');
  }
  const root = value as Record<string, unknown>;
  const payload = root.payload;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new BoldCrowdfundingUnavailableError('BOLD_CROWDFUNDING_RESPONSE_INVALID');
  }
  const data = payload as Record<string, unknown>;
  const paymentLink = typeof data.payment_link === 'string' ? data.payment_link.trim() : '';
  const checkoutUrl = typeof data.url === 'string' ? data.url.trim() : '';

  if (!/^LNK_[A-Za-z0-9_-]{3,120}$/.test(paymentLink)) {
    throw new BoldCrowdfundingUnavailableError('BOLD_CROWDFUNDING_REFERENCE_INVALID');
  }
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(checkoutUrl);
  } catch {
    throw new BoldCrowdfundingUnavailableError('BOLD_CROWDFUNDING_URL_INVALID');
  }
  if (parsedUrl.origin !== BOLD_CHECKOUT_ORIGIN) {
    throw new BoldCrowdfundingUnavailableError('BOLD_CROWDFUNDING_URL_INVALID');
  }

  return { paymentLink, checkoutUrl: parsedUrl.toString() };
}

function parseWebhookNotification(value: unknown): BoldWebhookEvidence | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const data = row.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const body = data as Record<string, unknown>;
  const amount = body.amount;
  if (!amount || typeof amount !== 'object' || Array.isArray(amount)) return null;
  const amountRow = amount as Record<string, unknown>;
  const metadata = body.metadata;
  const metadataRow = metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? metadata as Record<string, unknown>
    : null;

  const eventId = typeof row.id === 'string' ? row.id.trim() : '';
  const paymentId = typeof body.payment_id === 'string' ? body.payment_id.trim() : '';
  const eventType = typeof row.type === 'string' ? row.type.trim().toUpperCase() : '';
  const currency = typeof amountRow.currency === 'string' ? amountRow.currency.trim().toUpperCase() : '';
  const total = amountRow.total;
  const externalReference = typeof metadataRow?.reference === 'string' ? metadataRow.reference.trim() : null;

  if (!/^[0-9a-f-]{36}$/i.test(eventId)) return null;
  if (!paymentId || paymentId.length > 180) return null;
  if (!['SALE_APPROVED', 'SALE_REJECTED', 'VOID_APPROVED', 'VOID_REJECTED'].includes(eventType)) return null;
  if (currency !== 'COP' || !Number.isSafeInteger(total) || (total as number) < 0) return null;
  if (externalReference !== null && !REFERENCE_PATTERN.test(externalReference)) return null;

  return {
    eventId,
    paymentId,
    eventType: eventType as BoldWebhookEvidence['eventType'],
    externalReference,
    amountCop: total as number,
    currency: 'COP',
  };
}

export async function createBoldCrowdfundingCheckout(input: {
  reference: string;
  amountCop: number;
  description: string;
}): Promise<BoldCrowdfundingCheckout> {
  const config = getBoldCrowdfundingConfig();
  if (!config) throw new BoldCrowdfundingUnavailableError();
  if (!REFERENCE_PATTERN.test(input.reference)) {
    throw new BoldCrowdfundingUnavailableError('BOLD_CROWDFUNDING_REFERENCE_INVALID');
  }
  if (!Number.isSafeInteger(input.amountCop) || input.amountCop < 1_000 || input.amountCop > 50_000_000) {
    throw new BoldCrowdfundingUnavailableError('BOLD_CROWDFUNDING_AMOUNT_INVALID');
  }

  const description = input.description.trim().slice(0, 100);
  if (description.length < 2) {
    throw new BoldCrowdfundingUnavailableError('BOLD_CROWDFUNDING_DESCRIPTION_INVALID');
  }

  const response = await fetch(`${config.baseUrl}${BOLD_LINK_PATH}`, {
    method: 'POST',
    headers: {
      Authorization: `x-api-key ${config.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      amount_type: 'CLOSE',
      amount: {
        currency: 'COP',
        total_amount: input.amountCop,
        tip_amount: 0,
      },
      reference: input.reference,
      description,
      callback_url: config.callbackUrl,
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    throw new BoldCrowdfundingUnavailableError(`BOLD_CROWDFUNDING_HTTP_${response.status}`);
  }

  return parseCheckoutPayload(await response.json());
}

export async function verifyBoldWebhookEvidence(expected: BoldWebhookEvidence): Promise<boolean> {
  const config = getBoldCrowdfundingConfig();
  if (!config) throw new BoldCrowdfundingUnavailableError();

  const paymentId = encodeURIComponent(expected.paymentId);
  const response = await fetch(`${config.baseUrl}/payments/webhook/notifications/${paymentId}`, {
    method: 'GET',
    headers: {
      Authorization: `x-api-key ${config.apiKey}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new BoldCrowdfundingUnavailableError(`BOLD_VERIFY_HTTP_${response.status}`);

  const payload = await response.json() as unknown;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
  const notifications = (payload as Record<string, unknown>).notifications;
  if (!Array.isArray(notifications)) return false;

  return notifications.some((candidate) => {
    const parsed = parseWebhookNotification(candidate);
    return parsed !== null
      && parsed.eventId === expected.eventId
      && parsed.paymentId === expected.paymentId
      && parsed.eventType === expected.eventType
      && parsed.externalReference === expected.externalReference
      && parsed.amountCop === expected.amountCop
      && parsed.currency === expected.currency;
  });
}
