import { Eye, FlaskConical, Gamepad2, Leaf, Wrench } from 'lucide-react';
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
  ...(worldMakersVisuals.gameplayScience
    ? [{
        key: 'science',
        title: 'Gameplay científico',
        copy: 'Química, física, biología y botánica aparecen como sistemas manipulables dentro del mundo, no como ejercicios separados del juego.',
        icon: FlaskConical,
        asset: worldMakersVisuals.gameplayScience,
        featured: false,
      }]
    : []),
  ...(worldMakersVisuals.gameplayBuild
    ? [{
        key: 'build',
        title: 'Gameplay de construcción',
        copy: 'Construcción modular, energía, agua, materiales y naturaleza se conectan dentro de una interfaz de primera persona legible.',
        icon: Wrench,
        asset: worldMakersVisuals.gameplayBuild,
        featured: false,
      }]
    : []),
  ...(worldMakersVisuals.universeOverview
    ? [{
        key: 'universe',
        title: 'Universo World Makers',
        copy: 'Una vista editorial del lenguaje visual completo: explorar, crear, aprender, experimentar y cuidar dentro de un mismo mundo vivo.',
        icon: Leaf,
        asset: worldMakersVisuals.universeOverview,
        featured: false,
      }]
    : []),
];

const characterNames: Record<(typeof worldMakersVisuals.characters)[number]['key'], string> = {
  'curious-explorer': 'Explorador curioso',
  'scientist-inventor': 'Inventora científica',
  'nature-guardian': 'Guardián de la naturaleza',
  'luna-explorer': 'Luna · exploradora del conocimiento',
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
            <figcaption>{characterNames[character.key]}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
