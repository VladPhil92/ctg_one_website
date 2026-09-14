import type { Metadata } from 'next';
import Image from 'next/image';
import { Camera, Gamepad2, Sparkles } from 'lucide-react';
import { PortalFooter, PortalNav } from '../PortalChrome';
import { worldMakersVisuals } from '../visual-assets';
import styles from '../portal.module.css';
import hd from './media-hd.module.css';

export const metadata: Metadata = {
  title: 'Galería | World Makers',
  description: 'Explora escenas, gameplay y personajes del universo World Makers.',
  alternates: { canonical: 'https://worldmakers.ctgone.com/media' },
};

const scenes = [
  {
    title: 'Explora un mundo vivo',
    subtitle: 'Aventura, construcción y descubrimiento en primera persona',
    asset: worldMakersVisuals.gameplayOverview,
    wide: true,
  },
  {
    title: 'Investiga lo que ocurre a tu alrededor',
    subtitle: 'La ciencia se convierte en una herramienta para avanzar',
    asset: worldMakersVisuals.gameplayScience,
    wide: true,
  },
  {
    title: 'Construye soluciones',
    subtitle: 'Materiales, energía, agua y naturaleza forman parte del mundo',
    asset: worldMakersVisuals.gameplayBuild,
    wide: true,
  },
  {
    title: 'Descubre el universo World Makers',
    subtitle: 'Explora, crea, aprende y transforma',
    asset: worldMakersVisuals.universeOverview,
    wide: false,
  },
] as const;

export default function MediaPage() {
  return (
    <main className={styles.portal}>
      <PortalNav />

      <section className={styles.hero}>
        <div className={`${styles.shell} ${styles.heroGrid}`}>
          <div>
            <p className={styles.kicker}>GALERÍA</p>
            <h1>Mira el mundo antes de entrar en él.</h1>
            <p className={styles.heroLead}>
              Escenas de exploración, construcción, ciencia y personajes que dan forma al universo de World Makers.
            </p>
          </div>
          <aside className={styles.heroCard}>
            <div className={styles.heroCardIcon}><Camera size={30} /></div>
            <div>
              <p className={styles.kicker} style={{ color: '#9fe7ff' }}>WORLD MAKERS</p>
              <h2>Un universo hecho para descubrir.</h2>
              <p>Cada escena conecta aventura, curiosidad y creación dentro de una misma experiencia.</p>
            </div>
          </aside>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.shell}>
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>DENTRO DEL JUEGO</p>
            <h2>Explora. Experimenta. Construye.</h2>
            <p className={styles.sectionLead}>
              World Makers busca que cada acción del jugador tenga sentido dentro del mundo: observar, probar, construir y descubrir son partes de la aventura.
            </p>
          </div>

          <div className={hd.grid}>
            {scenes.map((scene) => (
              <article
                className={`${styles.mediaCard} ${hd.referenceCard} ${scene.wide ? hd.wide : ''}`}
                key={scene.title}
              >
                <div className={scene.asset === worldMakersVisuals.universeOverview ? hd.imageFrame : hd.imageFrame}>
                  <Image
                    className={hd.referenceImage}
                    src={scene.asset.src}
                    alt={scene.asset.alt}
                    width={scene.asset.width}
                    height={scene.asset.height}
                    sizes={scene.wide ? '(max-width: 1280px) 92vw, 1180px' : '(max-width: 760px) 92vw, 570px'}
                    unoptimized
                  />
                  <div className={hd.overlay}>
                    <strong>{scene.title}</strong>
                    <span>{scene.subtitle}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.shell}>
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>CONOCE A LOS MAKERS</p>
            <h2>Distintas formas de mirar el mismo mundo.</h2>
            <p className={styles.sectionLead}>
              Exploradores, inventores y guardianes acompañan una experiencia donde la curiosidad puede tomar muchos caminos.
            </p>
          </div>

          <div className={hd.grid}>
            {worldMakersVisuals.characters.map((character, index) => (
              <article className={`${styles.mediaCard} ${hd.referenceCard} ${hd.characterCard}`} key={character.key}>
                <div className={hd.imageFrame}>
                  <Image
                    className={hd.referenceImage}
                    src={character.src}
                    alt={character.alt}
                    width={character.width}
                    height={character.height}
                    sizes="(max-width: 760px) 92vw, 570px"
                    unoptimized
                  />
                  <div className={hd.overlay}>
                    <strong>Maker {index + 1}</strong>
                    <span>{['Explora lo desconocido', 'Convierte preguntas en experimentos', 'Protege los sistemas vivos', 'Conecta ideas y nuevas rutas'][index]}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className={`${styles.detailGrid}`} style={{ marginTop: 36 }}>
            <article className={styles.infoCard}>
              <Gamepad2 size={26} />
              <h3>Una sola experiencia</h3>
              <p>La aventura no separa jugar y aprender: investigar un problema, construir una solución y ver sus consecuencias forman parte del mismo recorrido.</p>
            </article>
            <article className={styles.infoCard}>
              <Sparkles size={26} />
              <h3>Un mundo con identidad propia</h3>
              <p>Naturaleza, ciencia, tecnología amable y construcción modular se combinan para crear lugares reconocibles y llenos de posibilidades.</p>
            </article>
          </div>
        </div>
      </section>

      <PortalFooter />
    </main>
  );
}
