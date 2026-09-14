'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import type { Transaction } from '@/types/domain';
import type { AccountReadState } from '@/hooks/useWallet';

export function useAccountTransactions(limit = 6) {
  const { userId } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [state, setState] = useState<AccountReadState>('loading');

  const load = useCallback(async () => {
    if (!userId || !isSupabaseConfigured) {
      setTransactions([]);
      setState('ready');
      return;
    }

    setState('loading');
    const supabase = createClient();
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      setState('error');
      return;
    }

    setTransactions((data as Transaction[]) ?? []);
    setState('ready');
  }, [limit, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { transactions, isLoading: state === 'loading', state, refresh: load };
}
