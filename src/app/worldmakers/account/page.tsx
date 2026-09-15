import type { Metadata } from 'next';
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
  title: 'Dashboard | World Makers',
  description: 'Tu base de operaciones personal en World Makers.',
  robots: { index: false, follow: false },
};

const SIGN_IN_URL = 'https://ctgone.com/iniciar-sesion?next=/worldmakers/account';
const CTG_ONE_DASHBOARD_URL = 'https://ctgone.com/dashboard';

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
  const firstName = displayName === 'Maker' ? 'Maker' : displayName.split(/\s+/)[0];
  const initials =
    displayName === 'Maker'
      ? 'WM'
      : displayName
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part.charAt(0))
          .join('')
          .toUpperCase();
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
            <small>Dashboard de jugador</small>
          </span>
        </a>

        <nav className={styles.headerActions} aria-label="Navegación del jugador">
          <a className={styles.accountLink} href={CTG_ONE_DASHBOARD_URL}>
            <UserRound size={16} aria-hidden="true" />
            <span>Mi CTG One</span>
          </a>
          <a className={styles.backLink} href="https://worldmakers.ctgone.com">
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Volver al universo</span>
          </a>
        </nav>
      </header>

      <section className={styles.shell}>
        <div className={styles.welcomeRow}>
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>Mi World Makers</p>
            <h1>Hola, {firstName}.</h1>
            <p>Esta es tu base de operaciones para descubrir aventuras, seguir tu cuenta y entrar al universo de World Makers.</p>
          </div>

          <aside className={styles.identityCard} aria-label="Perfil del jugador">
            <div className={styles.avatar} aria-hidden="true">{initials}</div>
            <div className={styles.identityCopy}>
              <span className={styles.identityLabel}>Jugador</span>
              <strong>{displayName}</strong>
              <small>{user.email ?? 'Identidad CTG One conectada'}</small>
            </div>
            <span className={emailVerified ? styles.verifiedBadge : styles.pendingBadge}>
              <ShieldCheck size={14} aria-hidden="true" />
              {emailVerified ? 'Verificado' : 'Pendiente'}
            </span>
          </aside>
        </div>

        <div className={styles.dashboardGrid}>
          <article className={styles.featuredAdventure}>
            <img
              className={styles.featuredImage}
              src={worldMakersVisuals.gameplayOverview.src}
              alt={worldMakersVisuals.gameplayOverview.alt}
              width={worldMakersVisuals.gameplayOverview.width}
              height={worldMakersVisuals.gameplayOverview.height}
            />
            <span className={styles.featuredShade} aria-hidden="true" />
            <div className={styles.featuredContent}>
              <div className={styles.featuredMeta}>
                <span>Próxima aventura</span>
                <span>Exploración · Ciencia · Construcción</span>
              </div>
              <h2>Caribbean Rainforest</h2>
              <p>Adéntrate en un ecosistema vivo, observa, experimenta y construye soluciones que transformen el entorno.</p>
              <div className={styles.actions}>
                <a className={styles.primaryButton} href="https://worldmakers.ctgone.com/adventures">
                  Conocer la aventura <ArrowRight size={17} aria-hidden="true" />
                </a>
                <a className={styles.secondaryButton} href="https://worldmakers.ctgone.com/how-to-play">
                  Cómo se juega
                </a>
              </div>
            </div>
          </article>

          <aside className={styles.playerPanel}>
            <div className={styles.panelHeading}>
              <div>
                <p className={styles.kicker}>Tu cuenta</p>
                <h2>Todo listo para tu perfil.</h2>
              </div>
              <span className={styles.panelIcon}><Gamepad2 size={24} aria-hidden="true" /></span>
            </div>

            <div className={styles.accountStatusList}>
              <div className={styles.statusRow}>
                <span className={styles.statusIcon}><UserRound size={18} aria-hidden="true" /></span>
                <div>
                  <small>Identidad</small>
                  <strong>CTG One conectada</strong>
                </div>
                <span className={styles.statusDot} aria-hidden="true" />
              </div>
              <div className={styles.statusRow}>
                <span className={styles.statusIcon}><ShieldCheck size={18} aria-hidden="true" /></span>
                <div>
                  <small>Seguridad</small>
                  <strong>{emailVerified ? 'Correo verificado' : 'Verificación pendiente'}</strong>
                </div>
                <span className={emailVerified ? styles.statusDot : styles.statusDotPending} aria-hidden="true" />
              </div>
              <div className={styles.statusRow}>
                <span className={styles.statusIcon}><Compass size={18} aria-hidden="true" /></span>
                <div>
                  <small>Progreso</small>
                  <strong>Tus avances vivirán aquí</strong>
                </div>
                <span className={styles.statusMuted}>Próximamente</span>
              </div>
            </div>

            <a className={styles.manageAccount} href={CTG_ONE_DASHBOARD_URL}>
              Gestionar identidad y seguridad <ArrowRight size={16} aria-hidden="true" />
            </a>
          </aside>
        </div>

        <section className={styles.quickSection} aria-labelledby="quick-actions-title">
          <div className={styles.sectionTitleRow}>
            <div>
              <p className={styles.kicker}>Explora</p>
              <h2 id="quick-actions-title">¿Qué quieres hacer ahora?</h2>
            </div>
          </div>

          <div className={styles.quickGrid}>
            <a className={styles.actionCard} href="https://worldmakers.ctgone.com/adventures">
              <span className={styles.actionIcon}><Compass size={23} aria-hidden="true" /></span>
              <div>
                <strong>Descubrir aventuras</strong>
                <span>Conoce los mundos y experiencias del universo World Makers.</span>
              </div>
              <ArrowRight size={18} aria-hidden="true" />
            </a>

            <a className={styles.actionCard} href="https://worldmakers.ctgone.com/community">
              <span className={styles.actionIcon}><Sparkles size={23} aria-hidden="true" /></span>
              <div>
                <strong>Entrar a la comunidad</strong>
                <span>Novedades, participación y futuras oportunidades para jugadores.</span>
              </div>
              <ArrowRight size={18} aria-hidden="true" />
            </a>

            <a className={styles.actionCard} href="https://worldmakers.ctgone.com/educators">
              <span className={styles.actionIcon}><BookOpen size={23} aria-hidden="true" /></span>
              <div>
                <strong>Aprender jugando</strong>
                <span>Descubre cómo la ciencia y el aprendizaje se integran al gameplay.</span>
              </div>
              <ArrowRight size={18} aria-hidden="true" />
            </a>
          </div>
        </section>

        <p className={styles.truthNote}>
          Crear una cuenta no implica acceso inmediato a una beta jugable. Tu cuenta ya está vinculada al ecosistema CTG One y este dashboard irá incorporando progreso, mundos, descubrimientos y logros cuando esas funciones estén disponibles para jugadores.
        </p>
      </section>
    </main>
  );
}
