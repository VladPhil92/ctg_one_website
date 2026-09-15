import { ArrowRight } from 'lucide-react';
import { adventures } from '../portal-data';
import { worldMakersVisuals } from '../visual-assets';
import { PlayerStateOverview } from './PlayerStateOverview';
import styles from './dashboard.module.css';

const WORLDMAKERS_ORIGIN = 'https://worldmakers.ctgone.com';
const PLAYER_DASHBOARD_ORIGIN = 'https://ctgone.com/worldmakers/dashboard';

export default function WorldMakersDashboardPage() {
  const featured = adventures[0]!;
  const shelf = adventures.slice(1, 4);

  return (
    <>
      <section className={styles.hero}>
        <img
          className={styles.heroImage}
          src={worldMakersVisuals.gameplayOverview.src}
          alt={worldMakersVisuals.gameplayOverview.alt}
          width={worldMakersVisuals.gameplayOverview.width}
          height={worldMakersVisuals.gameplayOverview.height}
        />
        <span className={styles.heroShade} aria-hidden="true" />
        <div className={styles.heroContent}>
          <p className={styles.kicker}>Tu base de operaciones</p>
          <h1>Explora, construye y deja que el mundo recuerde.</h1>
          <p>
            El Player Dashboard conecta tu identidad CTG One con las aventuras de World Makers y con el progreso real que el juego sincronice.
          </p>
          <div className={styles.heroActions}>
            <a className={styles.primaryButton} href={`${WORLDMAKERS_ORIGIN}/adventures/${featured.slug}`}>
              Explorar {featured.title} <ArrowRight size={17} aria-hidden="true" />
            </a>
            <a className={styles.secondaryButton} href={`${PLAYER_DASHBOARD_ORIGIN}/progress`}>Ver mi progreso</a>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="dashboard-state-title">
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.kicker}>Estado de jugador</p>
            <h2 id="dashboard-state-title">Tu actividad, sin datos inventados.</h2>
            <p>La web consulta el contrato autenticado de World Makers y muestra únicamente progreso que existe realmente.</p>
          </div>
          <a className={styles.sectionLink} href={`${PLAYER_DASHBOARD_ORIGIN}/progress`}>Abrir progreso →</a>
        </div>
        <PlayerStateOverview />
      </section>

      <section className={styles.section} aria-labelledby="dashboard-adventures-title">
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.kicker}>Siguiente horizonte</p>
            <h2 id="dashboard-adventures-title">Aventuras para seguir descubriendo.</h2>
            <p>Un catálogo pensado como mundos jugables, no como un menú académico.</p>
          </div>
          <a className={styles.sectionLink} href={`${PLAYER_DASHBOARD_ORIGIN}/adventures`}>Ver catálogo →</a>
        </div>
        <div className={styles.adventureGrid}>
          {shelf.map((adventure) => (
            <a className={styles.adventureCard} href={`${WORLDMAKERS_ORIGIN}/adventures/${adventure.slug}`} key={adventure.slug}>
              <small>{adventure.disciplines.join(' · ')}</small>
              <h3>{adventure.title}</h3>
              <p>{adventure.premise}</p>
              <span className={styles.cardFoot}><span>Conocer aventura</span><ArrowRight size={16} aria-hidden="true" /></span>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}
