import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Atom,
  BookOpen,
  Check,
  Compass,
  FlaskConical,
  Gamepad2,
  GitBranch,
  GraduationCap,
  Leaf,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Sprout,
  Users,
  Wrench,
} from 'lucide-react';
import styles from './worldmakers.module.css';
import extra from './worldmakers-extra.module.css';
import phase2 from './worldmakers-phase2.module.css';
import WorldExplorer from './WorldExplorer';

const learningStreams = [
  'Matemáticas', 'Geometría', 'Inglés', 'Español', 'Literatura', 'Biología',
  'Química', 'Física', 'Ecología', 'Ética', 'Filosofía',
];

const makers = [
  { name: 'Explorador curioso', note: 'Pregunta, observa y se atreve a descubrir lo desconocido.', accent: 'Naranja + azul', icon: Compass },
  { name: 'Inventora científica', note: 'Analiza, experimenta y convierte ideas en soluciones.', accent: 'Cian + tecnología', icon: FlaskConical },
  { name: 'Guardián de la naturaleza', note: 'Comprende ecosistemas y aprende a restaurar lo que está vivo.', accent: 'Verde + tierra', icon: Leaf },
  { name: 'Luna · exploradora del conocimiento', note: 'Conecta preguntas, personas y posibilidades para aprender mejor.', accent: 'Violeta + aventura', icon: BookOpen },
];

