import { createClient } from '@/lib/supabase/client';

export type CreatedInvestmentOrder = {
  id: string;
  capital_required_cents: number;
};

// Idempotent: only sets agreement_accepted_at the first time. Safe to call
// on every checkout attempt even if the participant already accepted.
export async function acceptInvestmentAgreement(): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc('accept_investment_agreement');
  if (error) throw error;
}

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

  let result: { error?: string } = {};
  try {
    result = await response.json() as { error?: string };
  } catch {
    // Infrastructure/proxy errors are not guaranteed to return JSON.
  }

  if (!response.ok) {
    throw new Error(result.error ?? `No se pudo registrar el comprobante (HTTP ${response.status})`);
  }
}
