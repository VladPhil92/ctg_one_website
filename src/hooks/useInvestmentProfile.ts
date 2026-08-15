'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { InvestmentParticipantProfile } from '@/types/investment';

// Lazily creates the investment participant profile on first use (ADR-011
// — not every CTG One user has one automatically) by calling the
// ensure_investment_participant_profile() RPC, then keeps it loaded.
export function useInvestmentProfile() {
  const { userId } = useAuth();
  const [profile, setProfile] = useState<InvestmentParticipantProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId || !isSupabaseConfigured) {
      setProfile(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const supabase = createClient();
    const { data } = await supabase.rpc('ensure_investment_participant_profile');
    setProfile((data as InvestmentParticipantProfile) ?? null);
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { profile, isLoading, refresh: load };
}
