'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { AccountReadState } from '@/hooks/useWallet';
import type { InvestmentFundingAllocation, InvestmentWithdrawalRequest } from '@/types/investment';

interface InvestmentSummary {
  availableBalanceCents: number;
  activeCapitalCents: number;
  allocations: InvestmentFundingAllocation[];
  withdrawalRequests: InvestmentWithdrawalRequest[];
}

const EMPTY: InvestmentSummary = {
  availableBalanceCents: 0,
  activeCapitalCents: 0,
  allocations: [],
  withdrawalRequests: [],
};

// The participant dashboard shows spendable balance rather than raw ledger
// balance. Pending withdrawal/reinvestment requests reserve the same financial
// pool in PostgreSQL, preventing the UI from presenting already-committed money
// as available for a second operation.
export function useInvestmentSummary() {
  const { userId } = useAuth();
  const [summary, setSummary] = useState<InvestmentSummary>(EMPTY);
  const [state, setState] = useState<AccountReadState>('loading');

  const load = useCallback(async () => {
    if (!userId || !isSupabaseConfigured) {
      setSummary(EMPTY);
      setState('ready');
      return;
    }

    setState('loading');
    const supabase = createClient();

    const [balanceResult, allocationResult, withdrawalResult] = await Promise.all([
      supabase.rpc('get_investment_spendable_balance', { p_user: userId }),
      supabase.from('investment_funding_allocations').select('*').eq('participant_user_id', userId),
      supabase
        .from('investment_withdrawal_requests')
        .select('*')
        .eq('participant_user_id', userId)
        .order('created_at', { ascending: false }),
    ]);

    if (balanceResult.error || allocationResult.error || withdrawalResult.error) {
      setState('error');
      return;
    }

    const allocationRows = (allocationResult.data as InvestmentFundingAllocation[]) ?? [];

    setSummary({
      availableBalanceCents: (balanceResult.data as number) ?? 0,
      activeCapitalCents: allocationRows.reduce((sum, allocation) => sum + allocation.capital_committed_cents, 0),
      allocations: allocationRows,
      withdrawalRequests: (withdrawalResult.data as InvestmentWithdrawalRequest[]) ?? [],
    });
    setState('ready');
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { summary, isLoading: state === 'loading', state, refresh: load };
}
