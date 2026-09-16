import Link from 'next/link';
import {
  ArrowRight,
  Atom,
  BookOpen,
  Compass,
  FlaskConical,
  Gamepad2,
  Leaf,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
  Zap,
} from 'lucide-react';
import styles from './worldmakers-home.module.css';
import visualStyles from './worldmakers-visual-story-v3.module.css';
import { worldMakersVisuals } from './visual-assets';

const pillars = [
  {
    title: 'Explora',
    copy: 'Recorre ecosistemas, encuentra pistas y descubre historias que nacen del propio mundo.',
    icon: Compass,
  },
  {
    title: 'Experimenta',
    copy: 'Observa, mide, combina y prueba. La ciencia se convierte en una herramienta para avanzar.',
    icon: FlaskConical,
  },
  {
    title: 'Construye',
    copy: 'Diseña estructuras, conecta sistemas y crea soluciones que transforman tu entorno.',
    icon: Wrench,
  },
  {
    title: 'Transforma',
    copy: 'Tus decisiones dejan huella: recupera hábitats, resuelve problemas y cambia el mundo que habitas.',
    icon: Leaf,
  },
];

const worlds = [
  {
    slug: 'vault-infinite-staircase',
    name: 'The Vault of the Infinite Staircase',
    theme: 'Patrones, proporciones y secretos imposibles',
  },
  {
    slug: 'architects-impossible-city',
    name: 'Architects of the Impossible City',
    theme: 'Geometría, diseño y estructuras extraordinarias',
  },
  {
    slug: 'alchemists-archipelago',
    name: "The Alchemist's Archipelago",
    theme: 'Materia, mezclas y experimentos entre islas',
  },
  {
    slug: 'moonforge',
    name: 'The Moonforge',
    theme: 'Fuerzas, energía y máquinas bajo otro cielo',
  },
  {
    slug: 'forest-thousand-voices',
    name: 'The Forest of a Thousand Voices',
    theme: 'Ecosistemas, biodiversidad y un bosque que recuerda',
  },
];

const makers = [
  {
    role: 'Explorador',
    name: 'El curioso',
    copy: 'Observa, pregunta y encuentra rutas que otros todavía no han visto.',
  },
  {
    role: 'Inventora',
    name: 'La científica',
    copy: 'Convierte preguntas en experimentos y experimentos en nuevas posibilidades.',
  },
  {
    role: 'Guardián',
    name: 'El naturalista',
    copy: 'Lee el paisaje, comprende los ecosistemas y protege lo que mantiene vivo al mundo.',
  },
  {
    role: 'Exploradora',
    name: 'Luna',
    copy: 'Conecta ideas, personas y caminos para descubrir qué existe más allá del horizonte.',
  },
];

