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
        setState(null);
        setLoadState('unavailable');
      });
    return () => { cancelled = true; };
  }, []);

  const counts = useMemo(() => {
    if (loadState !== 'ready' || !state) return null;
    return {
      saves: state.saves?.length ?? 0,
      missions: state.missions?.length ?? 0,
      discoveries: state.discoveries?.length ?? 0,
      achievements: state.achievements?.length ?? 0,
    };
  }, [loadState, state]);

  const runtimeConnected = loadState === 'ready' && state?.synchronization?.gameRuntime === 'synced';
  const cloudConnected = loadState === 'ready' && state?.synchronization?.cloudSave === 'connected';
  const metric = (value: number | undefined) => counts ? String(value ?? 0) : '—';

  const revisionCopy = loadState !== 'ready' || !state
    ? 'No podemos verificar la revisión remota mientras el servicio de progreso no responda.'
    : state.profile?.updatedAt
      ? `Revisión actual: ${state.profile.revision ?? 0}. Última actualización: ${new Date(state.profile.updatedAt).toLocaleString()}.`
      : `Revisión actual: ${state.profile?.revision ?? 0}. Aún no existe un guardado remoto verificado.`;

  return (
    <>
      <div className={styles.statGrid}>
        <article className={styles.statCard}><small>Partidas</small><strong>{metric(counts?.saves)}</strong><span>{counts ? 'Guardados vinculados a tu identidad.' : 'Dato pendiente de verificación.'}</span></article>
        <article className={styles.statCard}><small>Misiones</small><strong>{metric(counts?.missions)}</strong><span>{counts ? 'Objetivos recibidos desde gameplay real.' : 'Dato pendiente de verificación.'}</span></article>
        <article className={styles.statCard}><small>Descubrimientos</small><strong>{metric(counts?.discoveries)}</strong><span>{counts ? 'Hallazgos registrados dentro del juego.' : 'Dato pendiente de verificación.'}</span></article>
        <article className={styles.statCard}><small>Logros</small><strong>{metric(counts?.achievements)}</strong><span>{counts ? 'Hitos verificados de tu recorrido.' : 'Dato pendiente de verificación.'}</span></article>
      </div>

      <div className={styles.stateBanner}>
        <span>
          {loadState === 'loading' && 'Consultando el estado de tu cuenta…'}
          {loadState === 'unavailable' && 'El servicio de progreso no está disponible temporalmente. No inferimos ni sustituimos tus datos.'}
          {loadState === 'ready' && !runtimeConnected && 'Tu cuenta está lista. El runtime todavía no ha enviado progreso verificable.'}
          {loadState === 'ready' && runtimeConnected && 'Tu progreso está sincronizado con el runtime de World Makers.'}
        </span>
        <strong className={runtimeConnected || cloudConnected ? styles.stateOk : styles.statePending}>
          {loadState === 'loading' ? 'Consultando' : loadState === 'unavailable' ? 'No disponible' : runtimeConnected ? 'Sincronizado' : cloudConnected ? 'Nube conectada' : 'Esperando primer sync'}
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
              <p>{revisionCopy}</p>
            </article>
          </div>
        </section>
      )}
    </>
  );
}
