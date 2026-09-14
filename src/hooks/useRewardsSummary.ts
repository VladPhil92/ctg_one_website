'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export type RewardsReadState = 'loading' | 'ready' | 'error';

export type RewardsLedgerEntry = {
  id: string;
  entry_type: 'earn' | 'adjustment' | 'reversal';
  points_delta: number;
  balance_after: number;
  source_domain: string;
  source_reference: string | null;
  description: string | null;
  created_at: string;
};

export type RewardsSummary = {
  state: RewardsReadState;
  account: {
    status: 'foundation' | 'active' | 'frozen';
    pointsBalance: number;
    lifetimeEarned: number;
    lifetimeReversed: number;
    updatedAt: string;
  } | null;
  ledger: RewardsLedgerEntry[];
  commercialStatus: 'inactive';
};

const EMPTY: RewardsSummary = {
  state: 'loading',
  account: null,
  ledger: [],
  commercialStatus: 'inactive',
};

type RewardsPayload = {
  ok?: boolean;
  program?: { commercialStatus?: string };
  account?: {
    status?: 'foundation' | 'active' | 'frozen';
    points_balance?: number;
    lifetime_earned?: number;
    lifetime_reversed?: number;
    updated_at?: string;
  };
  ledger?: RewardsLedgerEntry[];
};

export function useRewardsSummary() {
  const { isAuthenticated } = useAuth();
  const [summary, setSummary] = useState<RewardsSummary>(EMPTY);

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setSummary({ ...EMPTY, state: 'ready' });
      return;
    }

    setSummary((current) => ({ ...current, state: 'loading' }));
    try {
      const response = await fetch('/api/rewards/account', {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const payload = (await response.json().catch(() => ({}))) as RewardsPayload;
      const account = payload.account;

      if (!response.ok || !payload.ok || !account?.status || !account.updated_at) {
        setSummary((current) => ({ ...current, state: 'error' }));
        return;
      }

      setSummary({
        state: 'ready',
        account: {
          status: account.status,
          pointsBalance: Number(account.points_balance ?? 0),
          lifetimeEarned: Number(account.lifetime_earned ?? 0),
          lifetimeReversed: Number(account.lifetime_reversed ?? 0),
          updatedAt: account.updated_at,
        },
        ledger: payload.ledger ?? [],
        commercialStatus: 'inactive',
      });
    } catch {
      setSummary((current) => ({ ...current, state: 'error' }));
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void load();
  }, [load]);

  return { summary, refresh: load };
}
