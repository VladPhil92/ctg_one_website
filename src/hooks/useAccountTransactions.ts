'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import type { Transaction } from '@/types/domain';

export function useAccountTransactions(limit = 6) {
  const { userId } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId || !isSupabaseConfigured) {
      setTransactions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    setTransactions((data as Transaction[]) ?? []);
    setIsLoading(false);
  }, [limit, userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { transactions, isLoading, refresh: load };
}
