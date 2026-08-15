'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { InvestmentProductionLot, InvestmentWithdrawalRequest } from '@/types/investment';

interface AdminSummary {
  lots: InvestmentProductionLot[];
  participantCount: number;
  pendingWithdrawals: InvestmentWithdrawalRequest[];
}

const EMPTY: AdminSummary = { lots: [], participantCount: 0, pendingWithdrawals: [] };

// Admin-only reads — RLS on every table here requires is_investment_admin(),
// so this silently returns empty rows (not an error) for a non-admin
// caller; the page itself also redirects non-admins away.
export function useInvestmentAdminSummary() {
  const { userId } = useAuth();
  const [summary, setSummary] = useState<AdminSummary>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId || !isSupabaseConfigured) {
      setSummary(EMPTY);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const supabase = createClient();

    const [{ data: lots }, { count: participantCount }, { data: pendingWithdrawals }] = await Promise.all([
      supabase.from('investment_production_lots').select('*').order('created_at', { ascending: false }),
      supabase.from('investment_participant_profiles').select('*', { count: 'exact', head: true }),
      supabase.from('investment_withdrawal_requests').select('*').eq('status', 'REQUESTED'),
    ]);

    setSummary({
      lots: (lots as InvestmentProductionLot[]) ?? [],
      participantCount: participantCount ?? 0,
      pendingWithdrawals: (pendingWithdrawals as InvestmentWithdrawalRequest[]) ?? [],
    });
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { summary, isLoading, refresh: load };
}
