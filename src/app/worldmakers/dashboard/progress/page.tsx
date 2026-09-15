import { PlayerStateOverview } from '../PlayerStateOverview';
import styles from '../dashboard.module.css';

export default function WorldMakersProgressPage() {
  return (
    <>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.kicker}>Progreso</p>
            <h2>Lo que haces en el juego, reflejado aquí.</h2>
            <p>
              Esta ruta está preparada para partidas, misiones, descubrimientos y logros sincronizados desde el runtime autenticado de World Makers.
            </p>
          </div>
        </div>
        <PlayerStateOverview detailed />
      </section>
    </>
  );
}
