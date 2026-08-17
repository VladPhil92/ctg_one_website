'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId || !isSupabaseConfigured) {
      setSummary(EMPTY);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const supabase = createClient();

    const [{ data: balance }, { data: allocations }, { data: withdrawals }] = await Promise.all([
      supabase.rpc('get_investment_spendable_balance', { p_user: userId }),
      supabase.from('investment_funding_allocations').select('*').eq('participant_user_id', userId),
      supabase
        .from('investment_withdrawal_requests')
        .select('*')
        .eq('participant_user_id', userId)
        .order('created_at', { ascending: false }),
    ]);

    const allocationRows = (allocations as InvestmentFundingAllocation[]) ?? [];

    setSummary({
      availableBalanceCents: (balance as number) ?? 0,
      activeCapitalCents: allocationRows.reduce((sum, allocation) => sum + allocation.capital_committed_cents, 0),
      allocations: allocationRows,
      withdrawalRequests: (withdrawals as InvestmentWithdrawalRequest[]) ?? [],
    });
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { summary, isLoading, refresh: load };
}
