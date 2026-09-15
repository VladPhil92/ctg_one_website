import { PlayerStateCollection } from '../PlayerStateCollection';
import styles from '../dashboard.module.css';

export default function WorldMakersDashboardMissionsPage() {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.kicker}>Misiones</p>
          <h2>Objetivos que vienen del juego, no del marketing.</h2>
          <p>Las misiones aparecen cuando el runtime las sincroniza para tu cuenta. El dashboard no inventa estados de completado ni recompensas.</p>
        </div>
      </div>
      <PlayerStateCollection kind="missions" />
    </section>
  );
}
