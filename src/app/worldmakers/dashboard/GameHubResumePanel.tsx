'use client';

import { ArrowRight, Cloud, Gamepad2 } from 'lucide-react';
import { worldMakersDashboardUrl, worldMakersPublicUrl } from '@/lib/worldmakers/routes';
import { collectionFor, formatPlayerTimestamp, normalizePlayerStateItem } from './player-state-model';
import { usePlayerState } from './PlayerStateProvider';
import styles from './dashboard.module.css';

export function GameHubResumePanel() {
  const { state, loadState } = usePlayerState();

  if (loadState === 'loading') {
    return <div className={styles.resumeSkeleton} aria-busy="true" aria-label="Buscando última partida" />;
  }

  if (loadState === 'unavailable') {
    return (
      <article className={styles.resumePanel}>
        <span className={styles.resumeIcon}><Cloud size={19} aria-hidden="true" /></span>
        <div>
          <p className={styles.kicker}>Continuidad de juego</p>
          <h2>No podemos verificar tu última partida ahora.</h2>
          <p>El dashboard no sustituye datos remotos ni ofrece un falso “continuar” cuando el estado no puede comprobarse.</p>
        </div>
      </article>
    );
  }

  const saves = collectionFor(state, 'saves')
    .map((save, index) => normalizePlayerStateItem('saves', save, index))
    .sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return bTime - aTime;
    });
  const latest = saves[0] ?? null;

  if (!latest) {
    return (
      <article className={styles.resumePanel}>
        <span className={styles.resumeIcon}><Gamepad2 size={19} aria-hidden="true" /></span>
        <div>
          <p className={styles.kicker}>Continuidad de juego</p>
          <h2>Tu primera partida todavía no existe en la nube.</h2>
          <p>Cuando un build autenticado sincronice un guardado real, este espacio se convertirá en tu acceso de continuidad.</p>
          <a className={styles.inlineAction} href={worldMakersPublicUrl('/adventures')}>
            Explorar aventuras <ArrowRight size={15} aria-hidden="true" />
          </a>
        </div>
      </article>
    );
  }

  const timestamp = formatPlayerTimestamp(latest.timestamp);

  return (
    <article className={styles.resumePanelReady}>
      <span className={styles.resumeIcon}><Gamepad2 size={19} aria-hidden="true" /></span>
      <div className={styles.resumeBody}>
        <p className={styles.kicker}>Última partida sincronizada</p>
        <h2>{latest.title}</h2>
        <p>
          {latest.subtitle ? `${latest.subtitle}. ` : ''}
          {timestamp ? `Actualizada ${timestamp}.` : 'Guardado verificado por el runtime.'}
        </p>
        {latest.progress !== null && (
          <div className={styles.resumeProgress}>
            <span><span style={{ width: `${latest.progress}%` }} /></span>
            <strong>{latest.progress}%</strong>
          </div>
        )}
      </div>
      <a className={styles.resumeAction} href={worldMakersDashboardUrl('/saves')}>
        Abrir mis partidas <ArrowRight size={16} aria-hidden="true" />
      </a>
    </article>
  );
}
