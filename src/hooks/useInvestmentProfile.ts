'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { InvestmentParticipantProfile } from '@/types/investment';

// Lazily creates the investment participant profile on first use (ADR-011)
// and synchronizes its investment-domain KYC projection from CTG One's
// authoritative profiles.kyc_status via ensure_investment_participant_profile().
//
// A failed RPC must never be rendered as NOT_STARTED: that would turn an
// infrastructure/data error into a false KYC decision and can incorrectly
// block a verified participant.
export function useInvestmentProfile() {
  const { userId } = useAuth();
  const [profile, setProfile] = useState<InvestmentParticipantProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    if (!isSupabaseConfigured) {
      setProfile(null);
      setError('El servicio de identidad no está configurado.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc('ensure_investment_participant_profile');

      if (rpcError) {
        setProfile(null);
        setError('No pudimos sincronizar tu identidad CTG One con el módulo de inversión.');
        return;
      }

      if (!data) {
        setProfile(null);
        setError('No recibimos un perfil de inversión válido.');
        return;
      }

      setProfile(data as InvestmentParticipantProfile);
    } catch {
      setProfile(null);
      setError('No pudimos sincronizar tu identidad CTG One con el módulo de inversión.');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { profile, isLoading, error, refresh: load };
}