const trustCards = [
  {
    title: 'Juego antes que lección',
    copy: 'El aprendizaje está dentro de las decisiones, retos y sistemas del mundo; no en cuestionarios disfrazados de juego.',
    icon: Gamepad2,
  },
  {
    title: 'Seguridad por diseño',
    copy: 'World Makers se concibe sin publicidad de terceros, recompensas pagas aleatorias ni compra directa infantil.',
    icon: ShieldCheck,
  },
  {
    title: 'Curiosidad sin una única ruta',
    copy: 'Explorar libremente y resolver una aventura son formas igualmente válidas de habitar el universo.',
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
      'Sandbox 3D de mundo abierto donde explorar, construir, experimentar y transformar el entorno forman parte de una misma aventura.',
    genre: ['Sandbox', 'Adventure', 'Educational', 'Open world'],
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="#inicio" className={styles.brand} aria-label="World Makers - Inicio">
            <img
              src={worldMakersVisuals.logo.src}
              alt="World Makers"
              width={worldMakersVisuals.logo.width}
              height={worldMakersVisuals.logo.height}
              className={styles.brandMark}
              decoding="async"
            />
            <span className={styles.brandText}>World Makers</span>
          </Link>

          <nav className={styles.nav} aria-label="Navegación de World Makers">
            <Link href="#experiencia">Experiencia</Link>
            <Link href="#universo">Universo</Link>
            <Link href="#mundos">Mundos</Link>
            <Link href="#makers">Makers</Link>
          </nav>

          <Link href="/worldmakers/community" className={styles.headerCta}>
            <Users size={16} aria-hidden="true" />
            <span>Únete a la comunidad</span>
          </Link>
        </div>
      </header>

      <section id="inicio" className={styles.hero} aria-labelledby="world-makers-title">
        <img
          src={worldMakersVisuals.hero.src}
          alt={worldMakersVisuals.hero.alt}
          width={worldMakersVisuals.hero.width}
          height={worldMakersVisuals.hero.height}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className={styles.heroImage}
        />
        <div className={styles.heroVeil} aria-hidden="true" />
        <div className={styles.heroGlow} aria-hidden="true" />

        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.overline}>Imagina · Crea · Aprende · Transforma</p>
            <h1 id="world-makers-title">Construye el mundo que quieres descubrir.</h1>
            <p className={styles.heroLead}>
              Un sandbox 3D de mundo abierto donde <strong>explorar, experimentar y crear</strong> son parte de la aventura.
              Cada pregunta puede convertirse en un lugar, una misión o una nueva forma de cambiar el entorno.
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryButton} href="#universo">
                Descubre World Makers <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link className={styles.secondaryButton} href="/worldmakers/adventures">
                Explora las aventuras
              </Link>
            </div>
          </div>

          <aside className={styles.heroAside}>
            <div className={styles.heroAsideLabel}>
              <Zap size={16} aria-hidden="true" /> Un universo para la curiosidad
            </div>
            <p>
              Ciencia, naturaleza, construcción y exploración se conectan en mundos diseñados para probar ideas haciendo.
            </p>
            <div className={styles.heroMeta}>
              <span>Sandbox 3D</span>
              <span>Mundo abierto</span>
              <span>Aventura + creación</span>
            </div>
          </aside>
        </div>

        <span className={styles.scrollCue}>Explora el universo</span>
      </section>

      <section id="experiencia" className={`${styles.section} ${styles.pillars}`}>
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.kicker}>Juega con posibilidades</p>
            <h2>Un mundo no se memoriza. Se explora.</h2>
          </div>
          <p className={styles.sectionIntro}>
            Descubres algo, pruebas una idea, construyes una respuesta y ves cómo el mundo cambia. Ese es el loop central de World Makers.
          </p>
        </div>

        <div className={styles.pillarGrid}>
          {pillars.map(({ title, copy, icon: Icon }) => (
            <article className={styles.pillarCard} key={title}>
              <div className={styles.pillarIcon}>
                <Icon size={23} aria-hidden="true" />
              </div>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="universo" className={visualStyles.visualStory} aria-labelledby="visual-story-title">
        <div className={visualStyles.storyIntro}>
          <div>
            <p className={visualStyles.storyKicker}>El mundo responde</p>
            <h2 id="visual-story-title">No sólo recorres el mundo. Dejas huella en él.</h2>
          </div>
          <p>
            World Makers une exploración, ciencia y construcción en una sola experiencia visual. Las decisiones del jugador tienen consecuencias visibles.
          </p>
        </div>

        <article className={visualStyles.transformation}>
          <img
            src={worldMakersVisuals.beforeAfter.src}
            alt={worldMakersVisuals.beforeAfter.alt}
            width={worldMakersVisuals.beforeAfter.width}
            height={worldMakersVisuals.beforeAfter.height}
            loading="lazy"
            decoding="async"
            className={visualStyles.transformationImage}
          />
          <div className={visualStyles.transformationCopy}>
            <span className={visualStyles.storyLabel}>Transformación del mundo</span>
            <h3>Tus decisiones cambian lo que existe después.</h3>
            <p>
              Recupera un ecosistema, resuelve un problema o altera el equilibrio de un lugar. El antes y el después forman parte del juego.
            </p>
          </div>
        </article>

        <div className={visualStyles.storyDuo}>
          <article className={visualStyles.storyPanel}>
            <div className={visualStyles.panelVisual}>
              <img
                src={worldMakersVisuals.experiment.src}
                alt={worldMakersVisuals.experiment.alt}
                width={worldMakersVisuals.experiment.width}
                height={worldMakersVisuals.experiment.height}
                loading="lazy"
                decoding="async"
              />
              <span className={visualStyles.panelIndex}>01 · Experimenta</span>
            </div>
            <div className={visualStyles.panelBody}>
              <span className={visualStyles.storyLabel}>Ciencia aplicada</span>
              <h3>La pregunta se convierte en mecánica.</h3>
              <p>
                Formula hipótesis, observa variables y usa resultados para tomar decisiones dentro de la aventura. El conocimiento aparece porque lo necesitas para avanzar.
              </p>
            </div>
          </article>

          <article className={visualStyles.storyPanel}>
            <div className={visualStyles.panelVisual}>
              <img
                src={worldMakersVisuals.ecologicalConstruction.src}
                alt={worldMakersVisuals.ecologicalConstruction.alt}
                width={worldMakersVisuals.ecologicalConstruction.width}
                height={worldMakersVisuals.ecologicalConstruction.height}
                loading="lazy"
                decoding="async"
              />
              <span className={visualStyles.panelIndex}>02 · Construye</span>
            </div>
            <div className={visualStyles.panelBody}>
              <span className={visualStyles.storyLabel}>Construcción ecológica</span>
              <h3>Construir es diseñar consecuencias.</h3>
              <p>
                Materiales, energía, agua y naturaleza son sistemas conectados. Una buena solución debe funcionar dentro del mundo, no sólo verse bien.
              </p>
            </div>
          </article>
        </div>

        <div className={visualStyles.storyPrinciple}>
          <div className={visualStyles.principleMark}>WM</div>
          <div>
            <strong>Una sola experiencia, no tres minijuegos separados.</strong>
            <span>Explorar revela el problema. Experimentar produce evidencia. Construir transforma el entorno.</span>
          </div>
          <span className={visualStyles.principleMeta}>Explora → prueba → transforma</span>
        </div>
      </section>

      <section id="mundos" className={styles.darkSection} aria-labelledby="worlds-title">
        <div className={styles.darkInner}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.kicker}>Mundos por descubrir</p>
              <h2 id="worlds-title">Cada lugar empieza con un misterio.</h2>
            </div>
            <p className={styles.sectionIntro}>
              Cada destino nace de una pregunta distinta y la convierte en una aventura con sus propias reglas, retos y descubrimientos.
            </p>
          </div>

          <div className={styles.worldsLayout}>
            <Link href="/worldmakers/adventures/caribbean-rainforest" className={styles.featureWorld}>
              <img
                src={worldMakersVisuals.gameplayScience.src}
                alt="Caribbean Rainforest en World Makers"
                width={worldMakersVisuals.gameplayScience.width}
                height={worldMakersVisuals.gameplayScience.height}
                loading="lazy"
                decoding="async"
              />
              <div className={styles.featureWorldContent}>
                <span className={styles.worldTag}>Próxima aventura · Caribbean Rainforest</span>
                <h3>Un ecosistema vivo necesita algo más que buenas intenciones.</h3>
                <p>
                  Investiga el agua, observa especies, construye soluciones y descubre cómo una intervención puede alterar todo un sistema.
                </p>
                <span className={styles.inlineLink}>
                  Conocer la aventura <ArrowRight size={17} aria-hidden="true" />
                </span>
              </div>
            </Link>

            <div className={styles.worldList}>
              {worlds.map((world, index) => (
                <Link
                  key={world.slug}
                  href={`/worldmakers/adventures/${world.slug}`}
                  className={styles.worldRow}
                >
                  <span className={styles.worldNumber}>{String(index + 2).padStart(2, '0')}</span>
                  <div>
                    <h3>{world.name}</h3>
                    <p>{world.theme}</p>
                  </div>
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="makers" className={`${styles.section} ${styles.charactersSection}`} aria-labelledby="makers-title">
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.kicker}>Conoce a los Makers</p>
            <h2 id="makers-title">La curiosidad también tiene personalidad.</h2>
          </div>
          <p className={styles.sectionIntro}>
            Cada Maker observa el mundo de una forma distinta y aporta una manera propia de explorar, inventar, cuidar y descubrir.
          </p>
        </div>

        <div className={styles.characterGrid}>
          {worldMakersVisuals.characters.map((character, index) => {
            const maker = makers[index];
            return (
              <article className={styles.characterCard} key={character.key}>
                <img
                  src={character.src}
                  alt={character.alt}
                  width={character.width}
                  height={character.height}
                  loading="lazy"
                  decoding="async"
                />
                <div className={styles.characterCopy}>
                  <span>{maker.role}</span>
                  <h3>{maker.name}</h3>
                  <p>{maker.copy}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section id="aprendizaje" className={styles.learningBand} aria-labelledby="learning-title">
        <div className={styles.learningInner}>
          <div className={styles.learningVisual}>
            <img
              src={worldMakersVisuals.gameplayBuild.src}
              alt={worldMakersVisuals.gameplayBuild.alt}
              width={worldMakersVisuals.gameplayBuild.width}
              height={worldMakersVisuals.gameplayBuild.height}
              loading="lazy"
              decoding="async"
            />
          </div>

          <div className={styles.learningCopy}>
            <p className={styles.kicker}>Aprender jugando, de verdad</p>
            <h2 id="learning-title">Primero lo haces. Después entiendes por qué funciona.</h2>
            <p>
              Las grandes ideas pueden empezar como experiencia: equilibrar una estructura, recuperar un ecosistema, mezclar materiales, reconocer un patrón o defender una decisión.
            </p>

            <div className={styles.learningSteps}>
              <div className={styles.learningStep}>
                <div className={styles.learningStepIcon}><Gamepad2 size={20} aria-hidden="true" /></div>
                <div><strong>Experiencia</strong><span>Manipula el fenómeno dentro del juego.</span></div>
              </div>
              <div className={styles.learningStep}>
                <div className={styles.learningStepIcon}><BookOpen size={20} aria-hidden="true" /></div>
                <div><strong>Descubrimiento</strong><span>Reconoce el patrón y ponle lenguaje a lo que acabas de hacer.</span></div>
              </div>
              <div className={styles.learningStep}>
                <div className={styles.learningStepIcon}><Atom size={20} aria-hidden="true" /></div>
                <div><strong>Profundidad</strong><span>Usa modelos, vocabulario y herramientas más precisas cuando la aventura lo necesita.</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.trustSection}`} aria-labelledby="trust-title">
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.kicker}>Pensado para jugar y crecer</p>
            <h2 id="trust-title">Libertad para descubrir. Criterio para diseñarla.</h2>
          </div>
          <p className={styles.sectionIntro}>
            La experiencia busca ser ambiciosa como videojuego y responsable como producto pensado para familias y contextos educativos.
          </p>
        </div>

        <div className={styles.trustGrid}>
          {trustCards.map(({ title, copy, icon: Icon }) => (
            <article className={styles.trustCard} key={title}>
              <Icon size={27} aria-hidden="true" />
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.community} aria-labelledby="community-title">
        <div className={styles.communityInner}>
          <p className={styles.kicker}>El próximo mundo empieza con personas curiosas</p>
          <h2 id="community-title">Sé parte del universo World Makers.</h2>
          <p>
            Sigue las nuevas aventuras, conoce el enfoque para familias y educadores y acompaña la evolución de un juego construido alrededor de la curiosidad.
          </p>
          <div className={styles.communityActions}>
            <Link href="/worldmakers/community" className={styles.primaryButton}>
              Únete a la comunidad <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link href="/worldmakers/educators" className={styles.lightButton}>
              World Makers para educadores
            </Link>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <img
              src={worldMakersVisuals.logo.src}
              alt="World Makers"
              width={worldMakersVisuals.logo.width}
              height={worldMakersVisuals.logo.height}
              className={styles.footerLogo}
              loading="lazy"
              decoding="async"
            />
            <div>
              <strong>World Makers</strong>
              <span>Un proyecto de CTG One Technology.</span>
            </div>
          </div>

          <div className={styles.footerLinks}>
            <Link href="/worldmakers/adventures">Aventuras</Link>
            <Link href="/worldmakers/families">Familias</Link>
            <Link href="/worldmakers/educators">Educadores</Link>
            <a href="https://ctgone.com" target="_blank" rel="noreferrer">CTG One</a>
          </div>

          <p className={styles.footerNote}>
            Las imágenes representan la dirección visual y conceptos de experiencia de World Makers. El contenido final del videojuego puede evolucionar durante producción.
          </p>
        </div>
      </footer>
    </main>
  );
}
