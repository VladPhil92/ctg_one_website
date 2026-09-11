import type { Metadata } from 'next';
import Image from 'next/image';
import { ExternalLink, ImageIcon } from 'lucide-react';
import { PortalFooter, PortalNav } from '../PortalChrome';
import { worldMakersVisuals } from '../visual-assets';
import styles from '../portal.module.css';

export const metadata: Metadata = {
  title: 'Media & Visual Direction | World Makers',
  description: 'World Makers media gallery and public visual-direction principles: organic modular worlds, friendly science and concept-art truth boundaries.',
  alternates: { canonical: 'https://worldmakers.ctgone.com/media' },
};

export default function MediaPage() {
  return (
    <main className={styles.portal}>
      <PortalNav />
      <section className={styles.hero}>
        <div className={`${styles.shell} ${styles.heroGrid}`}>
          <div>
            <p className={styles.kicker}>MEDIA · VISUAL DIRECTION</p>
            <h1>Un mundo orgánico, modular y vivo.</h1>
            <p className={styles.heroLead}>La dirección visual combina naturaleza, ciencia, construcción y optimismo. Las imágenes públicas se etiquetan según su función para evitar confundir un mockup conceptual con una captura del runtime final.</p>
          </div>
          <aside className={styles.heroCard}>
            <div className={styles.heroCardIcon}><ImageIcon size={30} /></div>
            <div>
              <p className={styles.kicker} style={{ color: '#9fe7ff' }}>PUBLIC MEDIA RULE</p>
              <h2>Concept art is direction, not certification.</h2>
              <p>Una visualización puede definir cámara, HUD, composición, formas o tono sin afirmar que la misma fidelidad ya existe en una build jugable.</p>
            </div>
          </aside>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.shell}>
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>FEATURED MEDIA</p>
            <h2>Las referencias aprobadas, visibles en la web.</h2>
          </div>
          <div className={styles.mediaGrid}>
            <article className={styles.mediaCard}>
              <Image className={styles.mediaImage} src="/images/worldmakers/hero-first-person.webp" alt="World Makers first-person concept at the Research Dome" fill sizes="(max-width: 920px) 100vw, 50vw" priority style={{ filter: 'brightness(1.18) saturate(1.06)' }} />
              <div className={styles.mediaOverlay}><strong>Research Dome · First-person concept</strong><span>Camera + HUD + exploration direction · concept visualization</span></div>
            </article>
            <article className={styles.mediaCard} style={{ background: 'linear-gradient(145deg,#0e356f,#2f80ed)' }}>
              <Image src="/images/worldmakers/logo.webp" alt="World Makers logo" fill sizes="(max-width: 920px) 50vw, 25vw" style={{ objectFit: 'contain', padding: 34 }} />
              <div className={styles.mediaOverlay}><strong>World Makers identity</strong><span>Primary public logo</span></div>
            </article>
            <article className={styles.mediaCard}>
              <Image src={worldMakersVisuals.gameplayOverview.src} alt={worldMakersVisuals.gameplayOverview.alt} fill sizes="(max-width: 920px) 100vw, 33vw" style={{ objectFit: 'cover' }} />
              <div className={styles.mediaOverlay}><strong>Gameplay visual direction</strong><span>World depth · mission HUD · build categories · approved concept reference</span></div>
            </article>
            <article className={styles.mediaCard}>
              <Image src={worldMakersVisuals.visualIdentity.src} alt={worldMakersVisuals.visualIdentity.alt} fill sizes="(max-width: 920px) 100vw, 33vw" style={{ objectFit: 'cover' }} />
              <div className={styles.mediaOverlay}><strong>Visual identity base guide</strong><span>Palette · surfaces · visual language · approved concept reference</span></div>
            </article>
            <article className={styles.mediaCard}>
              <Image src={worldMakersVisuals.formsAndAnimation.src} alt={worldMakersVisuals.formsAndAnimation.alt} fill sizes="(max-width: 920px) 100vw, 33vw" style={{ objectFit: 'cover' }} />
              <div className={styles.mediaOverlay}><strong>Forms, design & animation</strong><span>Organic modular language · anti-voxel boundary · motion direction</span></div>
            </article>
            {worldMakersVisuals.characters.map((character, index) => (
              <article className={styles.mediaCard} key={character.key} style={{ background: 'linear-gradient(180deg,#eaf6ff,#c7e1f4)' }}>
                <Image src={character.src} alt={character.alt} fill sizes="(max-width: 920px) 50vw, 25vw" style={{ objectFit: 'cover' }} />
                <div className={styles.mediaOverlay}><strong>Maker reference {index + 1}</strong><span>{character.alt}</span></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={`${styles.shell} ${styles.detailGrid}`}>
          <article className={styles.infoCard}>
            <p className={styles.kicker}>WE DO</p>
            <h3>Formas ricas y legibles</h3>
            <p>Prismas suavizados, cilindros, arcos, puentes, cúpulas, terrazas, roca orgánica, vegetación, agua y tecnología amable. Modular no significa visualmente cúbico.</p>
          </article>
          <article className={styles.infoCard}>
            <p className={styles.kicker}>WE AVOID</p>
            <h3>Una identidad dominada por voxel blocks</h3>
            <p>La política visual evita terreno basado en cubos repetidos, texturas 3D pixeladas simples, siluetas copiadas y decisiones que hagan del parecido con otro sandbox la principal referencia visual.</p>
          </article>
        </div>
        <div className={`${styles.shell} ${styles.inlineActions}`}>
          <a className={styles.secondaryButton} href="https://github.com/VladPhil92/World-Makers-Game/tree/main/docs/visual-reference/world-makers-v1" target="_blank" rel="noreferrer">Ver referencias versionadas <ExternalLink size={15} /></a>
          <a className={styles.secondaryButton} href="https://github.com/VladPhil92/World-Makers-Game/blob/main/docs/visual-identity-animation-policy.md" target="_blank" rel="noreferrer">Política de imagen y animación <ExternalLink size={15} /></a>
        </div>
      </section>
      <PortalFooter />
    </main>
  );
}
