import Image from 'next/image';
import { Eye, Gamepad2, Palette, Shapes } from 'lucide-react';
import { worldMakersVisuals } from './visual-assets';
import styles from './worldmakers-visuals.module.css';

const directionCards = [
  {
    key: 'gameplay',
    title: 'Dirección de gameplay',
    copy: 'Mundo eco-fantástico, profundidad de paisaje, HUD de misión y lenguaje de construcción.',
    icon: Gamepad2,
    asset: worldMakersVisuals.gameplayOverview,
  },
  {
    key: 'identity',
    title: 'Identidad visual',
    copy: 'Paleta, contraste, superficies y vocabulario visual que sostienen una identidad propia.',
    icon: Palette,
    asset: worldMakersVisuals.visualIdentity,
  },
  {
    key: 'forms',
    title: 'Formas y animación',
    copy: 'Política anti-voxel, siluetas orgánicas y una dirección de movimiento expresiva y legible.',
    icon: Shapes,
    asset: worldMakersVisuals.formsAndAnimation,
  },
];

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
            Estas piezas pertenecen al set de referencias visuales aprobado y versionado en el repositorio.
            Son visualizaciones conceptuales: comunican la dirección artística y de experiencia, no capturas de una build final.
          </p>
        </div>
      </div>

      <div className={styles.directionGrid}>
        {directionCards.map(({ key, title, copy, icon: Icon, asset }, index) => (
          <article className={`${styles.directionCard} ${index === 0 ? styles.featuredCard : ''}`} key={key}>
            <div className={styles.imageStage}>
              <Image
                src={asset.src}
                alt={asset.alt}
                width={asset.width}
                height={asset.height}
                sizes={index === 0 ? '(max-width: 900px) 92vw, 48vw' : '(max-width: 900px) 92vw, 24vw'}
                className={styles.referenceImage}
              />
              <span className={styles.referenceBadge}>Referencia conceptual</span>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.cardTitle}><Icon size={19} aria-hidden="true" /><h3>{title}</h3></div>
              <p>{copy}</p>
            </div>
          </article>
        ))}
      </div>

      <div className={styles.characterIntro}>
        <p className={styles.kicker}>PERSONAJES · REFERENCIA VISUAL</p>
        <h3>Los Makers ya tienen un lenguaje visual definido.</h3>
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
                sizes="(max-width: 640px) 44vw, (max-width: 1000px) 22vw, 240px"
                className={styles.characterImage}
              />
            </div>
            <figcaption>{character.alt.replace('Referencia visual del personaje ', '').replace('Referencia visual de ', '')}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
