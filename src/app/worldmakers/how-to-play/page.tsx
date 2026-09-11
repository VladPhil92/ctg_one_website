import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen, Compass, FlaskConical, Hammer, Leaf, RotateCcw, Sparkles } from 'lucide-react';
import { PortalFooter, PortalNav } from '../PortalChrome';
import styles from '../portal.module.css';

export const metadata: Metadata = {
  title: 'Cómo se juega | World Makers',
  description: 'Discover the core World Makers loop: explore, observe, build, experiment, interpret consequences and revise your ideas.',
  alternates: { canonical: 'https://worldmakers.ctgone.com/how-to-play' },
};

const loop = [
  { title: 'Explora', copy: 'Recorre el mundo, encuentra sistemas, lugares y problemas sin que todo llegue marcado como una tarea.', icon: Compass },
  { title: 'Observa', copy: 'Mide, clasifica, compara y recoge señales antes de decidir qué hacer.', icon: BookOpen },
  { title: 'Construye', copy: 'Usa piezas, estructuras y herramientas como medios para transformar el mundo y poner una idea a prueba.', icon: Hammer },
  { title: 'Experimenta', copy: 'Predice, prueba, mide el resultado y descubre si tu modelo del problema era suficiente.', icon: FlaskConical },
  { title: 'Mira las consecuencias', copy: 'Los sistemas reaccionan. El agua, las plantas, las estructuras, las máquinas o una conversación pueden cambiar por lo que hiciste.', icon: Leaf },
  { title: 'Revisa', copy: 'Una solución no es final solo porque funcionó una vez. Cambia tu diseño o tu argumento cuando aparece nueva evidencia.', icon: RotateCcw },
];

export default function HowToPlayPage() {
  return (
    <main className={styles.portal}>
      <PortalNav />
      <section className={styles.hero}>
        <div className={`${styles.shell} ${styles.heroGrid}`}>
          <div>
            <p className={styles.kicker}>HOW TO PLAY</p>
            <h1>Juegas pensando. Piensas jugando.</h1>
            <p className={styles.heroLead}>World Makers parte de una regla simple: la interacción debe seguir siendo clara aunque la idea detrás del problema sea profunda. El juego reduce fricción, no el techo conceptual.</p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryButton} href="/worldmakers/adventures">Explorar aventuras <ArrowRight size={17} /></Link>
              <Link className={styles.secondaryButton} href="/worldmakers/families">Ver enfoque para familias</Link>
            </div>
          </div>
          <aside className={styles.heroCard}>
            <div className={styles.heroCardIcon}><Sparkles size={30} /></div>
            <div>
              <p className={styles.kicker} style={{ color: '#9fe7ff' }}>CORE PRODUCT THESIS</p>
              <h2>High conceptual ceiling. Low interaction friction.</h2>
              <p>Un niño puede experimentar proporciones, impulso, ecosistemas, metáforas o problemas de identidad antes de dominar el vocabulario formal que los describe.</p>
            </div>
          </aside>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.shell}>
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>THE CORE LOOP</p>
            <h2>Un ciclo de curiosidad, acción y revisión.</h2>
            <p className={styles.sectionLead}>La progresión importante no es “pregunta correcta → premio”. Es construir una relación entre lo que observas, lo que crees que ocurrirá y lo que el mundo realmente hace.</p>
          </div>
          <div className={styles.cardGrid}>
            {loop.map(({ title, copy, icon: Icon }, index) => (
              <article className={styles.card} key={title}>
                <div className={styles.cardIcon}><Icon size={22} /></div>
                <span className={styles.badge} style={{ marginTop: 18 }}>0{index + 1}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={`${styles.shell} ${styles.split}`}>
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>TWO VALID WAYS TO PLAY</p>
            <h2>Free World y Adventures.</h2>
            <p className={styles.sectionLead}>El sandbox abierto no es una sala de espera para las misiones. Crear, destruir, decorar, explorar y contar historias son experiencias completas por sí mismas.</p>
          </div>
          <div className={styles.steps}>
            <div className={styles.step}><span className={styles.stepNumber}>F</span><div><h3>Free World</h3><p>Construcción, exploración, decoración, experimentación y storytelling sin una ruta académica obligatoria.</p></div></div>
            <div className={styles.step}><span className={styles.stepNumber}>A</span><div><h3>Adventures</h3><p>Problemas narrativos donde avanzar requiere usar ideas reales dentro del mundo: construir, modelar, interpretar, comunicar, decidir o revisar.</p></div></div>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={`${styles.shell} ${styles.split}`}>
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>EXPERIENCE → CONCEPT → FORMALIZATION</p>
            <h2>Primero ocurre. Luego se nombra. Después puede formalizarse.</h2>
          </div>
          <div className={styles.steps}>
            <div className={styles.step}><span className={styles.stepNumber}>A</span><div><h3>Experiencia</h3><p>Manipulas el fenómeno directamente: equilibras, mezclas, sigues energía, reconstruyes una historia o tomas una decisión.</p></div></div>
            <div className={styles.step}><span className={styles.stepNumber}>B</span><div><h3>Concepto</h3><p>El juego nombra el patrón que ya experimentaste: simetría, momentum, ecosistema, metáfora, oxidación, identidad o inferencia.</p></div></div>
            <div className={styles.step}><span className={styles.stepNumber}>C</span><div><h3>Formalización</h3><p>Cuando corresponde, aparecen ecuaciones, diagramas, notación, vocabulario técnico o estructuras explícitas de razonamiento.</p></div></div>
          </div>
        </div>
      </section>
      <PortalFooter />
    </main>
  );
}
