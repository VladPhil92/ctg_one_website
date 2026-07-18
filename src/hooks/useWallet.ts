'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Wallet } from '@/types/domain';

export function useWallet() {
  const { userId } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId || !isSupabaseConfigured) {
      setWallet(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const supabase = createClient();
    const { data } = await supabase.from('wallets').select('*').eq('user_id', userId).single();
    setWallet((data as Wallet) ?? null);
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { wallet, isLoading, refresh: load };
}
