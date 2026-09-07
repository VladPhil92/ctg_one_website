import { createHash, timingSafeEqual } from 'node:crypto';

const HEX_64_RE = /^[0-9a-f]{64}$/i;
const BLOCKED_PATH_SEGMENTS = new Set(['__proto__', 'prototype', 'constructor']);

export type WompiMode = 'test' | 'prod';

export type WompiConfig = {
  mode: WompiMode;
  publicKey: string;
  integritySecret: string;
  eventsSecret: string;
};

export type WompiCheckoutInput = {
  reference: string;
  amountInCents: number;
  currency: string;
  redirectUrl: string;
  customerEmail?: string | null;
};

function nonEmpty(value: string | undefined) {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : null;
}

export function getWompiConfig(): WompiConfig | null {
  const publicKey = nonEmpty(process.env.WOMPI_PUBLIC_KEY);
  const integritySecret = nonEmpty(process.env.WOMPI_INTEGRITY_SECRET);
  const eventsSecret = nonEmpty(process.env.WOMPI_EVENTS_SECRET);

  if (!publicKey && !integritySecret && !eventsSecret) return null;
  if (!publicKey || !integritySecret || !eventsSecret) {
    throw new Error('WOMPI_CONFIGURATION_INCOMPLETE');
  }

  const mode: WompiMode | null = publicKey.startsWith('pub_prod_')
    ? 'prod'
    : publicKey.startsWith('pub_test_')
      ? 'test'
      : null;

  if (!mode) throw new Error('WOMPI_PUBLIC_KEY_INVALID');

  const integrityPrefix = mode === 'prod' ? 'prod_integrity_' : 'test_integrity_';
  const eventsPrefix = mode === 'prod' ? 'prod_events_' : 'test_events_';
  if (!integritySecret.startsWith(integrityPrefix) || !eventsSecret.startsWith(eventsPrefix)) {
    throw new Error('WOMPI_ENVIRONMENT_MISMATCH');
  }

  return { mode, publicKey, integritySecret, eventsSecret };
}

export function sha256Hex(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function buildWompiCheckoutUrl(config: WompiConfig, input: WompiCheckoutInput) {
  if (!Number.isSafeInteger(input.amountInCents) || input.amountInCents <= 0) {
    throw new Error('WOMPI_AMOUNT_INVALID');
  }
  if (input.currency !== 'COP') throw new Error('WOMPI_CURRENCY_UNSUPPORTED');

  const integrity = sha256Hex(
    `${input.reference}${input.amountInCents}${input.currency}${config.integritySecret}`,
  );

  const checkout = new URL('https://checkout.wompi.co/p/');
  checkout.searchParams.set('public-key', config.publicKey);
  checkout.searchParams.set('currency', input.currency);
  checkout.searchParams.set('amount-in-cents', String(input.amountInCents));
  checkout.searchParams.set('reference', input.reference);
  checkout.searchParams.set('signature:integrity', integrity);
  checkout.searchParams.set('redirect-url', input.redirectUrl);
  if (input.customerEmail) checkout.searchParams.set('customer-data:email', input.customerEmail);
  return checkout.toString();
}

function readSignedProperty(data: unknown, path: string): string | null {
  if (!path || path.length > 240) return null;
  const segments = path.split('.');
  if (segments.some((segment) => !segment || BLOCKED_PATH_SEGMENTS.has(segment))) return null;

  let value: unknown = data;
  for (const segment of segments) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    if (!Object.prototype.hasOwnProperty.call(value, segment)) return null;
    value = (value as Record<string, unknown>)[segment];
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return null;
}

function checksumEqual(left: string, right: string) {
  if (!HEX_64_RE.test(left) || !HEX_64_RE.test(right)) return false;
  return timingSafeEqual(Buffer.from(left.toLowerCase(), 'hex'), Buffer.from(right.toLowerCase(), 'hex'));
}

export function verifyWompiEventSignature(
  body: unknown,
  headerChecksum: string | null,
  eventsSecret: string,
) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false;
  const record = body as Record<string, unknown>;
  const data = record.data;
  const timestamp = record.timestamp;
  const signature = record.signature;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  if (!Number.isSafeInteger(timestamp) || (timestamp as number) <= 0) return false;
  if (!signature || typeof signature !== 'object' || Array.isArray(signature)) return false;

  const signatureRecord = signature as Record<string, unknown>;
  const properties = signatureRecord.properties;
  const checksum = signatureRecord.checksum;
  if (!Array.isArray(properties) || properties.length < 1 || properties.length > 32) return false;
  if (typeof checksum !== 'string' || !HEX_64_RE.test(checksum)) return false;

  const values: string[] = [];
  for (const property of properties) {
    if (typeof property !== 'string') return false;
    const value = readSignedProperty(data, property);
    if (value === null) return false;
    values.push(value);
  }

  const expected = sha256Hex(`${values.join('')}${timestamp}${eventsSecret}`);
  if (!checksumEqual(expected, checksum)) return false;
  if (headerChecksum && !checksumEqual(expected, headerChecksum.trim())) return false;
  return true;
}
