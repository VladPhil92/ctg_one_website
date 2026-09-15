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
import {
  isWorldMakersPlayerStateBridgeConfigured,
  readWorldMakersPlayerState,
  type WorldMakersRemotePlayerState,
} from '@/lib/worldmakers/player-state-bridge';
import { worldMakersVisuals } from '../visual-assets';
import styles from './account.module.css';

export const metadata: Metadata = {
  title: 'Game Hub | World Makers',
  description: 'Tu centro personal de partidas, progreso y aventuras en World Makers.',
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

  let remoteState: WorldMakersRemotePlayerState | null = null;
  if (isWorldMakersPlayerStateBridgeConfigured) {
    try {
      remoteState = await readWorldMakersPlayerState(user.id);
    } catch {
      // The Game Hub remains truthful and usable when the dedicated game-state
      // store is temporarily unavailable. Never substitute synthetic progress.
      remoteState = null;
    }
  }

  const cloudConnected = remoteState !== null;
  const runtimeSynced = Boolean(remoteState?.exists);
  const saveCount = remoteState?.saves.length ?? 0;
  const missionCount = remoteState?.missions.length ?? 0;
  const discoveryCount = remoteState?.discoveries.length ?? 0;
  const achievementCount = remoteState?.achievements.length ?? 0;
  const totalGameplayRecords = saveCount + missionCount + discoveryCount + achievementCount;

  const runtimeLabel = runtimeSynced
    ? 'Sincronizado'
    : cloudConnected
      ? 'Esperando primera sincronización'
      : 'Temporalmente no disponible';
  const cloudLabel = cloudConnected
    ? saveCount > 0
      ? `${saveCount} ${saveCount === 1 ? 'partida sincronizada' : 'partidas sincronizadas'}`
      : 'Nube conectada · sin partidas'
    : 'Servicio temporalmente no disponible';

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
            <p>Tu Game Hub reúne identidad, aventuras y progreso de juego en un mismo lugar. Sólo mostramos datos que están realmente sincronizados.</p>
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
            <span className={runtimeSynced ? styles.syncIconActive : styles.syncIconPending}><Radio size={18} aria-hidden="true" /></span>
            <div><small>Runtime del juego</small><strong>{runtimeLabel}</strong></div>
            <span className={runtimeSynced ? styles.liveDot : styles.pendingPill}>{runtimeSynced ? '' : 'Pendiente'}</span>
          </div>
          <div className={styles.syncItem}>
            <span className={cloudConnected ? styles.syncIconActive : styles.syncIconPending}><Cloud size={18} aria-hidden="true" /></span>
            <div><small>Guardado en la nube</small><strong>{cloudLabel}</strong></div>
            {cloudConnected ? <span className={styles.liveDot} aria-hidden="true" /> : <span className={styles.pendingPill}>Sin conexión</span>}
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
                <p className={styles.kicker}>Estado del jugador</p>
                <h2>{runtimeSynced ? 'Tu progreso sincronizado está disponible.' : 'Tu perfil está preparado. El juego aún no envía progreso.'}</h2>
              </div>
              <span className={styles.panelIcon}><Gamepad2 size={24} aria-hidden="true" /></span>
            </div>

            <div className={styles.accountStatusList}>
              <div className={styles.statusRow}>
                <span className={styles.statusIcon}><ShieldCheck size={18} aria-hidden="true" /></span>
                <div><small>Cuenta</small><strong>{emailVerified ? 'Identidad verificada' : 'Verificación pendiente'}</strong></div>
                <span className={emailVerified ? styles.statusDot : styles.statusDotPending} aria-hidden="true" />
              </div>
              <div className={styles.statusRow}>
                <span className={styles.statusIcon}><Database size={18} aria-hidden="true" /></span>
                <div><small>Progreso</small><strong>{runtimeSynced ? 'Datos de gameplay sincronizados' : 'Sin datos de gameplay'}</strong></div>
                <span className={styles.statusMuted}>{totalGameplayRecords} registros</span>
              </div>
              <div className={styles.statusRow}>
                <span className={styles.statusIcon}><Trophy size={18} aria-hidden="true" /></span>
                <div><small>Logros</small><strong>{achievementCount > 0 ? 'Sincronizados' : 'Aún no sincronizados'}</strong></div>
                <span className={styles.statusMuted}>{achievementCount}</span>
              </div>
            </div>

            <a className={styles.manageAccount} href={CTG_ONE_DASHBOARD_URL}>
              Gestionar identidad y seguridad <ArrowRight size={16} aria-hidden="true" />
            </a>
          </aside>
        </div>

        <section className={styles.gameDataSection} aria-labelledby="game-data-title">
          <div className={styles.sectionTitleRow}>
            <div>
              <p className={styles.kicker}>Game Hub</p>
              <h2 id="game-data-title">Tu actividad de juego</h2>
              <p>Esta información proviene del estado sincronizado por el cliente de juego. Si todavía no has jugado una versión conectada, verás estados vacíos reales.</p>
            </div>
          </div>

          <div className={styles.gameDataGrid}>
            <article className={styles.dataCard}>
              <span className={styles.dataIcon}><Gamepad2 size={24} aria-hidden="true" /></span>
              <div className={styles.dataCardHeader}><small>Partidas</small><strong>{saveCount}</strong></div>
              <h3>{saveCount > 0 ? 'Tus partidas están sincronizadas.' : 'No hay partidas sincronizadas.'}</h3>
              <p>{saveCount > 0 ? 'El Game Hub ya recibió estados de partida verificables desde World Makers.' : 'Cuando World Makers publique guardados verificables, aparecerán aquí tus partidas y la opción de continuar.'}</p>
              <span className={styles.emptyState}>{saveCount > 0 ? `${saveCount} en la nube` : 'Esperando conexión del runtime'}</span>
            </article>

            <article className={styles.dataCard}>
              <span className={styles.dataIcon}><MapPinned size={24} aria-hidden="true" /></span>
              <div className={styles.dataCardHeader}><small>Misiones</small><strong>{missionCount}</strong></div>
              <h3>{missionCount > 0 ? 'Tienes misiones sincronizadas.' : 'Sin misiones activas todavía.'}</h3>
              <p>El Game Hub muestra únicamente misiones emitidas por el juego y su progreso real, nunca tareas simuladas.</p>
              <span className={styles.emptyState}>{missionCount > 0 ? `${missionCount} registros recibidos` : 'Sin datos recibidos'}</span>
            </article>

            <article className={styles.dataCard}>
              <span className={styles.dataIcon}><Sparkles size={24} aria-hidden="true" /></span>
              <div className={styles.dataCardHeader}><small>Descubrimientos</small><strong>{discoveryCount}</strong></div>
              <h3>{discoveryCount > 0 ? 'Tu colección ya está creciendo.' : 'Tu colección empezará con el juego.'}</h3>
              <p>Especies, materiales, lugares y hallazgos aparecerán aquí sólo cuando hayan sido descubiertos dentro de una partida.</p>
              <span className={styles.emptyState}>{discoveryCount > 0 ? `${discoveryCount} descubrimientos` : 'Colección aún vacía'}</span>
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
          Crear una cuenta no implica acceso inmediato a una beta jugable. Tu identidad ya está vinculada a CTG One; partidas, misiones, descubrimientos y logros aparecen sólo cuando el cliente de World Makers los sincroniza de forma verificable.
        </p>
      </section>
    </main>
  );
}
