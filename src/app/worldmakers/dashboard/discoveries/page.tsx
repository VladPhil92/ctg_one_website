import { PlayerStateCollection } from '../PlayerStateCollection';
import styles from '../dashboard.module.css';

export default function WorldMakersDashboardDiscoveriesPage() {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.kicker}>Descubrimientos</p>
          <h2>Tu archivo de hallazgos dentro del mundo.</h2>
          <p>Especies, lugares, sistemas y otros descubrimientos sólo se incorporan cuando el runtime envía evidencia real asociada a tu identidad.</p>
        </div>
      </div>
      <PlayerStateCollection kind="discoveries" />
    </section>
  );
}
