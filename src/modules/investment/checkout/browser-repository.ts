import { createClient } from '@/lib/supabase/client';
import type { InvestmentOrderStatus } from '@/types/investment';

export type CreatedInvestmentOrder = {
  id: string;
  capital_required_cents: number;
};

export type ResumableInvestmentOrder = {
  id: string;
  lot_id: string;
  case_equivalent_units: number;
  capital_required_cents: number;
  status: InvestmentOrderStatus;
};

export async function getInvestmentOrderForResume(input: {
  orderId: string;
  lotId: string;
}): Promise<ResumableInvestmentOrder> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('investment_orders')
    .select('id,lot_id,case_equivalent_units,capital_required_cents,status')
    .eq('id', input.orderId)
    .eq('lot_id', input.lotId)
    .maybeSingle();

  if (error) throw error;
  if (!data?.id) {
    throw new Error('No se encontró una orden reanudable para este usuario y lote.');
  }

  return data as ResumableInvestmentOrder;
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
