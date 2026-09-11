import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Map, Sparkles } from 'lucide-react';
import { PortalFooter, PortalNav } from '../PortalChrome';
import { adventures } from '../portal-data';
import styles from '../portal.module.css';

export const metadata: Metadata = {
  title: 'Adventures | World Makers',
  description: 'Explore the Fantastic Learning Universe: World Makers adventures where mathematics, science, language, literature and philosophy become world problems to solve.',
  alternates: { canonical: 'https://worldmakers.ctgone.com/adventures' },
};

export default function AdventuresPage() {
  return (
    <main className={styles.portal}>
      <PortalNav />
      <section className={styles.hero}>
        <div className={`${styles.shell} ${styles.heroGrid}`}>
          <div>
            <p className={styles.kicker}>FANTASTIC LEARNING UNIVERSE</p>
            <h1>Las materias se convierten en mundos.</h1>
            <p className={styles.heroLead}>
              Cada aventura nace de una pregunta jugable. La idea académica no aparece después de la diversión: cambia lo que puedes construir, descubrir, reparar, interpretar o defender dentro del mundo.
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryButton} href="/worldmakers/how-to-play">Cómo funciona el juego <ArrowRight size={17} /></Link>
              <Link className={styles.secondaryButton} href="/worldmakers/development">Ver estado de desarrollo</Link>
            </div>
          </div>
          <aside className={styles.heroCard}>
            <div className={styles.heroCardIcon}><Map size={30} /></div>
            <div>
              <p className={styles.kicker} style={{ color: '#9fe7ff' }}>ADVENTURE DESIGN RULE</p>
              <h2>Si puedes quitar la idea y la misión sigue igual, todavía no es World Makers.</h2>
              <p>La evidencia de aprendizaje debe surgir de lo que el jugador hace: observar, construir, experimentar, interpretar, comunicar, decidir o revisar.</p>
            </div>
          </aside>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.shell}>
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>WORLD ATLAS</p>
            <h2>Explora las primeras regiones del universo.</h2>
            <p className={styles.sectionLead}>El Caribbean Rainforest funciona como vertical slice de referencia. Las demás regiones son candidatos del primer Fantastic Adventure Pack y se muestran como dirección de producto, no como niveles públicamente jugables.</p>
          </div>
          <div className={styles.adventureGrid}>
            {adventures.map((adventure) => (
              <article className={styles.adventureCard} key={adventure.slug}>
                <div className={styles.cardTopline}>
                  <span className={styles.status}>{adventure.status}</span>
                  {adventure.disciplines.map((discipline) => <span className={styles.badge} key={discipline}>{discipline}</span>)}
                </div>
                <h3>{adventure.title}</h3>
                <p>{adventure.premise}</p>
                <div className={styles.conceptCloud}>
                  {adventure.concepts.slice(0, 4).map((concept) => <span className={styles.pill} key={concept}>{concept}</span>)}
                </div>
                <Link className={styles.cardLink} href={`/worldmakers/adventures/${adventure.slug}`}>
                  Entrar a la aventura <ArrowRight size={16} />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={`${styles.shell} ${styles.split}`}>
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>FREE WORLD + ADVENTURES</p>
            <h2>Aprender no convierte el juego en una ruta obligatoria.</h2>
            <p className={styles.sectionLead}>El mundo libre y las aventuras son dos formas legítimas de jugar. Construir, destruir, decorar, explorar, experimentar y contar historias no requieren completar una misión escolar.</p>
          </div>
          <div className={styles.callout}>
            <Sparkles size={32} />
            <h3>Curiosidad antes que cumplimiento.</h3>
            <p>Las aventuras ofrecen problemas fantásticos para quien quiera encontrarlos. El sandbox conserva espacio para juego autónomo, creatividad y descubrimiento sin una secuencia académica obligatoria.</p>
          </div>
        </div>
      </section>
      <PortalFooter />
    </main>
  );
}
