'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Wallet } from '@/types/domain';

export type AccountReadState = 'loading' | 'ready' | 'error';

export function useWallet() {
  const { userId } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [state, setState] = useState<AccountReadState>('loading');

  const load = useCallback(async () => {
    if (!userId || !isSupabaseConfigured) {
      setWallet(null);
      setState('ready');
      return;
    }

    setState('loading');
    const supabase = createClient();
    const { data, error } = await supabase.from('wallets').select('*').eq('user_id', userId).maybeSingle();

    if (error) {
      setState('error');
      return;
    }

    setWallet((data as Wallet | null) ?? null);
    setState('ready');
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { wallet, isLoading: state === 'loading', state, refresh: load };
}
