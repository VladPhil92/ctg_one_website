'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { PlayerStatePayload } from './player-state-model';

export type PlayerStateLoadState = 'loading' | 'ready' | 'unavailable';

type PlayerStateContextValue = {
  state: PlayerStatePayload | null;
  loadState: PlayerStateLoadState;
  refresh: () => void;
};

const PlayerStateContext = createContext<PlayerStateContextValue | null>(null);

export function PlayerStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PlayerStatePayload | null>(null);
  const [loadState, setLoadState] = useState<PlayerStateLoadState>('loading');
  const [refreshToken, setRefreshToken] = useState(0);

  const refresh = useCallback(() => {
    setLoadState('loading');
    setRefreshToken((value) => value + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoadState('loading');

    void fetch('/api/worldmakers/player-state', {
      cache: 'no-store',
      credentials: 'include',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('player_state_unavailable');
        return response.json() as Promise<PlayerStatePayload>;
      })
      .then((payload) => {
        setState(payload);
        setLoadState('ready');
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState(null);
        setLoadState('unavailable');
        void error;
      });

    return () => controller.abort();
  }, [refreshToken]);

  const value = useMemo(() => ({ state, loadState, refresh }), [state, loadState, refresh]);

  return <PlayerStateContext.Provider value={value}>{children}</PlayerStateContext.Provider>;
}

export function usePlayerState() {
  const context = useContext(PlayerStateContext);
  if (!context) {
    throw new Error('usePlayerState must be used within PlayerStateProvider');
  }
  return context;
}
