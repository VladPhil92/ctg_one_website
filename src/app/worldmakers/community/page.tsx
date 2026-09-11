import type { Metadata } from 'next';
import { BellRing, FlaskConical, GraduationCap, ShieldCheck } from 'lucide-react';
import { PortalFooter, PortalNav } from '../PortalChrome';
import styles from '../portal.module.css';
import community from './community.module.css';
import CommunityInterestForm from './CommunityInterestForm';
import { isWorldMakersAudience, type WorldMakersAudience } from '@/lib/worldmakers/community';

export const metadata: Metadata = {
  title: 'Comunidad y acceso temprano | World Makers',
  description: 'Registro adulto de interés para familias, educadores, testers, investigadores y comunidad de desarrollo de World Makers.',
  alternates: { canonical: 'https://worldmakers.ctgone.com/community' },
};

type PageProps = {
  searchParams: Promise<{ audience?: string | string[] }>;
};

export default async function CommunityPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const rawAudience = Array.isArray(params.audience) ? params.audience[0] : params.audience;
  const initialAudience: WorldMakersAudience = isWorldMakersAudience(rawAudience) ? rawAudience : 'family';

  return (
    <main className={styles.portal}>
      <PortalNav />
      <section className={styles.hero}>
        <div className={`${styles.shell} ${styles.heroGrid}`}>
          <div>
            <p className={styles.kicker}>COMMUNITY · EARLY ACCESS INFRASTRUCTURE</p>
            <h1>Construyamos la comunidad antes de abrir las puertas del juego.</h1>
            <p className={styles.heroLead}>World Makers todavía no tiene una beta pública. Esta comunidad permite registrar interés real, segmentar futuras pruebas controladas y mantener una relación transparente con familias, educadores, testers e investigadores sin mezclar esos datos con identidades infantiles.</p>
          </div>
          <div className={styles.heroCard}>
            <div className={styles.heroCardIcon}><ShieldCheck size={30} aria-hidden="true" /></div>
            <div>
              <h2>Adult-first intake</h2>
              <p>El registro es para personas de 18 años o más. No pedimos nombre, edad, correo ni ningún otro dato de niños.</p>
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={`${styles.shell} ${community.layout}`}>
          <div className={community.context}>
            <p className={styles.kicker}>REGISTRO DE INTERÉS</p>
            <h2>Una lista de interés operable, no una promesa de beta.</h2>
            <p>El registro crea un perfil adulto de interés y preferencias. El equipo puede revisar, preseleccionar y preparar futuras invitaciones sin afirmar que una build ya está disponible.</p>
            <div className={community.promiseGrid}>
              <div className={community.promise}><BellRing size={22} /><div><strong>Actualizaciones con contexto</strong><span>Solo sobre los temas que selecciones y sin vender tu atención a terceros.</span></div></div>
              <div className={community.promise}><FlaskConical size={22} /><div><strong>Playtesting controlado</strong><span>La selección futura dependerá de la build, dispositivo, objetivo de prueba y seguridad.</span></div></div>
              <div className={community.promise}><GraduationCap size={22} /><div><strong>Pilotos educativos</strong><span>Docentes e instituciones pueden expresar interés sin confundirlo con una convocatoria formal ya abierta.</span></div></div>
              <div className={community.promise}><ShieldCheck size={22} /><div><strong>Privacidad minimizada</strong><span>No almacenamos IP ni datos infantiles en el perfil de comunidad; el formulario recoge solo lo necesario para gestionar el interés.</span></div></div>
            </div>
          </div>
          <CommunityInterestForm initialAudience={initialAudience} />
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.shell}>
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>SELECTION PIPELINE</p>
            <h2>El interés y el acceso son estados distintos.</h2>
            <p className={styles.sectionLead}>El sistema interno separa registro, revisión, preselección, preparación de invitación y contacto. Esto evita convertir un formulario público en una falsa señal de disponibilidad.</p>
          </div>
          <div className={styles.steps}>
            <div className={styles.step}><span className={styles.stepNumber}>1</span><div><h3>Registered</h3><p>La persona adulta registra su rol, correo y preferencias con consentimiento explícito.</p></div></div>
            <div className={styles.step}><span className={styles.stepNumber}>2</span><div><h3>Reviewing / Shortlisted</h3><p>El equipo puede revisar qué perfiles encajan con una futura prueba, piloto o investigación.</p></div></div>
            <div className={styles.step}><span className={styles.stepNumber}>3</span><div><h3>Ready to invite / Contacted</h3><p>Solo cuando exista un objetivo operativo real se prepara y registra el contacto correspondiente.</p></div></div>
          </div>
        </div>
      </section>
      <PortalFooter />
    </main>
  );
}
