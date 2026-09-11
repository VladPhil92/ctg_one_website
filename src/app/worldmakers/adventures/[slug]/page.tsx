import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Compass, Sparkles } from 'lucide-react';
import { notFound } from 'next/navigation';
import { PortalFooter, PortalNav } from '../../PortalChrome';
import { adventures } from '../../portal-data';
import styles from '../../portal.module.css';

type AdventurePageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return adventures.map((adventure) => ({ slug: adventure.slug }));
}

export async function generateMetadata({ params }: AdventurePageProps): Promise<Metadata> {
  const { slug } = await params;
  const adventure = adventures.find((item) => item.slug === slug);
  if (!adventure) return {};
  return {
    title: `${adventure.title} | World Makers`,
    description: adventure.premise,
    alternates: { canonical: `https://worldmakers.ctgone.com/adventures/${adventure.slug}` },
  };
}

export default async function AdventurePage({ params }: AdventurePageProps) {
  const { slug } = await params;
  const adventure = adventures.find((item) => item.slug === slug);
  if (!adventure) notFound();

  const currentIndex = adventures.findIndex((item) => item.slug === adventure.slug);
  const nextAdventure = adventures[(currentIndex + 1) % adventures.length];

  return (
    <main className={styles.portal}>
      <PortalNav />
      <section className={styles.detailHero}>
        <div className={styles.shell}>
          <Link className={styles.cardLink} href="/worldmakers/adventures"><ArrowLeft size={16} /> Volver al atlas</Link>
          <div className={styles.detailMeta} style={{ marginTop: 28 }}>
            <span className={styles.status}>{adventure.status}</span>
            <span className={styles.badge}>{adventure.eyebrow}</span>
            {adventure.disciplines.map((discipline) => <span className={styles.pill} key={discipline}>{discipline}</span>)}
          </div>
          <h1>{adventure.title}</h1>
          <p className={styles.detailLead}>{adventure.premise}</p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryButton} href="/worldmakers/how-to-play">Entender el game loop <ArrowRight size={17} /></Link>
            <Link className={styles.secondaryButton} href="/worldmakers/development">Ver qué está construido</Link>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={`${styles.shell} ${styles.detailGrid}`}>
          <article className={styles.infoCard}>
            <Compass size={28} color="#2f80ed" />
            <h3>El problema del mundo</h3>
            <p>{adventure.challenge}</p>
            <div className={styles.conceptCloud}>{adventure.concepts.map((concept) => <span className={styles.pill} key={concept}>{concept}</span>)}</div>
          </article>
          <article className={styles.infoCard}>
            <Sparkles size={28} color="#27ae60" />
            <h3>Contrato de diseño</h3>
            <p>La disciplina debe modificar cómo se juega. El objetivo no es acertar una respuesta separada de la aventura, sino usar ideas auténticas para producir un resultado dentro del mundo.</p>
          </article>
        </div>
      </section>

      <section className={styles.section}>
        <div className={`${styles.shell} ${styles.detailGrid}`}>
          <article className={styles.infoCard}>
            <p className={styles.kicker}>WHAT THE PLAYER DOES</p>
            <h3>Acciones jugables</h3>
            <ul className={styles.list}>
              {adventure.playerActions.map((action, index) => (
                <li key={action}><span className={styles.listMarker}>{index + 1}</span><span>{action}</span></li>
              ))}
            </ul>
          </article>
          <article className={styles.infoCard}>
            <p className={styles.kicker}>LEARNING EVIDENCE</p>
            <h3>Qué cuenta como evidencia</h3>
            <ul className={styles.list}>
              {adventure.learningEvidence.map((evidence) => (
                <li key={evidence}><span className={styles.listMarker}><Check size={13} /></span><span>{evidence}</span></li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={`${styles.shell} ${styles.split}`}>
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>PRODUCT TRUTH</p>
            <h2>Concepto público no significa release disponible.</h2>
            <p className={styles.sectionLead}>Las páginas de aventura funcionan como diseño público del producto. Solo el Caribbean Rainforest se presenta como vertical slice de referencia, y aun allí distinguimos fuente, certificación nativa, dispositivo y disponibilidad pública.</p>
          </div>
          <div className={styles.callout}>
            <h3>Siguiente destino</h3>
            <p>{nextAdventure.title}</p>
            <Link className={styles.primaryButton} style={{ marginTop: 20, background: 'white', color: '#123b7a' }} href={`/worldmakers/adventures/${nextAdventure.slug}`}>
              Explorar <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
      <PortalFooter />
    </main>
  );
}
