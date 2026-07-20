'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import type { Profile } from '@/types/domain';

interface AuthContextType {
  userId: string | null;
  email: string | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async (uid: string) => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single();
    setProfile((data as Profile) ?? null);
  }, []);

  useEffect(() => {
    // Supabase isn't configured yet in every environment (e.g. before the
    // project's env vars are set up) — behave as "signed out" instead of
    // throwing, so every other page keeps rendering normally.
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    const supabase = createClient();
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUserId(session?.user?.id ?? null);
      setEmail(session?.user?.email ?? null);
      if (session?.user) {
        loadProfile(session.user.id).finally(() => mounted && setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      setEmail(session?.user?.email ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signOut = async () => {
    if (isSupabaseConfigured) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    setUserId(null);
    setEmail(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (userId) await loadProfile(userId);
  };

  return (
    <AuthContext.Provider
      value={{
        userId,
        email,
        profile,
        isAuthenticated: !!userId,
        isLoading,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
