'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  CalendarDays,
  FileClock,
  Home,
  MessageCircle,
  PawPrint,
  Stethoscope,
  UserRound,
  WalletCards,
} from 'lucide-react';
import { LogoutButton } from './logout-button';

type NavItem = {
  label: string;
  icon: LucideIcon;
  href?: string;
  badge?: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Inicio', icon: Home, href: '/nvetcareapp/dashboard' },
  { label: 'Mis mascotas', icon: PawPrint, href: '/nvetcareapp/dashboard/mascotas' },
  { label: 'Prevención', icon: Bell, href: '/nvetcareapp/dashboard/prevencion' },
  { label: 'Servicios', icon: Stethoscope, badge: 'Próximamente' },
  { label: 'Citas', icon: CalendarDays, href: '/nvetcareapp/dashboard/citas' },
  { label: 'Historial', icon: FileClock, href: '/nvetcareapp/dashboard/historial' },
  { label: 'Pagos / Wallet', icon: WalletCards, href: '/dashboard/wallet' },
  { label: 'Mensajes', icon: MessageCircle, href: '/nvetcareapp/dashboard/citas', badge: 'En citas' },
  { label: 'Perfil', icon: UserRound, badge: 'Próximamente' },
];

const MOBILE_ITEMS = NAV_ITEMS.filter((item) =>
  ['Inicio', 'Mis mascotas', 'Prevención', 'Citas', 'Historial', 'Pagos / Wallet'].includes(item.label),
);

function isActivePath(pathname: string, href: string): boolean {
  if (href === '/nvetcareapp/dashboard') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, pathname, compact = false }: { item: NavItem; pathname: string; compact?: boolean }) {
  const Icon = item.icon;
  const active = item.href ? isActivePath(pathname, item.href) : false;
  const base = compact
    ? 'inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition'
    : 'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition';

  if (!item.href) {
    return (
      <div className={`${base} cursor-default text-[#5B6670]/75`} aria-disabled="true">
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {!compact && item.badge && (
          <span className="rounded-full bg-[#0D1B2A]/5 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[#5B6670]">
            {item.badge}
          </span>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      className={`${base} ${
        active
          ? compact
            ? 'border-[#34B27A]/30 bg-[#34B27A]/10 text-[#237754]'
            : 'bg-[#34B27A]/10 text-[#237754]'
          : compact
            ? 'border-[#0D1B2A]/10 bg-white text-[#0D1B2A] hover:border-[#34B27A]/30 hover:text-[#237754]'
            : 'text-[#44505B] hover:bg-[#0D1B2A]/[0.04] hover:text-[#0D1B2A]'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {!compact && item.badge && (
        <span className="rounded-full bg-[#0D1B2A]/5 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[#5B6670]">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export function ClientDashboardShell({
  children,
  userName,
  userEmail,
}: {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
}) {
  const pathname = usePathname();
  const initials = userName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U';

  return (
    <div className="min-h-screen bg-[#F2F4F7]">
      <div className="mx-auto flex min-h-screen max-w-[1536px]">
        <aside className="hidden w-[272px] shrink-0 border-r border-[#0D1B2A]/10 bg-white px-4 py-6 lg:flex lg:flex-col">
          <Link href="/nvetcareapp/dashboard" className="mb-7 flex items-center gap-3 rounded-xl px-2 py-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#34B27A]/10 text-[#237754]">
              <PawPrint className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#0D1B2A]">Nvet Care</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#34B27A]">Centro de cuidado</p>
            </div>
          </Link>

          <nav className="space-y-1" aria-label="Navegación de usuario Nvet Care">
            {NAV_ITEMS.map((item) => (
              <NavLink key={`${item.label}-${item.href ?? 'disabled'}`} item={item} pathname={pathname} />
            ))}
          </nav>

          <div className="mt-auto space-y-4 pt-8">
            <div className="rounded-2xl border border-[#34B27A]/20 bg-[#34B27A]/[0.06] p-4">
              <p className="text-xs font-bold text-[#0D1B2A]">Oferta veterinaria en expansión</p>
              <p className="mt-1 text-[11px] leading-5 text-[#5B6670]">
                Puedes registrar tus mascotas y preparar tu atención mientras incorporamos profesionales verificados.
              </p>
            </div>
            <div className="rounded-2xl border border-[#0D1B2A]/10 bg-[#F8F9FA] p-3">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0D1B2A] text-xs font-bold text-white">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-[#0D1B2A]">{userName}</p>
                  <p className="truncate text-[10px] text-[#5B6670]">{userEmail}</p>
                </div>
              </div>
              <LogoutButton />
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="sticky top-0 z-30 border-b border-[#0D1B2A]/10 bg-[#F2F4F7]/95 px-4 py-3 backdrop-blur lg:hidden">
            <div className="mb-3 flex items-center justify-between gap-3">
              <Link href="/nvetcareapp/dashboard" className="flex items-center gap-2 text-sm font-bold text-[#0D1B2A]">
                <PawPrint className="h-5 w-5 text-[#34B27A]" aria-hidden="true" />
                Nvet Care
              </Link>
              <span className="rounded-full border border-[#34B27A]/25 bg-[#34B27A]/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-[#237754]">
                Modo usuario
              </span>
            </div>
            <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Navegación móvil Nvet Care">
              {MOBILE_ITEMS.map((item) => (
                <NavLink key={`mobile-${item.label}`} item={item} pathname={pathname} compact />
              ))}
            </nav>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
