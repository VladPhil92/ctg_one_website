'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserProfile } from '@/types/web3';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string) => Promise<void>;
  connectWallet: (address: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('ctg_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockUser: UserProfile = {
        id: Math.random().toString(36).substr(2, 9),
        email,
        createdAt: new Date(),
        kycVerified: false,
        tier: 'basic',
      };

      setUser(mockUser);
      localStorage.setItem('ctg_user', JSON.stringify(mockUser));
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockUser: UserProfile = {
        id: Math.random().toString(36).substr(2, 9),
        email,
        createdAt: new Date(),
        kycVerified: false,
        tier: 'basic',
      };

      setUser(mockUser);
      localStorage.setItem('ctg_user', JSON.stringify(mockUser));
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('ctg_user');
  };

  const connectWallet = async (address: string) => {
    if (!user) throw new Error('Must be logged in to connect wallet');
    
    // TODO: Verify wallet ownership
    const updatedUser = { ...user, walletAddress: address };
    setUser(updatedUser);
    localStorage.setItem('ctg_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        register,
        connectWallet,
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
