import type { Metadata } from 'next';
import { Database, EyeOff, Mail, ShieldCheck, UserRoundCheck } from 'lucide-react';
import { PortalFooter, PortalNav } from '../PortalChrome';
import styles from '../portal.module.css';

export const metadata: Metadata = {
  title: 'Privacidad de la comunidad | World Makers',
  description: 'Aviso de privacidad para el registro adulto de comunidad y acceso temprano de World Makers.',
  alternates: { canonical: 'https://worldmakers.ctgone.com/privacy' },
};

const cards = [
  { icon: Database, title: 'Qué guardamos', copy: 'Correo electrónico, nombre o identificación profesional opcional, rol de interés, preferencias seleccionadas, consentimiento y estado operativo del registro.' },
  { icon: EyeOff, title: 'Qué no guardamos aquí', copy: 'No solicitamos datos de niños, dirección física, documentos de identidad, IP persistida, user-agent, datos de pago ni telemetría de gameplay dentro del perfil de comunidad.' },
  { icon: UserRoundCheck, title: 'Para qué se usa', copy: 'Gestionar actualizaciones solicitadas, revisión de candidatos adultos, posibles pilotos educativos, investigación con familias y futuras pruebas controladas.' },
  { icon: ShieldCheck, title: 'Acceso operativo', copy: 'Las tablas de comunidad no tienen acceso directo para roles públicos del navegador. La lectura y modificación operativa está restringida al límite de servidor y al panel SUPER_ADMIN.' },
  { icon: Mail, title: 'Corrección o retiro', copy: 'Puedes solicitar corrección o retiro del registro escribiendo a direccion@ctgone.com. El equipo marcará el perfil como retirado y dejará de usarlo para nuevas selecciones.' },
];

export default function WorldMakersPrivacyPage() {
  return (
    <main className={styles.portal}>
      <PortalNav />
      <section className={styles.hero}>
        <div className={`${styles.shell} ${styles.heroGrid}`}>
          <div>
            <p className={styles.kicker}>COMMUNITY PRIVACY · V1 · 11 SEP 2026</p>
            <h1>Privacidad minimizada para una comunidad que todavía está naciendo.</h1>
            <p className={styles.heroLead}>Este aviso cubre el registro adulto de interés de World Makers. No cubre una cuenta infantil del videojuego, porque esa capa de identidad todavía no se presenta como disponible en producción.</p>
          </div>
          <div className={styles.heroCard}>
            <div className={styles.heroCardIcon}><ShieldCheck size={30} aria-hidden="true" /></div>
            <div><h2>Separación de dominios</h2><p>La lista adulta de comunidad se mantiene conceptualmente separada de cualquier identidad infantil, progreso de juego o relación tutor–niño futura.</p></div>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.shell}>
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>DATA MINIMIZATION</p>
            <h2>Recolectar solo lo necesario para una finalidad explícita.</h2>
          </div>
          <div className={styles.cardGrid}>
            {cards.map(({ icon: Icon, title, copy }) => (
              <article className={styles.card} key={title}>
                <div className={styles.cardIcon}><Icon size={22} /></div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={`${styles.shell} ${styles.split}`}>
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>CONSENT AND STATUS</p>
            <h2>Registrarse no significa ser invitado.</h2>
            <p className={styles.sectionLead}>El sistema conserva la versión del consentimiento y distingue estados operativos. Esto permite saber si una persona únicamente se registró, está siendo revisada, fue preseleccionada, está lista para una eventual invitación o ya fue contactada.</p>
          </div>
          <div className={styles.steps}>
            <div className={styles.step}><span className={styles.stepNumber}>1</span><div><h3>Consentimiento explícito</h3><p>El formulario exige confirmar mayoría de edad y tratamiento para las preferencias seleccionadas.</p></div></div>
            <div className={styles.step}><span className={styles.stepNumber}>2</span><div><h3>Historial operativo</h3><p>Los cambios de estado se registran para evitar que selección, preparación de invitación y contacto se confundan entre sí.</p></div></div>
            <div className={styles.step}><span className={styles.stepNumber}>3</span><div><h3>Retiro</h3><p>El perfil puede pasar a estado retirado. Para solicitarlo, escribe desde el correo registrado a direccion@ctgone.com.</p></div></div>
          </div>
        </div>
      </section>
      <PortalFooter />
    </main>
  );
}
