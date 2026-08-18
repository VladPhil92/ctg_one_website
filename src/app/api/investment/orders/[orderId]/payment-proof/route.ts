import { createHash } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  if (!isSupabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'not available' }, { status: 503 });
  }

  const { orderId } = await params;
  const formData = await request.formData();
  const candidate = formData.get('proof');

  if (!(candidate instanceof File)) {
    return NextResponse.json({ error: 'payment proof file is required' }, { status: 400 });
  }
  if (candidate.size <= 0 || candidate.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'payment proof must be between 1 byte and 8 MB' }, { status: 413 });
  }

  const extension = MIME_EXTENSIONS[candidate.type];
  if (!extension) {
    return NextResponse.json({ error: 'unsupported payment proof type' }, { status: 415 });
  }

  // Authentication/ownership is verified with the participant session first.
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

  const bytes = Buffer.from(await candidate.arrayBuffer());
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const storagePath = `${user.id}/investment-orders/${orderId}/${sha256}.${extension}`;

  // From here onward the server uses service_role only for two narrowly scoped
  // operations: writing the already-authorized private proof and persisting the
  // server-computed digest through a service-role-only RPC.
  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from('payment-proofs')
    .upload(storagePath, bytes, { contentType: candidate.type, upsert: false });

  if (uploadError && !uploadError.message.toLowerCase().includes('already exists')) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  }

  const { data, error: rpcError } = await admin.rpc('submit_investment_order_bank_proof_server', {
    p_participant_user_id: user.id,
    p_order_id: orderId,
    p_payment_proof_storage_path: storagePath,
    p_payment_proof_sha256: sha256,
    p_original_name: candidate.name.slice(0, 180),
    p_mime: candidate.type,
  });

  if (rpcError) {
    // The DB is the authority. If it rejects a duplicate/mismatched submission,
    // remove the just-uploaded object so stale evidence is not left behind.
    await admin.storage.from('payment-proofs').remove([storagePath]);
    return NextResponse.json({ error: rpcError.message }, { status: 409 });
  }

  return NextResponse.json({
    orderId,
    status: data?.status ?? 'PENDING_BANK_VERIFICATION',
    proofSha256: sha256,
  });
}
