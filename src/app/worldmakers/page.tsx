import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Atom,
  BookOpen,
  Check,
  Compass,
  FlaskConical,
  Leaf,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Sprout,
  Users,
  Wrench,
} from 'lucide-react';
import styles from './worldmakers.module.css';

const learningStreams = [
  'Matemáticas',
  'Geometría',
  'Inglés',
  'Español',
  'Literatura',
  'Biología',
  'Química',
  'Física',
  'Ecología',
  'Ética',
  'Filosofía',
];

const makers = [
  {
    name: 'Explorador curioso',
    note: 'Pregunta, observa y se atreve a descubrir lo desconocido.',
    accent: 'Naranja + azul',
    icon: Compass,
  },
  {
    name: 'Inventora científica',
    note: 'Analiza, experimenta y convierte ideas en soluciones.',
    accent: 'Cian + tecnología',
    icon: FlaskConical,
  },
  {
    name: 'Guardián de la naturaleza',
    note: 'Comprende ecosistemas y aprende a restaurar lo que está vivo.',
    accent: 'Verde + tierra',
    icon: Leaf,
  },
  {
    name: 'Luna · exploradora del conocimiento',
    note: 'Conecta preguntas, personas y posibilidades para aprender mejor.',
    accent: 'Violeta + aventura',
    icon: BookOpen,
  },
];

const gamePillars = [
  {
    title: 'Explora',
    copy: 'Recorre ecosistemas, observa patrones y encuentra preguntas antes que respuestas.',
    icon: Compass,
  },
  {
    title: 'Experimenta',
    copy: 'La ciencia ocurre dentro del mundo: mide, combina, prueba, interpreta y vuelve a intentar.',
    icon: FlaskConical,
  },
  {
    title: 'Crea',
    copy: 'Construye estructuras, herramientas y soluciones sin convertir el mundo en una cuadrícula de bloques.',
    icon: Wrench,
  },
  {
    title: 'Cuida',
    copy: 'Tus decisiones pueden recuperar agua, plantas, hábitats y sistemas completos.',
    icon: Leaf,
  },
];

const safetyPrinciples = [
  {
    title: 'Aprendizaje estructural',
    copy: 'Las misiones progresan cuando observas, construyes, experimentas, interpretas o argumentas; no por completar una hoja disfrazada de juego.',
    icon: BookOpen,
  },
  {
    title: 'Seguridad infantil por diseño',
    copy: 'El producto se diseña sin publicidad de terceros, compra directa infantil, moneda premium comprable o recompensas pagas aleatorias.',
    icon: ShieldCheck,
  },
  {
    title: 'Creatividad con libertad',
    copy: 'El mundo libre y las aventuras son experiencias válidas por sí mismas: aprender no exige seguir una sola ruta.',
    icon: Sparkles,
  },
];

