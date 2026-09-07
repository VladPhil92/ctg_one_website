import { createClient } from '@/lib/supabase/client';
import { pageRange } from '@/lib/pagination';
import { runFinancialControl } from '@/lib/security/financial-control-client';
import type { InvestmentOrder } from '@/types/investment';

type RpcError = { message: string } | null;

export type PendingInvestmentOrdersPage = {
  rows: InvestmentOrder[];
  totalCount: number;
};

export function createInvestmentAdminOrdersRepository() {
  return {
    async listPending(page: number, pageSize: number): Promise<PendingInvestmentOrdersPage> {
      const supabase = createClient();
      const { from, to } = pageRange(page, pageSize);
      const { data, count, error } = await supabase
        .from('investment_orders')
        .select('*, lot:investment_production_lots(*)', { count: 'exact' })
        .in('status', ['AWAITING_PAYMENT', 'PENDING_BANK_VERIFICATION'])
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to);

      if (error) throw new Error(error.message);
      return { rows: (data as unknown as InvestmentOrder[]) ?? [], totalCount: count ?? 0 };
    },

    async createPaymentProofSignedUrl(storagePath: string): Promise<string> {
      const supabase = createClient();
      const { data, error } = await supabase.storage.from('payment-proofs').createSignedUrl(storagePath, 300);
      if (error || !data?.signedUrl) throw new Error(error?.message ?? 'No se pudo abrir el comprobante');
      return data.signedUrl;
    },

    async verifyBancolombiaTransfer(payload: {
      p_order_id: string;
      p_bank_reference: string;
      p_received_amount_cents: number;
      p_bank_received_at: string;
      p_notes: string | null;
    }): Promise<{ error: RpcError }> {
      return runFinancialControl({
        operation: 'funding.verifyBankTransfer',
        orderId: payload.p_order_id,
        bankReference: payload.p_bank_reference,
        receivedAmountCents: payload.p_received_amount_cents,
        bankReceivedAt: payload.p_bank_received_at,
        notes: payload.p_notes,
      });
    },

    async verifyCryptoTransfer(payload: {
      p_order_id: string;
      p_transaction_hash: string;
      p_network: string;
      p_received_amount_cents: number;
      p_received_at: string;
      p_notes: string | null;
    }): Promise<{ error: RpcError }> {
      return runFinancialControl({
        operation: 'funding.verifyCryptoTransfer',
        orderId: payload.p_order_id,
        transactionHash: payload.p_transaction_hash,
        network: payload.p_network,
        receivedAmountCents: payload.p_received_amount_cents,
        receivedAt: payload.p_received_at,
        notes: payload.p_notes,
      });
    },

    async rejectBankProof(orderId: string, reason: string): Promise<{ error: RpcError }> {
      const supabase = createClient();
      return await supabase.rpc('reject_investment_bank_proof', {
        p_order_id: orderId,
        p_reason: reason,
      });
    },

    async rejectUnpaidOrder(orderId: string, reason: string): Promise<{ error: RpcError }> {
      const supabase = createClient();
      return await supabase.rpc('reject_investment_order', {
        p_order_id: orderId,
        p_admin_notes: reason,
      });
    },
  };
}

export type InvestmentAdminOrdersRepository = ReturnType<typeof createInvestmentAdminOrdersRepository>;
