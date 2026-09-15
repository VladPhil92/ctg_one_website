'use client';

import { LogIn, UserPlus } from 'lucide-react';
import { usePathname } from 'next/navigation';
import styles from './player-access.module.css';

const SIGN_IN_URL = 'https://ctgone.com/iniciar-sesion?next=%2Fworldmakers%2Fdashboard';
const CREATE_ACCOUNT_URL = 'https://ctgone.com/registro?next=%2Fworldmakers%2Fdashboard';

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
      <a className={styles.signIn} href={SIGN_IN_URL}>
        <LogIn size={16} aria-hidden="true" />
        <span>Iniciar sesión</span>
      </a>
      <a className={styles.create} href={CREATE_ACCOUNT_URL}>
        <UserPlus size={16} aria-hidden="true" />
        <span>Crear cuenta</span>
      </a>
    </aside>
  );
}
