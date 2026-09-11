import type { Metadata } from 'next';
import Image from 'next/image';
import { ExternalLink, ImageIcon } from 'lucide-react';
import { PortalFooter, PortalNav } from '../PortalChrome';
import { worldMakersVisuals } from '../visual-assets';
import styles from '../portal.module.css';
import hd from './media-hd.module.css';

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
            <p className={styles.heroLead}>La dirección visual combina naturaleza, ciencia, construcción y optimismo. Las referencias se muestran respetando su formato original y con calidad web suficiente para revisar detalles.</p>
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
            <h2>Las referencias aprobadas, visibles con su composición completa.</h2>
          </div>

          <div className={hd.grid}>
            <article className={`${styles.mediaCard} ${hd.referenceCard} ${hd.wide}`}>
              <div className={hd.heroFrame}>
                <Image className={hd.heroImage} src={worldMakersVisuals.hero.src} alt={worldMakersVisuals.hero.alt} fill sizes="100vw" priority unoptimized />
                <div className={hd.overlay}><strong>Hero banner · marketing oficial</strong><span>Logo + CTA + explorador principal · master sin compresión</span></div>
              </div>
            </article>

            <article className={`${styles.mediaCard} ${hd.referenceCard}`}>
              <div className={hd.logoFrame}>
                <Image className={hd.logoImage} src={worldMakersVisuals.logo.src} alt={worldMakersVisuals.logo.alt} width={worldMakersVisuals.logo.width} height={worldMakersVisuals.logo.height} unoptimized />
                <div className={hd.overlay}><strong>World Makers identity</strong><span>Primary public logo</span></div>
              </div>
            </article>

            <article className={`${styles.mediaCard} ${hd.referenceCard}`}>
              <div className={hd.imageFrame}>
                <Image className={hd.referenceImage} src={worldMakersVisuals.visualIdentity.src} alt={worldMakersVisuals.visualIdentity.alt} width={worldMakersVisuals.visualIdentity.width} height={worldMakersVisuals.visualIdentity.height} sizes="(max-width: 760px) 92vw, 570px" unoptimized />
                <div className={hd.overlay}><strong>Visual identity base guide</strong><span>Palette · surfaces · visual language · approved concept reference</span></div>
              </div>
            </article>

            <article className={`${styles.mediaCard} ${hd.referenceCard} ${hd.wide}`}>
              <div className={hd.imageFrame}>
                <Image className={hd.referenceImage} src={worldMakersVisuals.gameplayOverview.src} alt={worldMakersVisuals.gameplayOverview.alt} width={worldMakersVisuals.gameplayOverview.width} height={worldMakersVisuals.gameplayOverview.height} sizes="(max-width: 1280px) 92vw, 1180px" unoptimized />
                <div className={hd.overlay}><strong>Gameplay visual direction</strong><span>First person · building · scientific gameplay · mission UI</span></div>
              </div>
            </article>

            <article className={`${styles.mediaCard} ${hd.referenceCard} ${hd.wide}`}>
              <div className={hd.imageFrame}>
                <Image className={hd.referenceImage} src={worldMakersVisuals.gameplayScience.src} alt={worldMakersVisuals.gameplayScience.alt} width={worldMakersVisuals.gameplayScience.width} height={worldMakersVisuals.gameplayScience.height} sizes="(max-width: 1280px) 92vw, 1180px" unoptimized />
                <div className={hd.overlay}><strong>Gameplay científico</strong><span>River Renewal Project · química, física, biología y botánica</span></div>
              </div>
            </article>

            <article className={`${styles.mediaCard} ${hd.referenceCard} ${hd.wide}`}>
              <div className={hd.imageFrame}>
                <Image className={hd.referenceImage} src={worldMakersVisuals.gameplayBuild.src} alt={worldMakersVisuals.gameplayBuild.alt} width={worldMakersVisuals.gameplayBuild.width} height={worldMakersVisuals.gameplayBuild.height} sizes="(max-width: 1280px) 92vw, 1180px" unoptimized />
                <div className={hd.overlay}><strong>Gameplay de construcción</strong><span>Módulo eco-científico · materiales · snap-to-connector</span></div>
              </div>
            </article>

            <article className={`${styles.mediaCard} ${hd.referenceCard}`}>
              <div className={hd.imageFrame}>
                <Image className={hd.referenceImage} src={worldMakersVisuals.universeOverview.src} alt={worldMakersVisuals.universeOverview.alt} width={worldMakersVisuals.universeOverview.width} height={worldMakersVisuals.universeOverview.height} sizes="(max-width: 760px) 92vw, 570px" unoptimized />
                <div className={hd.overlay}><strong>Universe overview poster</strong><span>Explorador + compañero · HUD y categorías de construcción</span></div>
              </div>
            </article>

            <article className={`${styles.mediaCard} ${hd.referenceCard} ${hd.wide}`}>
              <div className={hd.imageFrame}>
                <Image className={hd.referenceImage} src={worldMakersVisuals.formsAndAnimation.src} alt={worldMakersVisuals.formsAndAnimation.alt} width={worldMakersVisuals.formsAndAnimation.width} height={worldMakersVisuals.formsAndAnimation.height} sizes="(max-width: 1280px) 92vw, 1180px" unoptimized />
                <div className={hd.overlay}><strong>Forms, design & animation</strong><span>Organic modular language · anti-voxel boundary · motion direction</span></div>
              </div>
            </article>

            {worldMakersVisuals.characters.map((character, index) => (
              <article className={`${styles.mediaCard} ${hd.referenceCard} ${hd.characterCard}`} key={character.key}>
                <div className={hd.imageFrame}>
                  <Image className={hd.referenceImage} src={character.src} alt={character.alt} width={character.width} height={character.height} sizes="(max-width: 760px) 92vw, 570px" unoptimized />
                  <div className={hd.overlay}><strong>Maker reference {index + 1}</strong><span>{character.alt}</span></div>
                </div>
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
          <a className={styles.secondaryButton} href="https://github.com/VladPhil92/World-Makers-Game/tree/main/docs/visual-reference/world-makers-v2" target="_blank" rel="noreferrer">Ver referencias versionadas <ExternalLink size={15} /></a>
          <a className={styles.secondaryButton} href="https://github.com/VladPhil92/World-Makers-Game/blob/main/docs/visual-identity-animation-policy.md" target="_blank" rel="noreferrer">Política de imagen y animación <ExternalLink size={15} /></a>
        </div>
      </section>
      <PortalFooter />
    </main>
  );
}
