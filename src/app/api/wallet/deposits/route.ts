import { createHash } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import {
  isWalletManualCopRailConfigured,
  WALLET_MANUAL_COP_TOPUP_CONFIGURED,
} from '@/lib/payment-instructions';
import { consumeAuthenticatedRateLimit } from '@/lib/security/api-rate-limit';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

function safeOriginalName(value: string | null, extension: string) {
  if (!value) return `wallet-topup-proof.${extension}`;
  try {
    const decoded = decodeURIComponent(value);
    const leaf = decoded.replace(/[\r\n]/g, ' ').split(/[\\/]/).pop()?.trim();
    return (leaf || `wallet-topup-proof.${extension}`).slice(0, 180);
  } catch {
    return `wallet-topup-proof.${extension}`;
  }
}

function normalizeReference(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function matchesDeclaredFileType(bytes: Buffer, mime: string) {
  if (mime === 'image/jpeg') {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mime === 'image/png') {
    return bytes.length >= 8
      && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
      && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  }
  if (mime === 'image/webp') {
    return bytes.length >= 12
      && bytes.subarray(0, 4).toString('ascii') === 'RIFF'
      && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
  }
  if (mime === 'application/pdf') {
    return bytes.length >= 5 && bytes.subarray(0, 5).toString('ascii') === '%PDF-';
  }
  return false;
}

async function readBoundedBody(request: NextRequest) {
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_FILE_BYTES) {
      await reader.cancel('wallet top-up proof exceeds 8 MB');
      return null;
    }
    chunks.push(Buffer.from(value));
  }

  if (total === 0) return null;
  return Buffer.concat(chunks, total);
}

export async function POST(request: NextRequest) {
  if (
    !isSupabaseConfigured
    || !process.env.SUPABASE_SERVICE_ROLE_KEY
    || !WALLET_MANUAL_COP_TOPUP_CONFIGURED
  ) {
    return NextResponse.json({ error: 'wallet top-ups are not available' }, { status: 503 });
  }

  const participantClient = await createClient();
  const { data: { user } } = await participantClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not authenticated' }, { status: 401 });

  const { data: profile, error: profileError } = await participantClient
    .from('profiles')
    .select('id,kyc_status')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });
  if (!profile || profile.kyc_status !== 'verified') {
    return NextResponse.json({ error: 'verified KYC is required' }, { status: 403 });
  }

  const rateLimit = await consumeAuthenticatedRateLimit(participantClient, 'wallet.topup-proof');
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'too many wallet top-up attempts', code: 'RATE_LIMITED' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.retryAfterSeconds),
          'X-RateLimit-Remaining': '0',
        },
      },
    );
  }

  const rail = (request.headers.get('x-payment-rail') ?? '').trim().toLowerCase();
  if (!isWalletManualCopRailConfigured(rail)) {
    return NextResponse.json({ error: 'payment rail is not configured' }, { status: 400 });
  }

  const amountCents = Number(request.headers.get('x-wallet-topup-amount-cents') ?? '0');
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    return NextResponse.json({ error: 'invalid COP amount' }, { status: 400 });
  }

  const externalReference = (request.headers.get('x-payment-reference') ?? '').trim();
  const normalizedReference = normalizeReference(externalReference);
  if (normalizedReference.length < 4 || externalReference.length > 180) {
    return NextResponse.json({ error: 'a valid transfer reference is required' }, { status: 400 });
  }

  const mime = (request.headers.get('content-type') ?? '').split(';', 1)[0].trim().toLowerCase();
  const extension = MIME_EXTENSIONS[mime];
  if (!extension) return NextResponse.json({ error: 'unsupported payment proof type' }, { status: 415 });

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'payment proof must not exceed 8 MB' }, { status: 413 });
  }

  const bytes = await readBoundedBody(request);
  if (!bytes) {
    return NextResponse.json({ error: 'payment proof must be between 1 byte and 8 MB' }, { status: 413 });
  }
  if (!matchesDeclaredFileType(bytes, mime)) {
    return NextResponse.json({ error: 'payment proof content does not match declared file type' }, { status: 415 });
  }

  const originalName = safeOriginalName(request.headers.get('x-file-name'), extension);
  const proofSha256 = createHash('sha256').update(bytes).digest('hex');
  const idempotencyKey = createHash('sha256')
    .update(`${user.id}|${rail}|${amountCents}|${normalizedReference}|${proofSha256}`)
    .digest('hex');
  const storagePath = `${user.id}/wallet-topups/${proofSha256}.${extension}`;

  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from('payment-proofs')
    .upload(storagePath, bytes, { contentType: mime, upsert: false });

  const objectCreatedByThisRequest = !uploadError;
  const alreadyExists = !!uploadError && /already exists|duplicate/i.test(uploadError.message.toLowerCase());
  if (uploadError && !alreadyExists) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  }

  const { data, error: rpcError } = await admin.rpc('submit_wallet_topup_claim_server', {
    p_user_id: user.id,
    p_rail: rail,
    p_amount_cents: amountCents,
    p_external_reference: externalReference,
    p_proof_storage_path: storagePath,
    p_proof_sha256: proofSha256,
    p_original_name: originalName,
    p_mime: mime,
    p_idempotency_key: idempotencyKey,
  });

  if (rpcError) {
    if (objectCreatedByThisRequest) {
      const { data: claim } = await admin
        .from('wallet_topup_claims')
        .select('proof_storage_path,proof_sha256')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();

      const objectIsAuthoritative = claim?.proof_storage_path === storagePath
        && claim?.proof_sha256 === proofSha256;
      if (!objectIsAuthoritative) await admin.storage.from('payment-proofs').remove([storagePath]);
    }
    return NextResponse.json({ error: rpcError.message }, { status: 409 });
  }

  return NextResponse.json({
    claimId: data?.claimId,
    transactionId: data?.transactionId,
    state: data?.state ?? 'submitted',
    proofSha256,
  }, {
    status: 202,
    headers: { 'X-RateLimit-Remaining': String(rateLimit.remaining) },
  });
}
