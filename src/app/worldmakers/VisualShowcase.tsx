import Image from 'next/image';
import { Eye, Gamepad2, Palette, Shapes } from 'lucide-react';
import { worldMakersVisuals } from './visual-assets';
import styles from './worldmakers-visuals.module.css';

const directionCards = [
  {
    key: 'gameplay',
    title: 'Dirección de gameplay',
    copy: 'Primera persona, construcción, ciencia y misiones integradas en una sola referencia de experiencia.',
    icon: Gamepad2,
    asset: worldMakersVisuals.gameplayOverview,
  },
  {
    key: 'identity',
    title: 'Identidad visual',
    copy: 'Paleta, contraste, superficies y vocabulario visual presentados completos, sin recortes destructivos.',
    icon: Palette,
    asset: worldMakersVisuals.visualIdentity,
  },
  {
    key: 'forms',
    title: 'Formas y animación',
    copy: 'Política anti-voxel, siluetas orgánicas, entornos, objetos y dirección de movimiento.',
    icon: Shapes,
    asset: worldMakersVisuals.formsAndAnimation,
  },
] as const;

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
          <p className={styles.kicker}>DIRECCIÓN VISUAL APROBADA</p>
          <h2 id="visual-showcase-title">World Makers debe verse, no solo explicarse.</h2>
        </div>
        <div className={styles.headingCopy}>
          <Eye size={22} aria-hidden="true" />
          <p>
            Las referencias se renderizan sin una segunda compresión de Next.js y respetando su relación de aspecto.
            No se estiran miniaturas, no se recortan fichas y las referencias verticales conservan su composición.
          </p>
        </div>
      </div>

      <div className={styles.directionGrid}>
        {directionCards.map(({ key, title, copy, icon: Icon, asset }, index) => (
          <article
            className={`${styles.directionCard} ${index === 0 ? styles.featuredCard : ''} ${styles[`card_${key}`]}`}
            key={key}
          >
            <div className={styles.imageStage}>
              <Image
                src={asset.src}
                alt={asset.alt}
                width={asset.width}
                height={asset.height}
                sizes={index === 0 ? '(max-width: 1280px) 92vw, 1180px' : '(max-width: 760px) 92vw, 570px'}
                unoptimized
                className={styles.referenceImage}
              />
              <span className={styles.referenceBadge}>Referencia conceptual</span>
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
        <p className={styles.kicker}>PERSONAJES · REFERENCIA VISUAL</p>
        <h3>Los Makers ya tienen un lenguaje visual definido.</h3>
        <p>Las fichas se muestran completas y con espacio suficiente para leer poses, expresiones, accesorios y paleta.</p>
      </div>
      <div className={styles.characterStrip}>
        {worldMakersVisuals.characters.map((character) => (
          <figure className={styles.characterReference} key={character.key}>
            <div className={styles.characterImageStage}>
              <Image
                src={character.src}
                alt={character.alt}
                width={character.width}
                height={character.height}
                sizes="(max-width: 760px) 92vw, (max-width: 1220px) 46vw, 570px"
                unoptimized
                className={styles.characterImage}
              />
            </div>
            <figcaption>{characterNames[character.key]}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
