'use client';

import {
  Binoculars,
  BookOpen,
  Compass,
  Gauge,
  ListChecks,
  Save,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRound,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { worldMakersVisuals } from '../visual-assets';
import { PlayerStateProvider } from './PlayerStateProvider';
import styles from './dashboard.module.css';

const WORLDMAKERS_ORIGIN = 'https://worldmakers.ctgone.com';
const PLAYER_DASHBOARD_ORIGIN = 'https://ctgone.com/worldmakers/dashboard';
const navItems = [
  { suffix: '', label: 'Inicio', icon: Gauge },
  { suffix: '/saves', label: 'Partidas', icon: Save },
  { suffix: '/missions', label: 'Misiones', icon: ListChecks },
  { suffix: '/discoveries', label: 'Hallazgos', icon: Binoculars },
  { suffix: '/achievements', label: 'Logros', icon: Trophy },
  { suffix: '/progress', label: 'Progreso', icon: Sparkles },
  { suffix: '/adventures', label: 'Aventuras', icon: Compass },
  { suffix: '/profile', label: 'Perfil', icon: UserRound },
] as const;

type Props = {
  children: ReactNode;
  displayName: string;
  email: string | null;
  emailVerified: boolean;
};

export function DashboardShell({ children, displayName, email, emailVerified }: Props) {
  const pathname = usePathname();
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'WM';

  return (
    <PlayerStateProvider>
      <div className={styles.dashboardRoot}>
        <aside className={styles.sidebar}>
          <a className={styles.brand} href={WORLDMAKERS_ORIGIN} aria-label="World Makers">
            <img
              src={worldMakersVisuals.logo.src}
              alt="World Makers"
              width={worldMakersVisuals.logo.width}
              height={worldMakersVisuals.logo.height}
            />
            <span>
              <strong>World Makers</strong>
              <small>Player Dashboard</small>
            </span>
          </a>

          <nav className={styles.nav} aria-label="Dashboard de jugador">
            {navItems.map((item) => {
              const targetPath = `/worldmakers/dashboard${item.suffix}`;
              const active = item.suffix ? pathname.endsWith(item.suffix) : pathname === '/worldmakers/dashboard';
              const Icon = item.icon;
              return (
                <a
                  key={item.suffix || 'home'}
                  href={`${PLAYER_DASHBOARD_ORIGIN}${item.suffix}`}
                  className={active ? styles.navActive : styles.navItem}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>{item.label}</span>
                  <span hidden>{targetPath}</span>
                </a>
              );
            })}
          </nav>

          <div className={styles.sidebarFooter}>
            <a href={`${WORLDMAKERS_ORIGIN}/how-to-play`} className={styles.utilityLink}>
              <BookOpen size={16} aria-hidden="true" /> Cómo se juega
            </a>
            <a href="https://ctgone.com/dashboard" className={styles.utilityLink}>
              <ShieldCheck size={16} aria-hidden="true" /> Seguridad CTG One
            </a>
          </div>
        </aside>

        <div className={styles.contentColumn}>
          <header className={styles.topbar}>
            <div>
              <span className={styles.topbarEyebrow}>Mi World Makers</span>
              <strong>{displayName}</strong>
            </div>
            <div className={styles.identityChip}>
              <span className={styles.avatar}>{initials}</span>
              <span className={styles.identityText}>
                <strong>{email ?? 'Cuenta CTG One'}</strong>
                <small>{emailVerified ? 'Identidad verificada' : 'Verificación pendiente'}</small>
              </span>
            </div>
          </header>
          <main className={styles.main}>{children}</main>
        </div>
      </div>
    </PlayerStateProvider>
  );
}
