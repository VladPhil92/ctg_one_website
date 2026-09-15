'use client';

import { RefreshCw } from 'lucide-react';
import { collectionFor, formatPlayerTimestamp, normalizePlayerStateItem, type PlayerStateKind } from './player-state-model';
import { usePlayerState } from './PlayerStateProvider';
import styles from './dashboard.module.css';

const EMPTY_COPY: Record<PlayerStateKind, { title: string; body: string }> = {
  saves: {
    title: 'Todavía no hay partidas sincronizadas.',
    body: 'Cuando un build autenticado de World Makers cree un guardado real, aparecerá aquí. La web no crea slots ficticios.',
  },
  missions: {
    title: 'Todavía no hay misiones sincronizadas.',
    body: 'Los objetivos aparecerán únicamente cuando el runtime los envíe para tu cuenta.',
  },
  discoveries: {
    title: 'Todavía no hay descubrimientos sincronizados.',
    body: 'Los hallazgos del mundo aparecerán aquí cuando exista evidencia enviada por gameplay real.',
  },
  achievements: {
    title: 'Todavía no hay logros sincronizados.',
    body: 'Los hitos sólo se mostrarán después de ser registrados por el runtime de World Makers.',
  },
};

export function PlayerStateCollection({ kind }: { kind: PlayerStateKind }) {
  const { state, loadState, refresh } = usePlayerState();
  const rawItems = collectionFor(state, kind);
  const items = rawItems
    .map((item, index) => normalizePlayerStateItem(kind, item, index))
    .sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return bTime - aTime;
    });

  if (loadState === 'loading') {
    return (
      <div className={styles.collectionGrid} aria-busy="true" aria-label="Cargando estado del jugador">
        {Array.from({ length: 3 }).map((_, index) => (
          <div className={styles.collectionSkeleton} key={index} aria-hidden="true" />
        ))}
      </div>
    );
  }

  if (loadState === 'unavailable') {
    return (
      <div className={styles.unavailablePanel} role="status">
        <div>
          <strong>No pudimos verificar tu estado de jugador.</strong>
          <p>No mostramos ceros ni asumimos que perdiste progreso cuando el servicio no responde.</p>
        </div>
        <button type="button" onClick={refresh} className={styles.retryButton}>
          <RefreshCw size={15} aria-hidden="true" /> Reintentar
        </button>
      </div>
    );
  }

  if (!items.length) {
    const copy = EMPTY_COPY[kind];
    return (
      <div className={styles.empty}>
        <div>
          <strong>{copy.title}</strong>
          <span>{copy.body}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.collectionGrid}>
      {items.map((item) => {
        const timestamp = formatPlayerTimestamp(item.timestamp);
        return (
          <article className={styles.collectionCard} key={item.id}>
            <div className={styles.collectionCardTop}>
              <div>
                {item.subtitle && <small>{item.subtitle}</small>}
                <h3>{item.title}</h3>
              </div>
              <span className={styles.syncedPill}>Sincronizado</span>
            </div>

            {item.description && <p>{item.description}</p>}

            {item.meta.length > 0 && (
              <div className={styles.collectionMeta}>
                {item.meta.map((meta) => <span key={meta}>{meta}</span>)}
              </div>
            )}

            {item.progress !== null && (
              <div className={styles.collectionProgress} aria-label={`Progreso ${item.progress}%`}>
                <div><span>Progreso reportado</span><strong>{item.progress}%</strong></div>
                <span className={styles.collectionProgressTrack}>
                  <span style={{ width: `${item.progress}%` }} />
                </span>
              </div>
            )}

            <footer className={styles.collectionFoot}>
              <span>{timestamp ? `Actualizado ${timestamp}` : 'Sin marca temporal compatible'}</span>
              <code>{item.id}</code>
            </footer>
          </article>
        );
      })}
    </div>
  );
}
