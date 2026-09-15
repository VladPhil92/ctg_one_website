'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './dashboard.module.css';

type PlayerState = {
  schemaVersion?: number;
  synchronization?: {
    identity?: string;
    gameRuntime?: string;
    cloudSave?: string;
  };
  saves?: unknown[];
  missions?: unknown[];
  discoveries?: unknown[];
  achievements?: unknown[];
  profile?: { exists?: boolean; revision?: number; updatedAt?: string | null };
};

type LoadState = 'loading' | 'ready' | 'unavailable';

export function PlayerStateOverview({ detailed = false }: { detailed?: boolean }) {
  const [state, setState] = useState<PlayerState | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/worldmakers/player-state', { cache: 'no-store', credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) throw new Error('player_state_unavailable');
        return response.json() as Promise<PlayerState>;
      })
      .then((payload) => {
        if (cancelled) return;
        setState(payload);
        setLoadState('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setLoadState('unavailable');
      });
    return () => { cancelled = true; };
  }, []);

  const counts = useMemo(() => ({
    saves: state?.saves?.length ?? 0,
    missions: state?.missions?.length ?? 0,
    discoveries: state?.discoveries?.length ?? 0,
    achievements: state?.achievements?.length ?? 0,
  }), [state]);

  const runtimeConnected = state?.synchronization?.gameRuntime === 'synced';
  const cloudConnected = state?.synchronization?.cloudSave === 'connected';

  return (
    <>
      <div className={styles.statGrid}>
        <article className={styles.statCard}><small>Partidas</small><strong>{counts.saves}</strong><span>Guardados vinculados a tu identidad.</span></article>
        <article className={styles.statCard}><small>Misiones</small><strong>{counts.missions}</strong><span>Objetivos recibidos desde gameplay real.</span></article>
        <article className={styles.statCard}><small>Descubrimientos</small><strong>{counts.discoveries}</strong><span>Hallazgos registrados dentro del juego.</span></article>
        <article className={styles.statCard}><small>Logros</small><strong>{counts.achievements}</strong><span>Hitos verificados de tu recorrido.</span></article>
      </div>

      <div className={styles.stateBanner}>
        <span>
          {loadState === 'loading' && 'Consultando el estado de tu cuenta…'}
          {loadState === 'unavailable' && 'El servicio de progreso no está disponible temporalmente. Tu identidad sigue protegida en CTG One.'}
          {loadState === 'ready' && !runtimeConnected && 'Tu cuenta está lista. El runtime todavía no ha enviado progreso verificable.'}
          {loadState === 'ready' && runtimeConnected && 'Tu progreso está sincronizado con el runtime de World Makers.'}
        </span>
        <strong className={runtimeConnected || cloudConnected ? styles.stateOk : styles.statePending}>
          {runtimeConnected ? 'Sincronizado' : cloudConnected ? 'Nube conectada' : 'Esperando primer sync'}
        </strong>
      </div>

      {detailed && (
        <section className={styles.section}>
          <div className={styles.gridTwo}>
            <article className={styles.panel}>
              <h3>Integridad de sincronización</h3>
              <p>
                World Makers no genera niveles, XP ni estadísticas ficticias desde la web. Esta vista refleja únicamente lo que el endpoint autenticado de jugador confirma para tu cuenta.
              </p>
            </article>
            <article className={styles.panel}>
              <h3>Revisión de nube</h3>
              <p>
                Revisión actual: {state?.profile?.revision ?? 0}. {state?.profile?.updatedAt ? `Última actualización: ${new Date(state.profile.updatedAt).toLocaleString()}.` : 'Aún no existe un guardado remoto.'}
              </p>
            </article>
          </div>
        </section>
      )}
    </>
  );
}
