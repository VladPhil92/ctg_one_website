import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient, createClient, isSupabaseConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 96 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ASSETS = ['BTC', 'ETH', 'BNB', 'USDT', 'USDC'] as const;
type Asset = typeof ASSETS[number];
type JsonRecord = Record<string, unknown>;
type Admin = ReturnType<typeof createAdminClient>;
type AdminContext = { userId: string; admin: Admin };

const NETWORK_BY_ASSET: Record<Asset, string> = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum (ERC20)',
  BNB: 'BNB Smart Chain (BEP20)',
  USDT: 'BNB Smart Chain (BEP20)',
  USDC: 'BNB Smart Chain (BEP20)',
};

function json(body: unknown, status = 200) {
  const response = NextResponse.json(body, { status });
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

function isResponse(value: AdminContext | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}

async function requireSuperAdmin(): Promise<AdminContext | NextResponse> {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: 'CRYPTO_ADDRESS_POOL_UNAVAILABLE' }, 503);
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

async function readBody(request: NextRequest): Promise<JsonRecord | null> {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return null;
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return null;
  try {
    const value = JSON.parse(raw) as unknown;
    return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : null;
  } catch {
    return null;
  }
}

function asAsset(value: unknown): Asset | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  return ASSETS.includes(normalized as Asset) ? normalized as Asset : null;
}

function boundedText(value: unknown, min: number, max: number) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length >= min && text.length <= max ? text : null;
}

function boundedInteger(raw: string | null, fallback: number, min: number, max: number) {
  if (raw === null || raw.trim() === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value)) return fallback;
  return Math.min(Math.max(value, min), max);
}

function mapRpcError(message: string) {
  const known: Array<[string, number]> = [
    ['CRYPTO_ADDRESS_POOL_BATCH_SIZE_INVALID', 400],
    ['CRYPTO_DEPOSIT_ADDRESS_ASSET_INVALID', 400],
    ['CRYPTO_DEPOSIT_ADDRESS_NETWORK_MISMATCH', 400],
    ['CRYPTO_DEPOSIT_ADDRESS_EVM_INVALID', 400],
    ['CRYPTO_DEPOSIT_ADDRESS_BTC_INVALID', 400],
    ['CRYPTO_DEPOSIT_DERIVATION_REFERENCE_REQUIRED', 400],
    ['CRYPTO_DEPOSIT_SOURCE_FINGERPRINT_REQUIRED', 400],
    ['CRYPTO_DEPOSIT_ADDRESS_ALREADY_EXISTS', 409],
    ['CRYPTO_DEPOSIT_ADDRESS_NOT_FOUND', 404],
    ['CRYPTO_DEPOSIT_ADDRESS_NOT_VALIDATABLE', 409],
    ['CRYPTO_DEPOSIT_ADDRESS_REJECTED', 409],
    ['CRYPTO_DEPOSIT_ADDRESS_PROVENANCE_REQUIRED', 409],
    ['CRYPTO_DEPOSIT_ADDRESS_ASSIGNED_CANNOT_RETIRE', 409],
    ['CRYPTO_ADDRESS_POOL_INSUFFICIENT_VALIDATED_CAPACITY', 409],
    ['CRYPTO_ADDRESS_POOL_CONTROL_NOT_FOUND', 404],
  ];
  return known.find(([code]) => message.includes(code)) ?? ['CRYPTO_ADDRESS_POOL_OPERATION_FAILED', 503] as const;
}

export async function GET(request: NextRequest) {
  const context = await requireSuperAdmin();
  if (isResponse(context)) return context;
  const limit = boundedInteger(request.nextUrl.searchParams.get('limit'), 100, 1, 200);
  const offset = boundedInteger(request.nextUrl.searchParams.get('offset'), 0, 0, 1_000_000);
  const { data, error } = await context.admin.rpc('get_wallet_crypto_address_pool_snapshot_page_server', {
    p_address_limit: limit,
    p_address_offset: offset,
  });
  if (error) return json({ error: 'CRYPTO_ADDRESS_POOL_READ_FAILED' }, 503);
  return json({ phase: 'wallet_crypto_address_pool_operations_v1_1', custody: 'public-addresses-only', privateKeysStored: false, snapshot: data ?? {} });
}

