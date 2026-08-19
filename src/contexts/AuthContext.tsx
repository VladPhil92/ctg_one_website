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

  const fetchProfile = useCallback(async (uid: string) => {
    if (!isSupabaseConfigured) return null;
    const supabase = createClient();
    const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    if (error) return null;
    return (data as Profile | null) ?? null;
  }, []);

  const clearIdentity = useCallback(() => {
    setUserId(null);
    setEmail(null);
    setProfile(null);
  }, []);

  useEffect(() => {
    // Marketing routes must remain renderable before Supabase environment
    // variables are provisioned. In that case Auth behaves as signed out.
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    const supabase = createClient();
    let mounted = true;

    const bootstrapValidatedIdentity = async () => {
      // getUser() validates the access token with Supabase Auth. Do not use the
      // locally cached session as the initial source of authenticated identity.
      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;

      if (error || !data.user) {
        clearIdentity();
        setIsLoading(false);
        return;
      }

      setUserId(data.user.id);
      setEmail(data.user.email ?? null);
      const nextProfile = await fetchProfile(data.user.id);
      if (!mounted) return;
      setProfile(nextProfile);
      setIsLoading(false);
    };

    void bootstrapValidatedIdentity();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT' || !session?.user) {
        clearIdentity();
        setIsLoading(false);
        return;
      }

      // Auth events are emitted by the Supabase client after a session change.
      // Use them for responsive client UI, while protected server routes and the
      // initial bootstrap continue to validate identity independently.
      setUserId(session.user.id);
      setEmail(session.user.email ?? null);
      setIsLoading(false);
      void fetchProfile(session.user.id).then((nextProfile) => {
        if (mounted) setProfile(nextProfile);
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [clearIdentity, fetchProfile]);

  const signOut = async () => {
    if (isSupabaseConfigured) {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
    clearIdentity();
  };

  const refreshProfile = async () => {
    if (!userId) return;
    setProfile(await fetchProfile(userId));
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
