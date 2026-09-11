import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpenCheck, BrainCircuit, FlaskConical, GraduationCap, Layers3, Network } from 'lucide-react';
import { PortalFooter, PortalNav } from '../PortalChrome';
import styles from '../portal.module.css';

export const metadata: Metadata = {
  title: 'Educadores | World Makers',
  description: 'World Makers for educators: structural learning, multidisciplinary evidence, Experience → Concept → Formalization and non-worksheet adventure design.',
  alternates: { canonical: 'https://worldmakers.ctgone.com/educators' },
};

const educatorCards = [
  { title: 'Aprendizaje estructural', copy: 'Una misión no cuenta como educativa porque muestre contenido escolar. La idea debe ser necesaria para avanzar mediante una acción jugable auténtica.', icon: BookOpenCheck },
  { title: 'Evidencia desde el gameplay', copy: 'Construir, observar, predecir, modelar, interpretar, comunicar, decidir o revisar pueden producir evidencia sin sacar al jugador del mundo.', icon: Network },
  { title: 'Profundidad por capas', copy: 'Experience → Concept → Formalization permite que una idea aparezca primero como fenómeno, luego como concepto y después como representación formal.', icon: Layers3 },
  { title: 'Ciencia determinista', copy: 'La dirección técnica busca que química, física, biología y ecología tengan modelos consistentes suficientes para que experimentar produzca resultados verificables.', icon: FlaskConical },
  { title: 'Pensamiento sin respuesta ideológica oculta', copy: 'Ética y filosofía evalúan calidad de razones, perspectivas, supuestos, contraejemplos y revisión; no la adhesión a una única respuesta predeterminada.', icon: BrainCircuit },
  { title: 'Techo conceptual alto', copy: 'La edad modifica scaffolding, densidad de interfaz, lectura y notación; no define una lista rígida de ideas que el estudiante tiene prohibido encontrar.', icon: GraduationCap },
];

export default function EducatorsPage() {
  return (
    <main className={styles.portal}>
      <PortalNav />
      <section className={styles.hero}>
        <div className={`${styles.shell} ${styles.audienceHero}`}>
          <div>
            <p className={styles.kicker}>WORLD MAKERS FOR EDUCATORS</p>
            <h1>El currículo no se pega encima del juego. Se convierte en reglas del mundo.</h1>
            <p className={styles.heroLead}>La propuesta pedagógica de World Makers consiste en diseñar problemas donde aprender cambie lo que el jugador puede hacer. El objetivo es producir experiencias evaluables sin reducirlas a una hoja de trabajo con una capa gráfica.</p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryButton} href="/worldmakers/adventures">Ver aventuras <ArrowRight size={17} /></Link>
              <Link className={styles.secondaryButton} href="/worldmakers/how-to-play">Ver arquitectura de aprendizaje</Link>
            </div>
          </div>
          <div className={styles.callout}>
            <GraduationCap size={36} />
            <h3>Authentic learning is part of solving the world problem.</h3>
            <p>Si una actividad académica puede retirarse sin cambiar materialmente cómo se juega la misión, esa misión todavía no alcanza el estándar de World Makers.</p>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.shell}>
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>PEDAGOGICAL CONTRACT</p>
            <h2>Seis decisiones que separan una aventura de una ficha digital.</h2>
          </div>
          <div className={styles.cardGrid}>
            {educatorCards.map(({ title, copy, icon: Icon }) => (
              <article className={styles.card} key={title}>
                <div className={styles.cardIcon}><Icon size={22} /></div>
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
            <p className={styles.kicker}>11 FIRST-CLASS LEARNING STREAMS</p>
            <h2>Multidisciplinario desde la arquitectura.</h2>
            <p className={styles.sectionLead}>Matemáticas, Geometría, Inglés, Español, Literatura, Biología, Química, Física, Ecología, Ética y Filosofía para niños son streams de primera clase. Historia y cultura operan como capas transversales de contexto.</p>
          </div>
          <div className={styles.steps}>
            <div className={styles.step}><span className={styles.stepNumber}>1</span><div><h3>Primitive</h3><p>La misión define una acción reusable: construct-to-constraint, predict-test-revise, model-system, communicate-in-language, interpret-text-world, reason-through-dilemma o argue-and-revise.</p></div></div>
            <div className={styles.step}><span className={styles.stepNumber}>2</span><div><h3>Evidence event</h3><p>El runtime del dominio determina si la acción científica, lingüística, narrativa o argumentativa fue válida.</p></div></div>
            <div className={styles.step}><span className={styles.stepNumber}>3</span><div><h3>Learning objective</h3><p>Mission Runtime atribuye esa evidencia al objetivo correspondiente sin crear un evaluador hard-coded diferente para cada materia.</p></div></div>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={`${styles.shell} ${styles.audienceHero}`}>
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>EDUCATOR COLLABORATION</p>
            <h2>La comunidad educativa ya puede registrar interés estructurado.</h2>
            <p className={styles.sectionLead}>Docentes e instituciones pueden registrar su área de interés para revisión pedagógica, pruebas futuras y pilotos. El sistema distingue registro, revisión y eventual preparación de invitación; no presenta una beta como disponible antes de que exista evidencia técnica para hacerlo.</p>
          </div>
          <div className={styles.callout}>
            <h3>Docentes e instituciones</h3>
            <p>Registra un correo adulto o institucional y selecciona si te interesa seguimiento de producto, playtesting, piloto educativo o investigación con familias.</p>
            <Link className={styles.primaryButton} style={{ marginTop: 20, background: 'white', color: '#123b7a' }} href="/worldmakers/community?audience=educator">Registrar interés <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>
      <PortalFooter />
    </main>
  );
}
