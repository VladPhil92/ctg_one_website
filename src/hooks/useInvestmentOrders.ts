'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { InvestmentOrder } from '@/types/investment';

export function useInvestmentOrders() {
  const { userId } = useAuth();
  const [orders, setOrders] = useState<InvestmentOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId || !isSupabaseConfigured) {
      setOrders([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('investment_orders')
      .select('*, lot:investment_production_lots(*)')
      .eq('participant_user_id', userId)
      .order('created_at', { ascending: false });
    if (!error) setOrders((data as unknown as InvestmentOrder[]) ?? []);
    setIsLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);
  return { orders, isLoading, refresh: load };
}
