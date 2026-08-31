import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import {
  fetchNvetVetTransactionDetail,
  requireNvetVet,
  submitNvetTransferEvidence,
} from '@/lib/nvetcareapp/vet-operations';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) return NextResponse.json({ message: 'No autenticado' }, { status: 401 });

  const vet = await requireNvetVet(accessToken);
  if (!vet.ok) return NextResponse.json({ message: vet.message }, { status: vet.status });

  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ message: 'Transacción inválida' }, { status: 400 });

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ message: 'Formulario inválido' }, { status: 400 });

  const transferCodeValue = form.get('transferCode');
  const fileValue = form.get('file');
  const transferCode = typeof transferCodeValue === 'string' ? transferCodeValue.trim() : '';

  if (transferCode.length < 4 || transferCode.length > 50) {
    return NextResponse.json({ message: 'Código de transferencia inválido' }, { status: 400 });
  }
  if (!(fileValue instanceof File)) {
    return NextResponse.json({ message: 'El comprobante es obligatorio' }, { status: 400 });
  }
  if (fileValue.size <= 0 || fileValue.size > MAX_FILE_BYTES || !ALLOWED_TYPES.has(fileValue.type)) {
    return NextResponse.json(
      { message: 'El comprobante debe ser PDF, JPG, PNG o WEBP y pesar máximo 5 MB' },
      { status: 400 },
    );
  }

  // Read the exact transaction from the backend. Its getTransactionById
  // contract is ownership-aware, so authorization remains correct regardless
  // of list pagination or how many historical payments the vet has.
  const transactionResult = await fetchNvetVetTransactionDetail(accessToken, id);
  if (!transactionResult.ok) {
    return NextResponse.json({ message: transactionResult.message }, { status: transactionResult.status });
  }
  const transaction = transactionResult.data;
  if (transaction.paymentMethod !== 'TRANSFER') {
    return NextResponse.json({ message: 'Solo las transferencias admiten comprobante' }, { status: 409 });
  }
  if (transaction.status !== 'PENDING') {
    return NextResponse.json({ message: 'Esta transferencia ya no está pendiente de comprobante' }, { status: 409 });
  }

  const result = await submitNvetTransferEvidence(accessToken, id, {
    transferCode,
    file: fileValue,
  });
  if (!result.ok) return NextResponse.json({ message: result.message }, { status: result.status });

  return NextResponse.json(result.data);
}
