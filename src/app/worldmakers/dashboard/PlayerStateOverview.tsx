'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { worldMakersDashboardPath } from '@/lib/worldmakers/routes';
import { usePlayerState } from './PlayerStateProvider';
import styles from './dashboard.module.css';

export function PlayerStateOverview({ detailed = false }: { detailed?: boolean }) {
  const { state, loadState } = usePlayerState();

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

  const cards = [
    { label: 'Partidas', value: metric(counts?.saves), body: counts ? 'Guardados vinculados a tu identidad.' : 'Dato pendiente de verificación.', href: '/saves' },
    { label: 'Misiones', value: metric(counts?.missions), body: counts ? 'Objetivos recibidos desde gameplay real.' : 'Dato pendiente de verificación.', href: '/missions' },
    { label: 'Descubrimientos', value: metric(counts?.discoveries), body: counts ? 'Hallazgos registrados dentro del juego.' : 'Dato pendiente de verificación.', href: '/discoveries' },
    { label: 'Logros', value: metric(counts?.achievements), body: counts ? 'Hitos verificados de tu recorrido.' : 'Dato pendiente de verificación.', href: '/achievements' },
  ] as const;

  return (
    <>
      <div className={styles.statGrid}>
        {cards.map((card) => (
          <Link className={styles.statCard} href={worldMakersDashboardPath(card.href)} key={card.label}>
            <small>{card.label}</small>
            <strong>{card.value}</strong>
            <span>{card.body}</span>
          </Link>
        ))}
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