export default function WorldMakersPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: 'World Makers',
    url: 'https://worldmakers.ctgone.com',
    description:
      'Sandbox 3D educativo de mundo abierto donde explorar, construir, experimentar y cuidar forman parte del aprendizaje.',
    genre: ['Educational', 'Sandbox', 'Adventure', 'Open world'],
    inLanguage: ['es', 'en'],
    isFamilyFriendly: true,
    publisher: {
      '@type': 'Organization',
      name: 'CTG One Technology',
      url: 'https://ctgone.com',
    },
  };

  return (
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="#inicio" className={styles.brand} aria-label="World Makers - Inicio">
            <Image
              src="/images/worldmakers/logo.webp"
              alt="World Makers"
              width={180}
              height={90}
              className={styles.brandLogo}
              priority
            />
          </Link>

          <nav className={styles.nav} aria-label="Navegación principal de World Makers">
            <Link href="#universo">Universo</Link>
            <Link href="#aprendizaje">Aprendizaje</Link>
            <Link href="#personajes">Personajes</Link>
            <Link href="#principios">Principios</Link>
          </nav>

          <a className={styles.ctgLink} href="https://ctgone.com" target="_blank" rel="noreferrer">
            CTG One
            <ArrowRight size={15} aria-hidden="true" />
          </a>
        </div>
      </header>

      <section id="inicio" className={styles.hero} aria-labelledby="hero-title">
        <Image
          src="/images/worldmakers/hero-first-person.webp"
          alt="Visualización conceptual de World Makers en primera persona frente a un centro de investigación integrado con la naturaleza"
          fill
          priority
          sizes="100vw"
          className={styles.heroImage}
        />
        <div className={styles.heroVeil} />
        <div className={styles.heroGrid} aria-hidden="true" />

        <div className={styles.heroContent}>
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}>
              <span className={styles.statusDot} />
              En desarrollo activo
            </div>
            <h1 id="hero-title">Imagina. Crea. Aprende. Transforma.</h1>
            <p className={styles.heroLead}>
              Un sandbox 3D de mundo abierto donde construir, explorar y experimentar no son premios
              después de aprender: <strong>son la forma de aprender.</strong>
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryButton} href="#universo">
                Explora el universo
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <a
                className={styles.secondaryButton}
                href="https://github.com/VladPhil92/World-Makers-Game"
                target="_blank"
                rel="noreferrer"
              >
                Ver el desarrollo
              </a>
            </div>
            <div className={styles.heroMeta}>
              <span>3D open world</span>
              <span>Exploración + ciencia + creación</span>
              <span>Tablet-first</span>
            </div>
          </div>

          <div className={styles.heroQuote}>
            <span>Visualización conceptual</span>
            <p>“La curiosidad de hoy puede cambiar el mañana.”</p>
          </div>
        </div>
      </section>

      <section id="universo" className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.kicker}>UN MUNDO DE POSIBILIDADES</p>
            <h2>El juego no te dice qué pensar. Te da un mundo para descubrirlo.</h2>
          </div>
          <p className={styles.sectionIntro}>
            World Makers combina naturaleza, ciencia, construcción y aventura en un universo optimista
            donde cada sistema está diseñado para provocar curiosidad, experimentación y pensamiento.
          </p>
        </div>

        <div className={styles.pillarGrid}>
          {gamePillars.map(({ title, copy, icon: Icon }, index) => (
            <article className={styles.pillarCard} key={title}>
              <div className={styles.pillarIndex}>0{index + 1}</div>
              <div className={styles.iconBubble}>
                <Icon size={24} strokeWidth={2} aria-hidden="true" />
              </div>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="aprendizaje" className={`${styles.section} ${styles.learningSection}`}>
        <div className={styles.learningVisual} aria-label="Concepto de interfaz de misión científica">
          <div className={styles.learningConsole}>
            <div className={styles.consoleTopline}>
              <span className={styles.consoleBadge}><Leaf size={15} /> River Renewal Project</span>
              <span>28 m</span>
            </div>

            <div className={styles.scannerStage}>
              <div className={styles.scannerOrbit}>
                <ScanLine size={48} aria-hidden="true" />
              </div>
              <div>
                <span>FIELD SCANNER</span>
                <strong>Analiza el agua</strong>
                <p>Observa, registra y compara evidencia antes de intervenir el ecosistema.</p>
              </div>
            </div>

            <div className={styles.missionChecklist}>
              <div><Check size={16} /><span>Medir calidad del agua</span></div>
              <div><span className={styles.emptyCheck} /><span>Identificar 3 especies vegetales</span></div>
              <div><span className={styles.emptyCheck} /><span>Buscar señales de vida animal</span></div>
            </div>

            <div className={styles.consoleFooter}>
              <span>Explora</span>
              <span>Aprende</span>
              <span>Crea</span>
              <span>Cuida</span>
            </div>
          </div>
        </div>

        <div className={styles.learningCopy}>
          <p className={styles.kicker}>APRENDER JUGANDO, DE VERDAD</p>
          <h2>El mundo es el laboratorio. La misión es el problema. Tú construyes la respuesta.</h2>
          <p>
            Las experiencias de aprendizaje se integran dentro de las reglas del juego. Una misión puede
            pedirte observar un ecosistema, medir una estructura, modelar un sistema, interpretar un texto,
            comunicar una idea o revisar un argumento después de nueva evidencia.
          </p>

          <div className={styles.learningCallout}>
            <Atom size={28} aria-hidden="true" />
            <div>
              <strong>Alto techo conceptual, baja fricción de interacción.</strong>
              <span>Ideas complejas pueden aparecer primero como experiencia y después como notación.</span>
            </div>
          </div>

          <div className={styles.subjects} aria-label="Áreas de aprendizaje previstas">
            {learningStreams.map((stream) => (
              <span key={stream}>{stream}</span>
            ))}
          </div>
        </div>
      </section>

      <section id="personajes" className={`${styles.section} ${styles.charactersSection}`}>
        <div className={styles.centerHeading}>
          <p className={styles.kicker}>CONOCE A LOS MAKERS</p>
          <h2>Personajes que representan formas distintas de mirar el mundo.</h2>
          <p>
            Los arquetipos comparten una misma filosofía: curiosidad, colaboración, creatividad,
            ciencia y cuidado de la vida. La identidad final se construirá sobre un sistema de personalización diverso y expresivo.
          </p>
        </div>

        <div className={styles.characterGrid}>
          {makers.map((maker) => {
            const Icon = maker.icon;
            return (
              <article className={styles.characterCard} key={maker.name}>
                <div className={styles.characterVisual} aria-hidden="true">
                  <div className={styles.characterHalo} />
                  <div className={styles.characterAvatar}><Icon size={54} strokeWidth={1.65} /></div>
                  <div className={styles.characterPatch}>WM</div>
                </div>
                <div className={styles.characterBody}>
                  <span>{maker.accent}</span>
                  <h3>{maker.name}</h3>
                  <p>{maker.note}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className={`${styles.section} ${styles.worldStatement}`}>
        <div className={styles.statementCard}>
          <div className={styles.statementIcon}>
            <Sprout size={30} aria-hidden="true" />
          </div>
          <p className={styles.kicker}>UNA IDENTIDAD PROPIA</p>
          <h2>Orgánico. Modular. Vivo.</h2>
          <p>
            World Makers evita una estética definida por cubos, cuadrículas voxel o texturas pixeladas.
            Sus mundos se construyen con arcos, puentes, cúpulas, terrazas, roca estilizada, vegetación,
            agua y tecnología amable. La construcción es modular, pero el resultado debe sentirse diseñado,
            natural y reconociblemente World Makers.
          </p>
          <div className={styles.statementTags}>
            <span><Leaf size={16} /> Naturaleza</span>
            <span><Atom size={16} /> Ciencia</span>
            <span><Wrench size={16} /> Creación</span>
            <span><BookOpen size={16} /> Aprendizaje</span>
            <span><Users size={16} /> Comunidad</span>
          </div>
        </div>
      </section>

      <section id="principios" className={`${styles.section} ${styles.principlesSection}`}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.kicker}>MÁS QUE UN JUEGO</p>
            <h2>Diseñado para despertar curiosidad sin sacrificar libertad.</h2>
          </div>
          <p className={styles.sectionIntro}>
            La experiencia se construye desde tres principios que afectan tanto el gameplay como la tecnología del producto.
          </p>
        </div>

        <div className={styles.principleGrid}>
          {safetyPrinciples.map(({ title, copy, icon: Icon }) => (
            <article className={styles.principleCard} key={title}>
              <Icon size={28} aria-hidden="true" />
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.ctaSection}>
        <div className={styles.ctaOrbOne} aria-hidden="true" />
        <div className={styles.ctaOrbTwo} aria-hidden="true" />
        <div className={styles.ctaContent}>
          <p className={styles.kicker}>WORLD MAKERS · EN DESARROLLO</p>
          <h2>Mentes curiosas. Mundos mejores.</h2>
          <p>
            Estamos construyendo un universo donde una pregunta pueda convertirse en aventura, experimento,
            edificio, descubrimiento o una nueva forma de entender el mundo.
          </p>
          <div className={styles.ctaActions}>
            <a
              className={styles.primaryButton}
              href="mailto:direccion@ctgone.com?subject=World%20Makers"
            >
              Contactar al equipo
              <ArrowRight size={18} aria-hidden="true" />
            </a>
            <a
              className={styles.secondaryLightButton}
              href="https://github.com/VladPhil92/World-Makers-Game"
              target="_blank"
              rel="noreferrer"
            >
              Seguir el desarrollo
            </a>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div>
            <Image
              src="/images/worldmakers/logo.webp"
              alt="World Makers"
              width={150}
              height={75}
              className={styles.footerLogo}
            />
            <p>Un proyecto de CTG One Technology.</p>
          </div>
          <div className={styles.footerLinks}>
            <a href="https://ctgone.com" target="_blank" rel="noreferrer">CTG One</a>
            <a href="https://github.com/VladPhil92/World-Makers-Game" target="_blank" rel="noreferrer">GitHub</a>
            <a href="mailto:direccion@ctgone.com?subject=World%20Makers">Contacto</a>
          </div>
          <p className={styles.footerNote}>
            Las imágenes mostradas son visualizaciones conceptuales y referencias de dirección artística; no representan necesariamente el estado final del juego.
          </p>
        </div>
      </footer>
    </main>
  );
}
