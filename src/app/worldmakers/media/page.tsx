import type { Metadata } from 'next';
import Image from 'next/image';
import { ExternalLink, ImageIcon, Shapes, Sparkles } from 'lucide-react';
import { PortalFooter, PortalNav } from '../PortalChrome';
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
            <h2>Las primeras piezas públicas.</h2>
          </div>
          <div className={styles.mediaGrid}>
            <article className={styles.mediaCard}>
              <Image className={styles.mediaImage} src="/images/worldmakers/hero-first-person.webp" alt="World Makers first-person concept at the Research Dome" fill sizes="(max-width: 920px) 100vw, 50vw" priority />
              <div className={styles.mediaOverlay}><strong>Research Dome · First-person concept</strong><span>Camera + HUD + exploration direction · concept visualization</span></div>
            </article>
            <article className={styles.mediaCard} style={{ background: 'linear-gradient(145deg,#0e356f,#2f80ed)' }}>
              <Image src="/images/worldmakers/logo.webp" alt="World Makers logo" fill sizes="(max-width: 920px) 50vw, 25vw" style={{ objectFit: 'contain', padding: 34 }} />
              <div className={styles.mediaOverlay}><strong>World Makers identity</strong><span>Primary public logo</span></div>
            </article>
            <article className={styles.mediaCard} style={{ background: 'radial-gradient(circle at 30% 25%,#9ae2ff,#2f80ed 46%,#123b7a)' }}>
              <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'white' }}><Shapes size={74} strokeWidth={1.3} /></div>
              <div className={styles.mediaOverlay}><strong>Organic modular language</strong><span>Arches · domes · terraces · rounded systems</span></div>
            </article>
            <article className={styles.mediaCard} style={{ background: 'radial-gradient(circle at 50% 20%,#b9f2cc,#27ae60 48%,#0a6740)' }}>
              <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'white' }}><Sparkles size={74} strokeWidth={1.3} /></div>
              <div className={styles.mediaOverlay}><strong>Nature + science + optimism</strong><span>Living systems instead of militarized visual language</span></div>
            </article>
            <article className={styles.mediaCard} style={{ background: 'linear-gradient(145deg,#fff2b6,#f2c94c,#f2994a)' }}>
              <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#6b4511', fontWeight: 950, fontSize: '1.35rem', textAlign: 'center', padding: 28 }}>IMAGINA<br />CREA<br />APRENDE<br />TRANSFORMA</div>
              <div className={styles.mediaOverlay}><strong>Brand voice</strong><span>Curiosity · creation · learning · transformation</span></div>
            </article>
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