const gamePillars = [
  { title: 'Explora', copy: 'Recorre ecosistemas, observa patrones y encuentra preguntas antes que respuestas.', icon: Compass },
  { title: 'Experimenta', copy: 'La ciencia ocurre dentro del mundo: mide, combina, prueba, interpreta y vuelve a intentar.', icon: FlaskConical },
  { title: 'Crea', copy: 'Construye estructuras, herramientas y soluciones sin convertir el mundo en una cuadrícula de bloques.', icon: Wrench },
  { title: 'Cuida', copy: 'Tus decisiones pueden recuperar agua, plantas, hábitats y sistemas completos.', icon: Leaf },
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

const depthLayers = [
  {
    number: 'A',
    title: 'Experiencia',
    copy: 'Primero manipulas el fenómeno: equilibras, mezclas, construyes, observas, comparas, exploras o decides.',
    example: 'La idea aparece como algo que haces.',
  },
  {
    number: 'B',
    title: 'Concepto',
    copy: 'Después el mundo nombra el patrón que ya experimentaste: simetría, impulso, ecosistema, metáfora, identidad o proporción.',
    example: 'La experiencia adquiere lenguaje.',
  },
  {
    number: 'C',
    title: 'Formalización',
    copy: 'Cuando corresponde, aparecen ecuaciones, diagramas, vocabulario técnico, notación o estructuras explícitas de razonamiento.',
    example: 'La abstracción extiende el juego; no lo bloquea.',
  },
];

const developmentTracks = [
  {
    code: 'M3',
    title: 'Caribbean Rainforest vertical slice',
    badge: 'Source complete',
    badgeClass: phase2.statusBadgeDone,
    copy: 'Exploración, observación, ecosistema reactivo, construcción ecológica, UX infantil y perfiles de rendimiento están implementados a nivel fuente; la certificación nativa y de dispositivo sigue separada.',
  },
  {
    code: 'M5',
    title: 'Fantastic Learning Universe',
    badge: 'M5.5 next',
    badgeClass: phase2.statusBadgeNext,
    copy: 'Currículo, Mission Runtime composable, Science Simulation Core y Language/Literature/Thought Runtime están source-complete. El siguiente frente es el primer Adventure Pack jugable.',
  },
  {
    code: 'M6',
    title: 'Private multiplayer',
    badge: 'Planned',
    badgeClass: phase2.statusBadgePlanned,
    copy: 'La dirección prevista es multijugador cerrado con relaciones e invitaciones aprobadas por padres, sin descubrimiento público de desconocidos ni chat abierto con extraños.',
  },
];

export default function WorldMakersPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: 'World Makers',
    url: 'https://worldmakers.ctgone.com',
    description: 'Sandbox 3D educativo de mundo abierto donde explorar, construir, experimentar y cuidar forman parte del aprendizaje.',
    genre: ['Educational', 'Sandbox', 'Adventure', 'Open world'],
    inLanguage: ['es', 'en'],
    isFamilyFriendly: true,
    publisher: { '@type': 'Organization', name: 'CTG One Technology', url: 'https://ctgone.com' },
  };

  return (
    <main className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="#inicio" className={styles.brand} aria-label="World Makers - Inicio">
            <Image src="/images/worldmakers/logo.webp" alt="World Makers" width={180} height={90} className={styles.brandLogo} priority />
          </Link>
          <nav className={styles.nav} aria-label="Navegación principal de World Makers">
            <Link href="#universo">Universo</Link>
            <Link href="#aventuras">Aventuras</Link>
            <Link href="#aprendizaje">Aprendizaje</Link>
            <Link href="#desarrollo">Desarrollo</Link>
          </nav>
          <a className={styles.ctgLink} href="https://ctgone.com" target="_blank" rel="noreferrer">
            CTG One <ArrowRight size={15} aria-hidden="true" />
          </a>
        </div>
      </header>

      <section id="inicio" className={styles.hero} aria-labelledby="hero-title">
        <Image
          src="/images/worldmakers/hero-first-person.webp"
          alt="Visualización conceptual de World Makers en primera persona frente a un centro de investigación integrado con la naturaleza"
          fill priority sizes="100vw" className={styles.heroImage}
        />
        <div className={styles.heroVeil} />
        <div className={styles.heroGrid} aria-hidden="true" />
        <div className={styles.heroContent}>
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}><span className={styles.statusDot} />En desarrollo activo</div>
            <h1 id="hero-title">Imagina. Crea. Aprende. Transforma.</h1>
            <p className={styles.heroLead}>
              Un sandbox 3D de mundo abierto donde construir, explorar y experimentar no son premios después de aprender: <strong>son la forma de aprender.</strong>
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryButton} href="#aventuras">Explora el universo <ArrowRight size={18} aria-hidden="true" /></Link>
              <a className={styles.secondaryButton} href="https://github.com/VladPhil92/World-Makers-Game" target="_blank" rel="noreferrer">Ver el desarrollo</a>
            </div>
            <div className={styles.heroMeta}>
              <span>3D open world</span><span>Exploración + ciencia + creación</span><span>Tablet-first</span>
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
          <div><p className={styles.kicker}>UN MUNDO DE POSIBILIDADES</p><h2>El juego no te dice qué pensar. Te da un mundo para descubrirlo.</h2></div>
          <p className={styles.sectionIntro}>World Makers combina naturaleza, ciencia, construcción y aventura en un universo optimista donde cada sistema está diseñado para provocar curiosidad, experimentación y pensamiento.</p>
        </div>
        <div className={styles.pillarGrid}>
          {gamePillars.map(({ title, copy, icon: Icon }, index) => (
            <article className={styles.pillarCard} key={title}>
              <div className={styles.pillarIndex}>0{index + 1}</div>
              <div className={styles.iconBubble}><Icon size={24} strokeWidth={2} aria-hidden="true" /></div>
              <h3>{title}</h3><p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="aventuras" className={phase2.atlasSection}>
        <div className={phase2.atlasIntro}>
          <div>
            <p className={styles.kicker}>WORLD ATLAS · FANTASTIC LEARNING UNIVERSE</p>
            <h2>No son niveles escolares. Son lugares que existen porque hay algo interesante que resolver.</h2>
          </div>
          <p>Explora el vertical slice del Caribbean Rainforest y algunos de los mundos candidatos del primer Adventure Pack. Cada región convierte una disciplina en una mecánica de mundo, no en una pantalla de preguntas.</p>
        </div>
        <WorldExplorer />
      </section>

      <section id="aprendizaje" className={`${styles.section} ${styles.learningSection}`}>
        <div className={styles.learningVisual} aria-label="Concepto de interfaz de misión científica">
          <div className={extra.learningConsole}>
            <div className={extra.consoleTopline}>
              <span className={extra.consoleBadge}><Leaf size={15} /> River Renewal Project</span><span>28 m</span>
            </div>
            <div className={extra.scannerStage}>
              <div className={extra.scannerOrbit}><ScanLine size={48} aria-hidden="true" /></div>
              <div><span>FIELD SCANNER</span><strong>Analiza el agua</strong><p>Observa, registra y compara evidencia antes de intervenir el ecosistema.</p></div>
            </div>
            <div className={extra.missionChecklist}>
              <div><Check size={16} /><span>Medir calidad del agua</span></div>
              <div><span className={extra.emptyCheck} /><span>Identificar 3 especies vegetales</span></div>
              <div><span className={extra.emptyCheck} /><span>Buscar señales de vida animal</span></div>
            </div>
            <div className={extra.consoleFooter}><span>Explora</span><span>Aprende</span><span>Crea</span><span>Cuida</span></div>
          </div>
        </div>
        <div className={styles.learningCopy}>
          <p className={styles.kicker}>APRENDER JUGANDO, DE VERDAD</p>
          <h2>El mundo es el laboratorio. La misión es el problema. Tú construyes la respuesta.</h2>
          <p>Las experiencias de aprendizaje se integran dentro de las reglas del juego. Una misión puede pedirte observar un ecosistema, medir una estructura, modelar un sistema, interpretar un texto, comunicar una idea o revisar un argumento después de nueva evidencia.</p>
          <div className={styles.learningCallout}><Atom size={28} aria-hidden="true" /><div><strong>Alto techo conceptual, baja fricción de interacción.</strong><span>Ideas complejas pueden aparecer primero como experiencia y después como notación.</span></div></div>
          <div className={styles.subjects} aria-label="Áreas de aprendizaje previstas">{learningStreams.map((stream) => <span key={stream}>{stream}</span>)}</div>
        </div>
      </section>

      <section className={phase2.depthSection} aria-labelledby="depth-title">
        <div className={phase2.depthIntro}>
          <div>
            <p className={styles.kicker}>EXPERIENCE → CONCEPT → FORMALIZATION</p>
            <h2 id="depth-title">La dificultad conceptual puede crecer sin convertir la interfaz en una barrera.</h2>
          </div>
          <p>World Makers separa la profundidad de una idea de la fricción necesaria para interactuar con ella. Los apoyos cambian según edad y contexto; las grandes ideas no tienen que desaparecer.</p>
        </div>
        <div className={phase2.depthGrid}>
          {depthLayers.map((layer) => (
            <article className={phase2.depthCard} key={layer.number}>
              <div className={phase2.depthNumber}>{layer.number}</div>
              <h3>{layer.title}</h3>
              <p>{layer.copy}</p>
              <strong>{layer.example}</strong>
            </article>
          ))}
        </div>
      </section>

      <section id="personajes" className={`${styles.section} ${styles.charactersSection}`}>
        <div className={styles.centerHeading}>
          <p className={styles.kicker}>CONOCE A LOS MAKERS</p>
          <h2>Personajes que representan formas distintas de mirar el mundo.</h2>
          <p>Los arquetipos comparten una misma filosofía: curiosidad, colaboración, creatividad, ciencia y cuidado de la vida. La identidad final se construirá sobre un sistema de personalización diverso y expresivo.</p>
        </div>
        <div className={styles.characterGrid}>
          {makers.map((maker) => {
            const Icon = maker.icon;
            return (
              <article className={styles.characterCard} key={maker.name}>
                <div className={extra.characterVisual} aria-hidden="true"><div className={extra.characterHalo} /><div className={extra.characterAvatar}><Icon size={54} strokeWidth={1.65} /></div><div className={extra.characterPatch}>WM</div></div>
                <div className={styles.characterBody}><span>{maker.accent}</span><h3>{maker.name}</h3><p>{maker.note}</p></div>
              </article>
            );
          })}
        </div>
      </section>

      <section className={`${styles.section} ${styles.worldStatement}`}>
        <div className={styles.statementCard}>
          <div className={styles.statementIcon}><Sprout size={30} aria-hidden="true" /></div>
          <p className={styles.kicker}>UNA IDENTIDAD PROPIA</p><h2>Orgánico. Modular. Vivo.</h2>
          <p>World Makers evita una estética definida por cubos, cuadrículas voxel o texturas pixeladas. Sus mundos se construyen con arcos, puentes, cúpulas, terrazas, roca estilizada, vegetación, agua y tecnología amable. La construcción es modular, pero el resultado debe sentirse diseñado, natural y reconociblemente World Makers.</p>
          <div className={styles.statementTags}><span><Leaf size={16} /> Naturaleza</span><span><Atom size={16} /> Ciencia</span><span><Wrench size={16} /> Creación</span><span><BookOpen size={16} /> Aprendizaje</span><span><Users size={16} /> Comunidad</span></div>
        </div>
      </section>

      <section id="principios" className={`${styles.section} ${styles.principlesSection}`}>
        <div className={styles.sectionHeader}>
          <div><p className={styles.kicker}>MÁS QUE UN JUEGO</p><h2>Diseñado para despertar curiosidad sin sacrificar libertad.</h2></div>
          <p className={styles.sectionIntro}>La experiencia se construye desde tres principios que afectan tanto el gameplay como la tecnología del producto.</p>
        </div>
        <div className={styles.principleGrid}>
          {safetyPrinciples.map(({ title, copy, icon: Icon }) => <article className={styles.principleCard} key={title}><Icon size={28} aria-hidden="true" /><h3>{title}</h3><p>{copy}</p></article>)}
        </div>
      </section>

      <section id="desarrollo" className={phase2.statusSection}>
        <div className={phase2.statusIntro}>
          <div>
            <p className={styles.kicker}>BUILD IN PUBLIC · CON RIGOR</p>
            <h2>Mostramos progreso sin confundir código fuente con un juego ya certificado.</h2>
          </div>
          <p>World Makers separa explícitamente integridad de fuente, ejecución nativa en Unreal y evidencia de dispositivo. Esta web seguirá la misma disciplina: aspirar alto sin fabricar estados de producción.</p>
        </div>
        <div className={phase2.statusGrid}>
          {developmentTracks.map((track) => (
            <article className={phase2.statusCard} key={track.code}>
              <div className={phase2.statusTopline}>
                <span className={phase2.statusCode}>{track.code}</span>
                <span className={track.badgeClass}>{track.badge}</span>
              </div>
              <h3>{track.title}</h3>
              <p>{track.copy}</p>
            </article>
          ))}
        </div>
        <div className={phase2.truthNote}>
          <GitBranch size={20} aria-hidden="true" />
          <span><strong>Estado público responsable:</strong> un check verde de CI demuestra integridad del repositorio; no sustituye compilación nativa de Unreal, pruebas manuales ni certificación en tablets representativas.</span>
        </div>
      </section>

      <section className={phase2.interestSection} aria-labelledby="interest-title">
        <div className={phase2.interestIntro}>
          <div>
            <p className={styles.kicker}>FORMA PARTE DEL CAMINO</p>
            <h2 id="interest-title">Todavía no hay una beta pública. Sí hay una comunidad que podemos empezar a construir.</h2>
          </div>
          <p>El registro actual es de interés y conversación, no una promesa de acceso inmediato. Queremos escuchar especialmente a familias, educadores y personas interesadas en desarrollo de juegos y aprendizaje.</p>
        </div>
        <div className={phase2.interestCards}>
          <article className={phase2.interestCard}>
            <span><Users size={15} /> Familias</span>
            <h3>Quiero saber cuándo pueda probarse.</h3>
            <p>Recibe el contexto correcto sobre seguridad, privacidad, experiencias de juego y futuras pruebas controladas.</p>
            <a href="mailto:direccion@ctgone.com?subject=World%20Makers%20-%20Familias">Registrar interés <ArrowRight size={16} /></a>
          </article>
          <article className={phase2.interestCard}>
            <span><GraduationCap size={15} /> Educadores</span>
            <h3>Quiero explorar su potencial pedagógico.</h3>
            <p>Conversemos sobre misiones, disciplinas, evidencia de aprendizaje, revisión pedagógica y escenarios escolares futuros.</p>
            <a href="mailto:direccion@ctgone.com?subject=World%20Makers%20-%20Educadores">Hablar con el equipo <ArrowRight size={16} /></a>
          </article>
          <article className={phase2.interestCard}>
            <span><Gamepad2 size={15} /> Comunidad de desarrollo</span>
            <h3>Quiero seguir cómo se construye.</h3>
            <p>El repositorio público muestra arquitectura, contratos de contenido, decisiones de diseño y el estado verificable de cada fase.</p>
            <a href="https://github.com/VladPhil92/World-Makers-Game" target="_blank" rel="noreferrer">Explorar GitHub <ArrowRight size={16} /></a>
          </article>
        </div>
      </section>

      <section className={styles.ctaSection}>
        <div className={styles.ctaOrbOne} aria-hidden="true" /><div className={styles.ctaOrbTwo} aria-hidden="true" />
        <div className={styles.ctaContent}>
          <p className={styles.kicker}>WORLD MAKERS · EN DESARROLLO</p><h2>Mentes curiosas. Mundos mejores.</h2>
          <p>Estamos construyendo un universo donde una pregunta pueda convertirse en aventura, experimento, edificio, descubrimiento o una nueva forma de entender el mundo.</p>
          <div className={styles.ctaActions}>
            <a className={styles.primaryButton} href="mailto:direccion@ctgone.com?subject=World%20Makers">Contactar al equipo <ArrowRight size={18} aria-hidden="true" /></a>
            <a className={styles.secondaryLightButton} href="https://github.com/VladPhil92/World-Makers-Game" target="_blank" rel="noreferrer">Seguir el desarrollo</a>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div><Image src="/images/worldmakers/logo.webp" alt="World Makers" width={150} height={75} className={styles.footerLogo} /><p>Un proyecto de CTG One Technology.</p></div>
          <div className={styles.footerLinks}><a href="https://ctgone.com" target="_blank" rel="noreferrer">CTG One</a><a href="https://github.com/VladPhil92/World-Makers-Game" target="_blank" rel="noreferrer">GitHub</a><a href="mailto:direccion@ctgone.com?subject=World%20Makers">Contacto</a></div>
          <p className={styles.footerNote}>Las imágenes mostradas son visualizaciones conceptuales y referencias de dirección artística; no representan necesariamente el estado final del juego.</p>
        </div>
      </footer>
    </main>
  );
}
