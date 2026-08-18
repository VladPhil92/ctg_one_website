import { createHash } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { consumeAuthenticatedRateLimit } from '@/lib/security/api-rate-limit';

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

function safeOriginalName(value: string | null, extension: string) {
  if (!value) return `payment-proof.${extension}`;
  try {
    const decoded = decodeURIComponent(value);
    const leaf = decoded.replace(/[\r\n]/g, ' ').split(/[\\/]/).pop()?.trim();
    return (leaf || `payment-proof.${extension}`).slice(0, 180);
  } catch {
    return `payment-proof.${extension}`;
  }
}

function matchesDeclaredFileType(bytes: Buffer, mime: string) {
  if (mime === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
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
  if (mime === 'application/pdf') return bytes.length >= 5 && bytes.subarray(0, 5).toString('ascii') === '%PDF-';
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
      await reader.cancel('payment proof exceeds 8 MB');
      return null;
    }
    chunks.push(Buffer.from(value));
  }

  if (total === 0) return null;
  return Buffer.concat(chunks, total);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'not available' }, { status: 503 });
  }

  const { orderId } = await params;

  // Authenticate and authorize ownership BEFORE consuming the upload body.
  const participantClient = await createClient();
  const { data: { user } } = await participantClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not authenticated' }, { status: 401 });

  const { data: order, error: orderError } = await participantClient
    .from('investment_orders')
    .select('id,participant_user_id,status')
    .eq('id', orderId)
    .maybeSingle();

  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 400 });
  if (!order || order.participant_user_id !== user.id) return NextResponse.json({ error: 'order not found' }, { status: 404 });
  if (order.status !== 'AWAITING_PAYMENT') return NextResponse.json({ error: 'order is not awaiting payment evidence' }, { status: 409 });

  const rateLimit = await consumeAuthenticatedRateLimit(participantClient, 'investment.payment-proof');
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'too many payment-proof attempts', code: 'RATE_LIMITED' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.retryAfterSeconds),
          'X-RateLimit-Remaining': '0',
        },
      },
    );
  }

  const mime = (request.headers.get('content-type') ?? '').split(';', 1)[0].trim().toLowerCase();
  const extension = MIME_EXTENSIONS[mime];
  if (!extension) return NextResponse.json({ error: 'unsupported payment proof type' }, { status: 415 });

  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'payment proof must not exceed 8 MB' }, { status: 413 });
  }

  // Raw-body upload avoids multipart buffering. The stream itself enforces the
  // limit even when Content-Length is absent or untrusted.
  const bytes = await readBoundedBody(request);
  if (!bytes) return NextResponse.json({ error: 'payment proof must be between 1 byte and 8 MB' }, { status: 413 });
  if (!matchesDeclaredFileType(bytes, mime)) {
    return NextResponse.json({ error: 'payment proof content does not match declared file type' }, { status: 415 });
  }

  const originalName = safeOriginalName(request.headers.get('x-file-name'), extension);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const storagePath = `${user.id}/investment-orders/${orderId}/${sha256}.${extension}`;

  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from('payment-proofs')
    .upload(storagePath, bytes, { contentType: mime, upsert: false });

  const objectCreatedByThisRequest = !uploadError;
  const alreadyExists = !!uploadError && /already exists|duplicate/i.test(uploadError.message.toLowerCase());
  if (uploadError && !alreadyExists) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  }

  const { data, error: rpcError } = await admin.rpc('submit_investment_order_bank_proof_server', {
    p_participant_user_id: user.id,
    p_order_id: orderId,
    p_payment_proof_storage_path: storagePath,
    p_payment_proof_sha256: sha256,
    p_original_name: originalName,
    p_mime: mime,
  });

  if (rpcError) {
    // Concurrent identical requests can share the deterministic object path. A
    // losing request must never delete a proof already referenced by the winner.
    if (objectCreatedByThisRequest) {
      const { data: authoritativeOrder } = await admin
        .from('investment_orders')
        .select('payment_proof_storage_path,payment_proof_sha256')
        .eq('id', orderId)
        .maybeSingle();

      const objectIsAuthoritative = authoritativeOrder?.payment_proof_storage_path === storagePath
        && authoritativeOrder?.payment_proof_sha256 === sha256;
      if (!objectIsAuthoritative) await admin.storage.from('payment-proofs').remove([storagePath]);
    }
    return NextResponse.json({ error: rpcError.message }, { status: 409 });
  }

  return NextResponse.json({
    orderId,
    status: data?.status ?? 'PENDING_BANK_VERIFICATION',
    proofSha256: sha256,
  }, {
    headers: { 'X-RateLimit-Remaining': String(rateLimit.remaining) },
  });
}
