import type { Metadata } from 'next';
import { ArrowUpRight, CheckCircle2, CircleDot, Code2, GitCommitHorizontal, ShieldCheck } from 'lucide-react';
import { PortalFooter, PortalNav } from '../PortalChrome';
import { launchMilestones, publicTruthLevels } from '../portal-data';
import styles from '../portal.module.css';

export const metadata: Metadata = {
  title: 'Development | World Makers',
  description: 'Build in public: World Makers roadmap, product-truth levels and recent public GitHub development activity.',
  alternates: { canonical: 'https://worldmakers.ctgone.com/development' },
};

type GitHubCommit = {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: { name: string; date: string } | null;
  };
};

async function getRecentCommits(): Promise<GitHubCommit[]> {
  try {
    const response = await fetch('https://api.github.com/repos/VladPhil92/World-Makers-Game/commits?per_page=6', {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'worldmakers-public-portal',
      },
      next: { revalidate: 3600 },
    });
    if (!response.ok) return [];
    const data = (await response.json()) as GitHubCommit[];
    return Array.isArray(data) ? data.slice(0, 6) : [];
  } catch {
    return [];
  }
}

function formatDate(value?: string) {
  if (!value) return 'Fecha no disponible';
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

export default async function DevelopmentPage() {
  const commits = await getRecentCommits();

  return (
    <main className={styles.portal}>
      <PortalNav />
      <section className={styles.hero}>
        <div className={`${styles.shell} ${styles.heroGrid}`}>
          <div>
            <p className={styles.kicker}>BUILD IN PUBLIC</p>
            <h1>Mostrar progreso sin inventar madurez.</h1>
            <p className={styles.heroLead}>World Makers distingue implementación fuente, certificación nativa, evidencia en dispositivo y disponibilidad pública. Una build de marketing nunca debe convertir “existe en código” en “ya puedes jugarlo”.</p>
            <div className={styles.heroActions}>
              <a className={styles.primaryButton} href="https://github.com/VladPhil92/World-Makers-Game" target="_blank" rel="noreferrer">Abrir repositorio <ArrowUpRight size={17} /></a>
              <a className={styles.secondaryButton} href="https://github.com/VladPhil92/World-Makers-Game/blob/main/docs/roadmap.md" target="_blank" rel="noreferrer">Roadmap técnico</a>
            </div>
          </div>
          <aside className={styles.heroCard}>
            <div className={styles.heroCardIcon}><Code2 size={30} /></div>
            <div>
              <p className={styles.kicker} style={{ color: '#9fe7ff' }}>CURRENT PRODUCT FRONT</p>
              <h2>M5.5 · First Fantastic Adventure Pack</h2>
              <p>Las fundaciones multidisciplinarias M5.1–M5.4 están source-complete. La siguiente meta es convertirlas en aventuras representativas jugables end-to-end.</p>
            </div>
          </aside>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.shell}>
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>PUBLIC TRUTH LADDER</p>
            <h2>Cinco estados que no significan lo mismo.</h2>
            <p className={styles.sectionLead}>Esta jerarquía gobierna las afirmaciones públicas del portal. Un estado inferior nunca se redacta como si hubiera alcanzado uno superior.</p>
          </div>
          <div className={styles.truthGrid}>
            {publicTruthLevels.map(([title, copy], index) => (
              <article className={styles.truthCard} key={title}>
                <span className={styles.badge}>0{index + 1}</span>
                <strong style={{ marginTop: 12 }}>{title}</strong>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={`${styles.shell} ${styles.split}`}>
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>ROADMAP SNAPSHOT</p>
            <h2>Del vertical slice al primer Adventure Pack.</h2>
            <p className={styles.sectionLead}>El portal resume el roadmap canónico del repositorio y mantiene separadas las obligaciones de certificación que dependen de Unreal y de dispositivos representativos.</p>
          </div>
          <div className={styles.timeline}>
            {launchMilestones.map((milestone) => (
              <article className={styles.timelineItem} key={milestone.code}>
                <div className={styles.timelineCode}>{milestone.code}</div>
                <div>
                  <div className={styles.cardTopline}>
                    {milestone.state === 'Source complete' ? <CheckCircle2 size={17} color="#27ae60" /> : <CircleDot size={17} color="#2f80ed" />}
                    <span className={milestone.state === 'Source complete' ? styles.status : styles.badge}>{milestone.state}</span>
                  </div>
                  <h3>{milestone.title}</h3>
                  <p>{milestone.truth}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.shell}>
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>RECENT PUBLIC ACTIVITY</p>
            <h2>Development log desde GitHub.</h2>
            <p className={styles.sectionLead}>Los commits siguientes se consultan desde el repositorio público y se actualizan con caché horaria. Sirven como evidencia de actividad, no como certificado de que una feature ya pasó Unreal o device gates.</p>
          </div>
          {commits.length > 0 ? (
            <div className={styles.commitGrid}>
              {commits.map((commit) => {
                const title = commit.commit.message.split('\n')[0];
                return (
                  <article className={styles.commitCard} key={commit.sha}>
                    <div className={styles.commitMeta}><GitCommitHorizontal size={15} /><span>{commit.sha.slice(0, 7)}</span><span>{formatDate(commit.commit.author?.date)}</span></div>
                    <h3>{title}</h3>
                    <p>{commit.commit.author?.name ?? 'World Makers contributors'}</p>
                    <a className={styles.commitLink} href={commit.html_url} target="_blank" rel="noreferrer">Ver commit <ArrowUpRight size={14} /></a>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={styles.notice}>GitHub no respondió durante esta renderización. El portal falla de forma segura: el roadmap canónico sigue visible y la actividad reciente puede consultarse directamente en el repositorio.</div>
          )}
        </div>
      </section>

      <section className={styles.section}>
        <div className={`${styles.shell} ${styles.audienceHero}`}>
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>CERTIFICATION BOUNDARY</p>
            <h2>CI web no sustituye Unreal ni evidencia de dispositivo.</h2>
            <p className={styles.sectionLead}>La integridad de fuente puede verificarse en GitHub. El runtime nativo requiere el entorno Unreal bloqueado y la certificación tablet exige captura en hardware representativo antes de hacer una afirmación pública equivalente.</p>
          </div>
          <div className={styles.callout}>
            <ShieldCheck size={34} />
            <h3>Fail closed on maturity claims.</h3>
            <p>Cuando falta evidencia de una capa superior, el portal mantiene el estado anterior en vez de inferir que la feature “debe funcionar”.</p>
          </div>
        </div>
      </section>
      <PortalFooter />
    </main>
  );
}
