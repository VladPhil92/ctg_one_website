import { createClient } from '@/lib/supabase/client';

export type CreatedInvestmentOrder = {
  id: string;
  capital_required_cents: number;
};

export async function createInvestmentOrder(input: {
  lotId: string;
  cases: number;
  idempotencyKey: string;
}): Promise<CreatedInvestmentOrder> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('create_investment_order', {
    p_lot_id: input.lotId,
    p_case_equivalent_units: input.cases,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id || typeof row.capital_required_cents !== 'number') {
    throw new Error('La orden creada no devolvió un contrato válido.');
  }
  return {
    id: row.id,
    capital_required_cents: row.capital_required_cents,
  };
}

export async function uploadInvestmentPaymentProof(input: {
  orderId: string;
  proof: File;
}): Promise<void> {
  const response = await fetch(`/api/investment/orders/${input.orderId}/payment-proof`, {
    method: 'POST',
    headers: {
      'Content-Type': input.proof.type,
      'X-File-Name': encodeURIComponent(input.proof.name.slice(0, 180)),
    },
    body: input.proof,
  });
  const result = await response.json() as { error?: string };
  if (!response.ok) throw new Error(result.error ?? 'No se pudo registrar el comprobante');
}
