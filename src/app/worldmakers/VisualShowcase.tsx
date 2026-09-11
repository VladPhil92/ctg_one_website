import { Compass, Eye, FlaskConical, Gamepad2, Leaf, Palette, Shapes, Wrench } from 'lucide-react';
import { worldMakersVisuals } from './visual-assets';
import styles from './worldmakers-visuals.module.css';

const directionCards = [
  {
    key: 'gameplay',
    title: 'Gameplay · visión general',
    copy: 'Primera persona, construcción, ciencia y misiones integradas en una sola referencia de experiencia.',
    icon: Gamepad2,
    asset: worldMakersVisuals.gameplayOverview,
    featured: true,
  },
  {
    key: 'science',
    title: 'Gameplay científico',
    copy: 'La misión River Renewal Project muestra química, física, biología y botánica como sistemas manipulables dentro del mundo, no como ejercicios separados del juego.',
    icon: FlaskConical,
    asset: worldMakersVisuals.gameplayScience,
    featured: false,
  },
  {
    key: 'build',
    title: 'Gameplay de construcción',
    copy: 'Construcción modular, energía, agua, materiales y naturaleza se conectan dentro de una interfaz de primera persona legible.',
    icon: Wrench,
    asset: worldMakersVisuals.gameplayBuild,
    featured: false,
  },
  {
    key: 'universe',
    title: 'Universo World Makers',
    copy: 'Una vista editorial del lenguaje visual completo: explorar, crear, aprender, experimentar y cuidar dentro de un mismo mundo vivo.',
    icon: Leaf,
    asset: worldMakersVisuals.universeOverview,
    featured: false,
  },
];

const identityCards = [
  {
    key: 'visual-identity',
    title: 'Guía visual base',
    copy: 'La paleta oficial, el lenguaje de formas y el resumen de estilo que gobiernan cada pantalla, personaje y entorno de World Makers.',
    icon: Palette,
    asset: worldMakersVisuals.visualIdentity,
  },
  {
    key: 'forms-style',
    title: 'Política de formas y estilo',
    copy: 'El límite explícito frente a estéticas de bloques voxel: formas orgánicas y modulares, personajes expresivos y siluetas reconocibles.',
    icon: Shapes,
    asset: worldMakersVisuals.formsAndAnimation,
  },
];

const characterInfo: Record<
  (typeof worldMakersVisuals.characters)[number]['key'],
  { name: string; note: string; accent: string; icon: typeof Compass }
> = {
  'curious-explorer': {
    name: 'Explorador curioso',
    note: 'Pregunta, observa y se atreve a descubrir lo desconocido.',
    accent: 'Naranja + azul',
    icon: Compass,
  },
  'scientist-inventor': {
    name: 'Inventora científica',
    note: 'Analiza, experimenta y convierte ideas en soluciones.',
    accent: 'Cian + tecnología',
    icon: FlaskConical,
  },
  'nature-guardian': {
    name: 'Guardián de la naturaleza',
    note: 'Comprende ecosistemas y aprende a restaurar lo que está vivo.',
    accent: 'Verde + tierra',
    icon: Leaf,
  },
  'luna-explorer': {
    name: 'Luna · exploradora del conocimiento',
    note: 'Conecta preguntas, personas y posibilidades para aprender mejor.',
    accent: 'Violeta + aventura',
    icon: Palette,
  },
};

export default function VisualShowcase() {
  return (
    <section id="visuales" className={styles.section} aria-labelledby="visual-showcase-title">
      <div className={styles.heading}>
        <div>
          <p className={styles.kicker}>ARTE ORIGINAL · FIDELIDAD NATIVA</p>
          <h2 id="visual-showcase-title">World Makers debe verse con el detalle con el que fue creado.</h2>
        </div>
        <div className={styles.headingCopy}>
          <Eye size={22} aria-hidden="true" />
          <p>
            Los masters configurados se sirven directamente, sin pasar por el optimizador de imágenes de Next.js,
            sin conversión WebP/AVIF, sin filtros de color y respetando la relación de aspecto original.
          </p>
        </div>
      </div>

      <div className={styles.directionGrid}>
        {directionCards.map(({ key, title, copy, icon: Icon, asset, featured }, index) => (
          <article
            className={`${styles.directionCard} ${featured ? styles.featuredCard : ''} ${styles[`card_${key}`] ?? ''}`}
            key={key}
          >
            <div className={styles.imageStage}>
              <img
                src={asset.src}
                alt={asset.alt}
                width={asset.width}
                height={asset.height}
                loading={index === 0 ? 'eager' : 'lazy'}
                decoding="async"
                className={styles.referenceImage}
              />
              <span className={styles.referenceBadge}>
                {asset.isOriginal ? 'Original master · sin compresión' : 'Referencia temporal'}
              </span>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.cardTitle}>
                <Icon size={19} aria-hidden="true" />
                <h3>{title}</h3>
              </div>
              <p>{copy}</p>
            </div>
          </article>
        ))}
      </div>

      <div className={styles.characterIntro}>
        <p className={styles.kicker}>PERSONAJES · MASTER VISUAL</p>
        <h3>Los Makers se presentan completos, no como miniaturas recortadas.</h3>
        <p>Dos columnas en escritorio preservan expresiones, accesorios, silueta, calzado y paleta; cada imagen mantiene su proporción nativa.</p>
      </div>
      <div className={styles.characterStrip}>
        {worldMakersVisuals.characters.map((character) => (
          <figure className={styles.characterReference} key={character.key}>
            <div className={styles.characterImageStage}>
              <img
                src={character.src}
                alt={character.alt}
                width={character.width}
                height={character.height}
                loading="lazy"
                decoding="async"
                className={styles.characterImage}
              />
              <span className={styles.characterQualityBadge}>
                {character.isOriginal ? 'Master original' : 'Referencia temporal'}
              </span>
            </div>
            <figcaption>
              <div className={styles.characterCaptionTitle}>
                {(() => {
                  const Icon = characterInfo[character.key].icon;
                  return <Icon size={16} aria-hidden="true" />;
                })()}
                <strong>{characterInfo[character.key].name}</strong>
              </div>
              <span>{characterInfo[character.key].accent}</span>
              <p>{characterInfo[character.key].note}</p>
            </figcaption>
          </figure>
        ))}
      </div>

      <div className={styles.characterIntro}>
        <p className={styles.kicker}>IDENTIDAD DE MARCA</p>
        <h3>La misma guía visual que gobierna cada pantalla del juego.</h3>
        <p>Paleta, formas y política de estilo aprobadas, publicadas junto al arte de personajes y gameplay.</p>
      </div>
      <div className={styles.directionGrid}>
        {identityCards.map(({ key, title, copy, icon: Icon, asset }) => (
          <article className={`${styles.directionCard} ${styles[`card_${key}`] ?? ''}`} key={key}>
            <div className={styles.imageStage}>
              <img
                src={asset.src}
                alt={asset.alt}
                width={asset.width}
                height={asset.height}
                loading="lazy"
                decoding="async"
                className={styles.referenceImage}
              />
              <span className={styles.referenceBadge}>
                {asset.isOriginal ? 'Original master · sin compresión' : 'Referencia temporal'}
              </span>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.cardTitle}>
                <Icon size={19} aria-hidden="true" />
                <h3>{title}</h3>
              </div>
              <p>{copy}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
