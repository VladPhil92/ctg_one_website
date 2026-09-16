'use client';

import { Gamepad2, LogIn, UserPlus } from 'lucide-react';
import { usePathname } from 'next/navigation';
import {
  worldMakersDashboardUrl,
  worldMakersRegistrationUrl,
  worldMakersSignInUrl,
} from '@/lib/worldmakers/routes';
import styles from './player-access.module.css';

export function PlayerAccessDock() {
  const pathname = usePathname();
  const isPlayerArea =
    pathname === '/worldmakers/account' ||
    pathname === '/account' ||
    pathname === '/worldmakers/dashboard' ||
    pathname === '/dashboard' ||
    pathname.startsWith('/worldmakers/dashboard/') ||
    pathname.startsWith('/dashboard/');

  if (isPlayerArea) return null;

  return (
    <aside className={styles.dock} aria-label="Acceso de jugador">
      <div className={styles.context}>
        <span>World Makers Game Hub</span>
        <small>Progreso · misiones · descubrimientos</small>
      </div>
      <a className={styles.hubEntry} href={worldMakersDashboardUrl()}>
        <Gamepad2 size={17} aria-hidden="true" />
        <span>Abrir Game Hub</span>
      </a>
      <a className={styles.signIn} href={worldMakersSignInUrl()}>
        <LogIn size={16} aria-hidden="true" />
        <span>Iniciar sesión</span>
      </a>
      <a className={styles.create} href={worldMakersRegistrationUrl()}>
        <UserPlus size={16} aria-hidden="true" />
        <span>Crear cuenta</span>
      </a>
    </aside>
  );
}
