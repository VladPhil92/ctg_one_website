import { ArrowRight } from 'lucide-react';
import { worldMakersPublicUrl } from '@/lib/worldmakers/routes';
import { adventures } from '../../portal-data';
import styles from '../dashboard.module.css';

export default function WorldMakersDashboardAdventuresPage() {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.kicker}>Aventuras</p>
          <h2>Un universo organizado para jugar, no para navegar archivos internos.</h2>
          <p>Explora el catálogo desde una sola ruta coherente y entra a cada mundo sin perder el contexto de tu cuenta.</p>
        </div>
      </div>
      <div className={styles.adventureGrid}>
        {adventures.map((adventure) => (
          <a className={styles.adventureCard} href={worldMakersPublicUrl(`/adventures/${adventure.slug}`)} key={adventure.slug}>
            <small>{adventure.disciplines.join(' · ')}</small>
            <h3>{adventure.title}</h3>
            <p>{adventure.challenge}</p>
            <span className={styles.cardFoot}>
              <span>{adventure.status === 'Vertical slice' ? 'Aventura de referencia' : 'En diseño'}</span>
              <ArrowRight size={16} aria-hidden="true" />
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
