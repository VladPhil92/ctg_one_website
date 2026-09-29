import { createHash } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { consumeAuthenticatedRateLimit } from '@/lib/security/api-rate-limit';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { validateAndPersistWalletCryptoTopup } from '@/lib/wallet-crypto-settlement';

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf',
};

function safeOriginalName(value: string | null, extension: string) {
  if (!value) return `wallet-crypto-topup-proof.${extension}`;
  try {
    const leaf = decodeURIComponent(value).replace(/[\r\n]/g, ' ').split(/[\\/]/).pop()?.trim();
    return (leaf || `wallet-crypto-topup-proof.${extension}`).slice(0, 180);
  } catch { return `wallet-crypto-topup-proof.${extension}`; }
}
function matchesDeclaredFileType(bytes: Buffer, mime: string) {
  if (mime === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === 'image/png') return bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  if (mime === 'image/webp') return bytes.length >= 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
  if (mime === 'application/pdf') return bytes.length >= 5 && bytes.subarray(0, 5).toString('ascii') === '%PDF-';
  return false;
}
async function readBoundedBody(request: NextRequest) {
  if (!request.body) return null;
  const reader = request.body.getReader(); const chunks: Buffer[] = []; let total = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    total += value.byteLength;
    if (total > MAX_FILE_BYTES) { await reader.cancel('wallet crypto top-up proof exceeds 8 MB'); return null; }
    chunks.push(Buffer.from(value));
  }
  return total > 0 ? Buffer.concat(chunks, total) : null;
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: 'crypto top-ups are not available' }, { status: 503 });
  const participantClient = await createClient();
  const { data: { user } } = await participantClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not authenticated' }, { status: 401 });
  const { data: profile, error: profileError } = await participantClient.from('profiles').select('id,kyc_status').eq('id', user.id).maybeSingle();
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });
  if (!profile || profile.kyc_status !== 'verified') return NextResponse.json({ error: 'verified KYC is required' }, { status: 403 });

  const rateLimit = await consumeAuthenticatedRateLimit(participantClient, 'wallet.crypto-topup-proof');
  if (!rateLimit.allowed) return NextResponse.json({ error: 'too many crypto top-up attempts', code: 'RATE_LIMITED' }, { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } });

  const quoteId = (request.headers.get('x-wallet-crypto-quote-id') ?? '').trim();
  const txHash = (request.headers.get('x-crypto-tx-hash') ?? '').trim();
  if (!/^[0-9a-fA-F-]{36}$/.test(quoteId)) return NextResponse.json({ error: 'valid quote id is required' }, { status: 400 });
  if (txHash.length < 16 || txHash.length > 180) return NextResponse.json({ error: 'valid transaction hash is required' }, { status: 400 });

  const mime = (request.headers.get('content-type') ?? '').split(';', 1)[0].trim().toLowerCase();
  const extension = MIME_EXTENSIONS[mime];
  if (!extension) return NextResponse.json({ error: 'unsupported payment proof type' }, { status: 415 });
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_FILE_BYTES) return NextResponse.json({ error: 'payment proof must not exceed 8 MB' }, { status: 413 });
  const bytes = await readBoundedBody(request);
  if (!bytes) return NextResponse.json({ error: 'payment proof must be between 1 byte and 8 MB' }, { status: 413 });
  if (!matchesDeclaredFileType(bytes, mime)) return NextResponse.json({ error: 'payment proof content does not match declared file type' }, { status: 415 });

  const proofSha256 = createHash('sha256').update(bytes).digest('hex');
  const storagePath = `${user.id}/wallet-crypto-topups/${proofSha256}.${extension}`;
  const originalName = safeOriginalName(request.headers.get('x-file-name'), extension);
  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage.from('payment-proofs').upload(storagePath, bytes, { contentType: mime, upsert: false });
  const createdByRequest = !uploadError;
  const alreadyExists = !!uploadError && /already exists|duplicate/i.test(uploadError.message.toLowerCase());
  if (uploadError && !alreadyExists) return NextResponse.json({ error: uploadError.message }, { status: 400 });

  const { data, error: rpcError } = await admin.rpc('submit_wallet_crypto_topup_claim_server', {
    p_user_id: user.id, p_quote_id: quoteId, p_tx_hash: txHash, p_proof_storage_path: storagePath,
    p_proof_sha256: proofSha256, p_original_name: originalName, p_mime: mime,
  });
  if (rpcError) {
    if (createdByRequest) await admin.storage.from('payment-proofs').remove([storagePath]);
    return NextResponse.json({ error: rpcError.message }, { status: 409 });
  }
  const claimId = data?.claimId as string | undefined;
  if (!claimId) return NextResponse.json({ error: 'crypto claim was not created' }, { status: 500 });

  try {
    const validation = await validateAndPersistWalletCryptoTopup(admin, claimId);
    return NextResponse.json({ claimId, ...validation }, { status: validation?.state === 'confirmed' ? 200 : 202, headers: { 'X-RateLimit-Remaining': String(rateLimit.remaining) } });
  } catch (error) {
    return NextResponse.json({ claimId, state: 'submitted', warning: error instanceof Error ? error.message : 'on-chain validation will be retried' }, { status: 202, headers: { 'X-RateLimit-Remaining': String(rateLimit.remaining) } });
  }
}
