import { PlayerStateCollection } from '../PlayerStateCollection';
import styles from '../dashboard.module.css';

export default function WorldMakersDashboardSavesPage() {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.kicker}>Partidas</p>
          <h2>Tu continuidad vive en guardados verificables.</h2>
          <p>Esta biblioteca sólo muestra slots recibidos desde el runtime autenticado. Una caída del servicio nunca se representa como pérdida de progreso.</p>
        </div>
      </div>
      <PlayerStateCollection kind="saves" />
    </section>
  );
}