export async function POST(request: NextRequest) {
  const context = await requireSuperAdmin();
  if (isResponse(context)) return context;
  const body = await readBody(request);
  if (!body || typeof body.action !== 'string') return json({ error: 'INVALID_REQUEST' }, 400);

  if (body.action === 'provision_batch') {
    if (!Array.isArray(body.entries) || body.entries.length < 1 || body.entries.length > 100) {
      return json({ error: 'INVALID_ADDRESS_BATCH' }, 400);
    }
    const entries: Array<{ asset: Asset; network: string; address: string; derivationReference: string; sourceFingerprint: string }> = [];
    for (const rawEntry of body.entries) {
      if (!rawEntry || typeof rawEntry !== 'object' || Array.isArray(rawEntry)) return json({ error: 'INVALID_ADDRESS_BATCH' }, 400);
      const entry = rawEntry as JsonRecord;
      const asset = asAsset(entry.asset);
      const address = boundedText(entry.address, 16, 180);
      const derivationReference = boundedText(entry.derivationReference, 3, 180);
      const sourceFingerprint = boundedText(entry.sourceFingerprint, 16, 256);
      if (!asset || !address || !derivationReference || !sourceFingerprint) return json({ error: 'INVALID_ADDRESS_BATCH' }, 400);
      entries.push({ asset, network: NETWORK_BY_ASSET[asset], address, derivationReference, sourceFingerprint: sourceFingerprint.toLowerCase() });
    }
    const { data, error } = await context.admin.rpc('provision_wallet_crypto_deposit_addresses_batch_server', {
      p_entries: entries,
      p_actor: context.userId,
    });
    if (error) {
      const [code, status] = mapRpcError(error.message);
      return json({ error: code }, status);
    }
    return json({ ok: true, result: data, autoAssignment: false }, 201);
  }

  if (body.action === 'validate_address') {
    const addressId = typeof body.addressId === 'string' && UUID.test(body.addressId) ? body.addressId : null;
    const validationReference = boundedText(body.validationReference, 12, 256);
    if (!addressId || !validationReference) return json({ error: 'INVALID_VALIDATION_REQUEST' }, 400);
    const { data, error } = await context.admin.rpc('validate_wallet_crypto_deposit_address_server', {
      p_address_id: addressId,
      p_actor: context.userId,
      p_validation_reference: validationReference,
    });
    if (error) {
      const [code, status] = mapRpcError(error.message);
      return json({ error: code }, status);
    }
    return json({ ok: true, result: data });
  }

  if (body.action === 'retire_address') {
    const addressId = typeof body.addressId === 'string' && UUID.test(body.addressId) ? body.addressId : null;
    const reason = boundedText(body.reason, 8, 300);
    if (!addressId || !reason) return json({ error: 'INVALID_RETIREMENT_REQUEST' }, 400);
    const { data, error } = await context.admin.rpc('retire_wallet_crypto_deposit_address_server', {
      p_address_id: addressId,
      p_actor: context.userId,
      p_reason: reason,
    });
    if (error) {
      const [code, status] = mapRpcError(error.message);
      return json({ error: code }, status);
    }
    return json({ ok: true, result: data });
  }

  if (body.action === 'set_pool_enabled') {
    const asset = asAsset(body.asset);
    const enabled = typeof body.enabled === 'boolean' ? body.enabled : null;
    if (!asset || enabled === null) return json({ error: 'INVALID_POOL_CONTROL_REQUEST' }, 400);
    const { data, error } = await context.admin.rpc('set_wallet_crypto_address_pool_control_server', {
      p_asset: asset,
      p_network: NETWORK_BY_ASSET[asset],
      p_enabled: enabled,
      p_actor: context.userId,
    });
    if (error) {
      const [code, status] = mapRpcError(error.message);
      return json({ error: code }, status);
    }
    return json({ ok: true, result: data });
  }

  return json({ error: 'UNSUPPORTED_ACTION' }, 400);
}
