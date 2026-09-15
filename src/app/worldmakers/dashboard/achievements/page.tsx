import { PlayerStateCollection } from '../PlayerStateCollection';
import styles from '../dashboard.module.css';

export default function WorldMakersDashboardAchievementsPage() {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.kicker}>Logros</p>
          <h2>Hitos que sólo existen después de ocurrir.</h2>
          <p>El dashboard muestra únicamente logros sincronizados por el runtime. No se anticipan badges, XP ni recompensas todavía no obtenidas.</p>
        </div>
      </div>
      <PlayerStateCollection kind="achievements" />
    </section>
  );
}
