'use client';

import { Gamepad2, LogIn, UserRound, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import {
  worldMakersDashboardPath,
  worldMakersRegistrationUrl,
  worldMakersSignInUrl,
} from '@/lib/worldmakers/routes';
import styles from './player-access.module.css';

type PlayerIdentity =
  | { status: 'checking'; displayName: null }
  | { status: 'guest'; displayName: null }
  | { status: 'member'; displayName: string };

function readDisplayName(user: { user_metadata?: Record<string, unknown>; email?: string | null }) {
  const fullName = user.user_metadata?.full_name;
  if (typeof fullName === 'string' && fullName.trim()) return fullName.trim();

  const name = user.user_metadata?.name;
  if (typeof name === 'string' && name.trim()) return name.trim();

  if (user.email) return user.email.split('@')[0] || 'Maker';
  return 'Maker';
}

export function PlayerAccessDock() {
  const pathname = usePathname();
  const [identity, setIdentity] = useState<PlayerIdentity>({ status: 'checking', displayName: null });
  const isPlayerArea =
    pathname === '/worldmakers/account' ||
    pathname === '/account' ||
    pathname === '/worldmakers/dashboard' ||
    pathname === '/dashboard' ||
    pathname.startsWith('/worldmakers/dashboard/') ||
    pathname.startsWith('/dashboard/');

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIdentity({ status: 'guest', displayName: null });
      return;
    }

    let active = true;
    const supabase = createClient();

    const syncUser = (user: { user_metadata?: Record<string, unknown>; email?: string | null } | null) => {
      if (!active) return;
      setIdentity(
        user
          ? { status: 'member', displayName: readDisplayName(user) }
          : { status: 'guest', displayName: null },
      );
    };

    void supabase.auth.getUser().then(({ data }) => syncUser(data.user));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => syncUser(session?.user ?? null));

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (isPlayerArea) return null;

  if (identity.status === 'checking') {
    return (
      <aside className={styles.dock} aria-label="Acceso de jugador" data-state="checking">
        <a className={styles.hubEntry} href={worldMakersDashboardPath()}>
          <Gamepad2 size={17} aria-hidden="true" />
          <span>Game Hub</span>
        </a>
      </aside>
    );
  }

  if (identity.status === 'member') {
    return (
      <aside className={styles.dock} aria-label="Área de jugador" data-state="member">
        <a className={styles.memberHub} href={worldMakersDashboardPath()}>
          <Gamepad2 size={17} aria-hidden="true" />
          <span>Mi Game Hub</span>
        </a>
        <a className={styles.profile} href={worldMakersDashboardPath('/profile')} aria-label="Abrir perfil de jugador">
          <UserRound size={16} aria-hidden="true" />
          <span>{identity.displayName}</span>
        </a>
      </aside>
    );
  }

  return (
    <aside className={styles.dock} aria-label="Acceso de jugador" data-state="guest">
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
