import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Cloud,
  Compass,
  Database,
  Gamepad2,
  MapPinned,
  Radio,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRound,
} from 'lucide-react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { adventures, type WorldMakersAdventure } from '../portal-data';
import { worldMakersVisuals } from '../visual-assets';
import styles from './account.module.css';
import hubStyles from './player-hub.module.css';

export const metadata: Metadata = {
  title: 'Player Hub | World Makers',
  description: 'Tu base de operaciones personal en World Makers.',
  title: 'Game Hub | World Makers',
  description: 'Tu centro personal de partidas, progreso y aventuras en World Makers.',
  robots: { index: false, follow: false },
};

const SIGN_IN_URL = 'https://ctgone.com/iniciar-sesion?next=/worldmakers/account';
const CTG_ONE_DASHBOARD_URL = 'https://ctgone.com/dashboard';

function publicAdventureStatus(status: WorldMakersAdventure['status']) {
  return status === 'Vertical slice' ? 'Aventura de referencia' : 'En diseño';
}

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

  const accountSteps = [
    {
      label: 'Identidad CTG One',
      detail: 'Tu sesión está conectada a una identidad válida.',
      complete: true,
    },
    {
      label: 'Correo verificado',
      detail: emailVerified ? 'Tu correo ya fue confirmado.' : 'Confirma tu correo para fortalecer la seguridad de la cuenta.',
      complete: emailVerified,
    },
  ];
  const completedAccountSteps = accountSteps.filter((step) => step.complete).length;
  const readinessPercent = Math.round((completedAccountSteps / accountSteps.length) * 100);

  const featuredAdventure = adventures[0]!;
  const adventureShelf = adventures.slice(1, 5);

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
            <small>Player Hub</small>
            <small>Game Hub</small>
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
            <p>Tu Player Hub reúne tu identidad, las aventuras del universo y, cuando exista una versión jugable conectada, también tus partidas y descubrimientos.</p>
            <p>Tu Game Hub reúne identidad, aventuras y el futuro progreso de juego en un mismo lugar. Sólo mostramos datos que ya están realmente sincronizados.</p>
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

        <section className={styles.syncStrip} aria-label="Estado de sincronización">
          <div className={styles.syncItem}>
            <span className={styles.syncIconActive}><UserRound size={18} aria-hidden="true" /></span>
            <div><small>Identidad</small><strong>CTG One conectada</strong></div>
            <span className={styles.liveDot} aria-hidden="true" />
          </div>
          <div className={styles.syncItem}>
            <span className={styles.syncIconPending}><Radio size={18} aria-hidden="true" /></span>
            <div><small>Runtime del juego</small><strong>Aún no sincronizado</strong></div>
            <span className={styles.pendingPill}>Pendiente</span>
          </div>
          <div className={styles.syncItem}>
            <span className={styles.syncIconPending}><Cloud size={18} aria-hidden="true" /></span>
            <div><small>Guardado en la nube</small><strong>Sin partidas conectadas</strong></div>
            <span className={styles.pendingPill}>0 partidas</span>
          </div>
        </section>

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
                <span>{publicAdventureStatus(featuredAdventure.status)}</span>
                <span>{featuredAdventure.disciplines.join(' · ')}</span>
              </div>
              <h2>{featuredAdventure.title}</h2>
              <p>Adéntrate en un ecosistema vivo, observa, experimenta y construye soluciones que transformen el entorno.</p>
              <div className={styles.actions}>
                <a className={styles.primaryButton} href={`https://worldmakers.ctgone.com/adventures/${featuredAdventure.slug}`}>
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
                <p className={styles.kicker}>Preparación del jugador</p>
                <h2>{completedAccountSteps} de {accountSteps.length} pasos listos.</h2>
                <p className={styles.kicker}>Estado del jugador</p>
                <h2>Tu perfil está preparado. El juego aún no envía progreso.</h2>
              </div>
              <span className={styles.panelIcon}><Gamepad2 size={24} aria-hidden="true" /></span>
            </div>

            <div className={hubStyles.readinessBlock}>
              <div className={hubStyles.readinessHeader}>
                <strong>Estado de la cuenta</strong>
                <span>{readinessPercent}%</span>
              </div>
              <div className={hubStyles.progressTrack} aria-label={`Preparación de cuenta ${readinessPercent}%`}>
                <span className={hubStyles.progressFill} style={{ width: `${readinessPercent}%` }} />
              </div>

              <div className={hubStyles.stepList}>
                {accountSteps.map((step) => (
                  <div className={hubStyles.step} key={step.label}>
                    <span className={step.complete ? hubStyles.stepMark : hubStyles.stepMarkPending} aria-hidden="true">
                      {step.complete ? '✓' : '·'}
                    </span>
                    <div>
                      <strong>{step.label}</strong>
                      <small>{step.detail}</small>
                    </div>
                    <span className={step.complete ? hubStyles.stepState : hubStyles.stepStatePending}>
                      {step.complete ? 'Listo' : 'Pendiente'}
                    </span>
                  </div>
                ))}
            <div className={styles.accountStatusList}>
              <div className={styles.statusRow}>
                <span className={styles.statusIcon}><ShieldCheck size={18} aria-hidden="true" /></span>
                <div><small>Cuenta</small><strong>{emailVerified ? 'Identidad verificada' : 'Verificación pendiente'}</strong></div>
                <span className={emailVerified ? styles.statusDot : styles.statusDotPending} aria-hidden="true" />
              </div>
              <div className={styles.statusRow}>
                <span className={styles.statusIcon}><Database size={18} aria-hidden="true" /></span>
                <div><small>Progreso</small><strong>Sin datos de gameplay</strong></div>
                <span className={styles.statusMuted}>0 registros</span>
              </div>
              <div className={styles.statusRow}>
                <span className={styles.statusIcon}><Trophy size={18} aria-hidden="true" /></span>
                <div><small>Logros</small><strong>Aún no sincronizados</strong></div>
                <span className={styles.statusMuted}>—</span>
              </div>
            </div>

            <a className={styles.manageAccount} href={CTG_ONE_DASHBOARD_URL}>
              Gestionar identidad y seguridad <ArrowRight size={16} aria-hidden="true" />
            </a>
          </aside>
        </div>

        <section className={hubStyles.hubSection} aria-labelledby="adventure-catalog-title">
          <div className={hubStyles.sectionHeading}>
            <div>
              <p className={styles.kicker}>Catálogo del universo</p>
              <h2 id="adventure-catalog-title">Más mundos por descubrir.</h2>
              <p>Estas aventuras provienen del catálogo real de World Makers. Su presencia aquí no significa que ya sean jugables.</p>
            </div>
            <a className={hubStyles.sectionLink} href="https://worldmakers.ctgone.com/adventures">
              Ver las {adventures.length} aventuras <ArrowRight size={15} aria-hidden="true" />
            </a>
          </div>

          <div className={hubStyles.catalogGrid}>
            {adventureShelf.map((adventure, index) => (
              <a className={hubStyles.adventureCard} href={`https://worldmakers.ctgone.com/adventures/${adventure.slug}`} key={adventure.slug}>
                <div className={hubStyles.adventureTop}>
                  <span className={hubStyles.adventureStatus}>{publicAdventureStatus(adventure.status)}</span>
                  <span className={hubStyles.adventureIndex}>{String(index + 2).padStart(2, '0')}</span>
                </div>
                <h3>{adventure.title}</h3>
                <div className={hubStyles.disciplineList}>
                  {adventure.disciplines.map((discipline) => <span key={discipline}>{discipline}</span>)}
                </div>
                <div className={hubStyles.adventureFoot}>
                  <span>Conocer aventura</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </div>
              </a>
            ))}
          </div>
        </section>

        <section className={hubStyles.hubSection} aria-labelledby="game-state-title">
          <div className={hubStyles.gameStatePanel}>
            <div className={hubStyles.gameStateIntro}>
              <div>
                <p className={styles.kicker}>Partidas y progreso</p>
                <h2 id="game-state-title">Tu historia todavía no ha comenzado aquí.</h2>
              </div>
              <p>World Makers aún no tiene una fuente de partidas conectada a este Player Hub. Cuando una versión jugable use tu cuenta, este espacio podrá mostrar únicamente progreso real sincronizado desde el juego.</p>
            </div>

            <div className={hubStyles.stateGrid}>
              <article className={hubStyles.stateCard}>
                <strong>Partidas</strong>
                <span>Tus sesiones guardadas aparecerán cuando el juego pueda vincularlas a esta cuenta.</span>
                <span className={hubStyles.emptyPill}>Sin datos todavía</span>
              </article>
              <article className={hubStyles.stateCard}>
                <strong>Misiones</strong>
                <span>Los objetivos y avances se mostrarán sólo cuando provengan de una experiencia jugable real.</span>
                <span className={hubStyles.emptyPill}>Sin datos todavía</span>
              </article>
              <article className={hubStyles.stateCard}>
                <strong>Descubrimientos</strong>
                <span>Hallazgos, experimentos y logros se sincronizarán cuando exista esa conexión.</span>
                <span className={hubStyles.emptyPill}>Sin datos todavía</span>
              </article>
            </div>

            <p className={hubStyles.dataTruth}>Este panel no genera XP, niveles, partidas ni estadísticas simuladas. La interfaz queda preparada para recibir datos del juego cuando exista una fuente verificable.</p>
        <section className={styles.gameDataSection} aria-labelledby="game-data-title">
          <div className={styles.sectionTitleRow}>
            <div>
              <p className={styles.kicker}>Game Hub</p>
              <h2 id="game-data-title">Tu actividad de juego</h2>
              <p>Estas áreas ya están estructuradas para recibir datos del cliente de juego cuando la sincronización esté habilitada.</p>
            </div>
          </div>

          <div className={styles.gameDataGrid}>
            <article className={styles.dataCard}>
              <span className={styles.dataIcon}><Gamepad2 size={24} aria-hidden="true" /></span>
              <div className={styles.dataCardHeader}><small>Partidas</small><strong>0</strong></div>
              <h3>No hay partidas sincronizadas.</h3>
              <p>Cuando World Makers publique guardados verificables, aparecerán aquí tus partidas y la opción de continuar.</p>
              <span className={styles.emptyState}>Esperando conexión del runtime</span>
            </article>

            <article className={styles.dataCard}>
              <span className={styles.dataIcon}><MapPinned size={24} aria-hidden="true" /></span>
              <div className={styles.dataCardHeader}><small>Misiones</small><strong>0</strong></div>
              <h3>Sin misiones activas todavía.</h3>
              <p>El Game Hub mostrará únicamente misiones emitidas por el juego y su progreso real, no tareas simuladas.</p>
              <span className={styles.emptyState}>Sin datos recibidos</span>
            </article>

            <article className={styles.dataCard}>
              <span className={styles.dataIcon}><Sparkles size={24} aria-hidden="true" /></span>
              <div className={styles.dataCardHeader}><small>Descubrimientos</small><strong>0</strong></div>
              <h3>Tu colección empezará con el juego.</h3>
              <p>Especies, materiales, lugares y hallazgos aparecerán aquí cuando hayan sido descubiertos dentro de una partida.</p>
              <span className={styles.emptyState}>Colección aún vacía</span>
            </article>
          </div>
        </section>

        <section className={styles.quickSection} aria-labelledby="quick-actions-title">
          <div className={styles.sectionTitleRow}>
            <div>
              <p className={styles.kicker}>Mientras tanto</p>
              <h2 id="quick-actions-title">Explora el universo</h2>
            </div>
          </div>

          <div className={styles.quickGrid}>
            <a className={styles.actionCard} href="https://worldmakers.ctgone.com/adventures">
              <span className={styles.actionIcon}><Compass size={23} aria-hidden="true" /></span>
              <div><strong>Descubrir aventuras</strong><span>Conoce los mundos y experiencias del universo World Makers.</span></div>
              <ArrowRight size={18} aria-hidden="true" />
            </a>
            <a className={styles.actionCard} href="https://worldmakers.ctgone.com/community">
              <span className={styles.actionIcon}><Sparkles size={23} aria-hidden="true" /></span>
              <div><strong>Entrar a la comunidad</strong><span>Novedades, participación y futuras oportunidades para jugadores.</span></div>
              <ArrowRight size={18} aria-hidden="true" />
            </a>
            <a className={styles.actionCard} href="https://worldmakers.ctgone.com/educators">
              <span className={styles.actionIcon}><BookOpen size={23} aria-hidden="true" /></span>
              <div><strong>Aprender jugando</strong><span>Descubre cómo la ciencia y el aprendizaje se integran al gameplay.</span></div>
              <ArrowRight size={18} aria-hidden="true" />
            </a>
          </div>
        </section>

        <p className={styles.truthNote}>
          Crear una cuenta no implica acceso inmediato a una beta jugable. Tu cuenta ya está vinculada al ecosistema CTG One y este Player Hub incorporará partidas, progreso, descubrimientos y logros únicamente cuando esas funciones estén disponibles y conectadas a una fuente real del juego.
          Crear una cuenta no implica acceso inmediato a una beta jugable. Tu identidad ya está vinculada a CTG One; partidas, misiones, descubrimientos y logros aparecerán sólo cuando el cliente de World Makers los sincronice de forma verificable.
        </p>
      </section>
    </main>
  );
}
