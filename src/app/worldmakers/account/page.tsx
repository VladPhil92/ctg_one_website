import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Compass,
  Gamepad2,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { worldMakersVisuals } from '../visual-assets';
import styles from './account.module.css';

export const metadata: Metadata = {
  title: 'Mi cuenta | World Makers',
  description: 'Centro personal de World Makers conectado a tu identidad CTG One.',
  robots: { index: false, follow: false },
};

const SIGN_IN_URL = 'https://ctgone.com/iniciar-sesion?next=/worldmakers/account';

export default async function WorldMakersAccountPage() {
  if (!isSupabaseConfigured) {
    redirect(SIGN_IN_URL);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(SIGN_IN_URL);
  }

  const displayName =
    typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : 'Maker';

  const emailVerified = Boolean(user.email_confirmed_at);

  return (
    <main className={styles.page}>
      <div className={styles.backdrop} aria-hidden="true">
        <img
          src={worldMakersVisuals.hero.src}
          alt=""
          width={worldMakersVisuals.hero.width}
          height={worldMakersVisuals.hero.height}
        />
        <span className={styles.veil} />
      </div>

      <header className={styles.header}>
        <a className={styles.brand} href="https://worldmakers.ctgone.com" aria-label="Volver a World Makers">
          <img
            src={worldMakersVisuals.logo.src}
            alt="World Makers"
            width={worldMakersVisuals.logo.width}
            height={worldMakersVisuals.logo.height}
          />
          <span>
            <strong>World Makers</strong>
            <small>Cuenta de jugador</small>
          </span>
        </a>
        <a className={styles.backLink} href="https://worldmakers.ctgone.com">
          <ArrowLeft size={16} aria-hidden="true" /> Volver al universo
        </a>
      </header>

      <section className={styles.shell}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Player account · CTG One identity</p>
          <h1>Hola, {displayName}.</h1>
          <p>
            Tu identidad CTG One es la puerta de entrada a World Makers. Este espacio reúne tu acceso al universo del juego sin duplicar cuentas ni credenciales.
          </p>
        </div>

        <div className={styles.statusGrid}>
          <article className={styles.statusCard}>
            <span className={styles.statusIcon}><UserRound size={22} aria-hidden="true" /></span>
            <div>
              <small>Identidad</small>
              <h2>Cuenta CTG One conectada</h2>
              <p>{user.email ?? 'Correo asociado a tu identidad CTG One'}</p>
            </div>
          </article>

          <article className={styles.statusCard}>
            <span className={styles.statusIcon}><ShieldCheck size={22} aria-hidden="true" /></span>
            <div>
              <small>Seguridad</small>
              <h2>{emailVerified ? 'Correo verificado' : 'Verificación pendiente'}</h2>
              <p>La misma identidad segura podrá acompañar tu progreso cuando las funciones de jugador estén habilitadas.</p>
            </div>
          </article>

          <article className={styles.statusCard}>
            <span className={styles.statusIcon}><Gamepad2 size={22} aria-hidden="true" /></span>
            <div>
              <small>World Makers</small>
              <h2>Perfil de jugador preparado</h2>
              <p>Progreso, mundos, descubrimientos y logros se integrarán aquí a medida que esas funciones estén disponibles.</p>
            </div>
          </article>
        </div>

        <div className={styles.dashboardGrid}>
          <article className={styles.primaryPanel}>
            <div className={styles.panelIcon}><Compass size={28} aria-hidden="true" /></div>
            <p className={styles.kicker}>Tu próximo paso</p>
            <h2>Empieza por conocer el universo.</h2>
            <p>
              Explora las aventuras y mundos anunciados, entiende cómo se juega y acompaña el desarrollo desde una cuenta que ya está lista para futuras funciones de jugador.
            </p>
            <div className={styles.actions}>
              <a className={styles.primaryButton} href="https://worldmakers.ctgone.com/adventures">
                Explorar aventuras <ArrowRight size={17} aria-hidden="true" />
              </a>
              <a className={styles.secondaryButton} href="https://worldmakers.ctgone.com/how-to-play">
                Cómo se juega
              </a>
            </div>
          </article>

          <div className={styles.sidePanels}>
            <a className={styles.actionCard} href="https://worldmakers.ctgone.com/community">
              <Sparkles size={22} aria-hidden="true" />
              <div>
                <strong>Comunidad</strong>
                <span>Recibe novedades y participa en futuras oportunidades.</span>
              </div>
              <ArrowRight size={17} aria-hidden="true" />
            </a>
            <a className={styles.actionCard} href="https://worldmakers.ctgone.com/educators">
              <BookOpen size={22} aria-hidden="true" />
              <div>
                <strong>Para educadores</strong>
                <span>Conoce cómo el aprendizaje vive dentro del gameplay.</span>
              </div>
              <ArrowRight size={17} aria-hidden="true" />
            </a>
            <Link className={styles.actionCard} href="/dashboard">
              <UserRound size={22} aria-hidden="true" />
              <div>
                <strong>Mi CTG One</strong>
                <span>Gestiona tu identidad, seguridad y demás servicios de tu cuenta.</span>
              </div>
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>

        <p className={styles.truthNote}>
          Crear una cuenta no implica acceso inmediato a una beta jugable. Las funciones de jugador se habilitarán únicamente cuando estén disponibles y verificadas para uso público.
        </p>
      </section>
    </main>
  );
}
