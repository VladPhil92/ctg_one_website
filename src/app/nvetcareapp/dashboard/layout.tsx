import Link from 'next/link';
import { cookies } from 'next/headers';
import { Bell, CalendarPlus, LayoutDashboard, ReceiptText, Stethoscope } from 'lucide-react';
import { fetchNvetUnreadNotificationCount } from '@/lib/nvetcareapp/notifications';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { fetchNvetCurrentUser, type NvetUserRole } from '@/lib/nvetcareapp/user';

export default async function NvetDashboardLayout({ children }: { children: React.ReactNode }) {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  let role: NvetUserRole | null = null;
  let unread: number | null = null;

  if (accessToken) {
    const userResult = await fetchNvetCurrentUser(accessToken);
    if (userResult.ok) {
      role = userResult.user.role;
      if (!userResult.user.isVetTesterMode && (role === 'CLIENT' || role === 'VET')) {
        const countResult = await fetchNvetUnreadNotificationCount(accessToken);
        if (countResult.ok) unread = countResult.data.unread;
      }
    }
  }

  const hasInbox = role === 'CLIENT' || role === 'VET';

  return (
    <>
      {children}
      {hasInbox && (
        <Link
          href="/nvetcareapp/dashboard/notificaciones"
          aria-label={unread && unread > 0 ? `Notificaciones: ${unread} sin leer` : 'Notificaciones'}
          className="fixed bottom-5 left-5 z-40 inline-flex h-12 min-w-12 items-center justify-center gap-2 rounded-full border border-[#0D1B2A]/10 bg-white px-3 text-[#0D1B2A] shadow-lg transition hover:border-[#34B27A]/30 hover:text-[#289463] focus:outline-none focus:ring-2 focus:ring-[#34B27A] focus:ring-offset-2"
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {unread !== null && unread > 0 && (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#34B27A] px-1.5 py-0.5 text-[10px] font-bold text-white">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Link>
      )}
      {role === 'CLIENT' && (
        <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2 sm:flex-row lg:hidden">
          <Link
            href="/nvetcareapp/dashboard/citas"
            className="inline-flex items-center gap-2 rounded-full border border-[#0D1B2A]/10 bg-white px-4 py-3 text-sm font-semibold text-[#0D1B2A] shadow-lg transition hover:border-[#34B27A]/30 hover:text-[#289463] focus:outline-none focus:ring-2 focus:ring-[#34B27A] focus:ring-offset-2"
          >
            <ReceiptText className="h-4 w-4" aria-hidden="true" />
            Citas
          </Link>
          <Link
            href="/nvetcareapp/dashboard/reservar"
            className="inline-flex items-center gap-2 rounded-full bg-[#34B27A] px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#289463] focus:outline-none focus:ring-2 focus:ring-[#34B27A] focus:ring-offset-2"
          >
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            Solicitar atención
          </Link>
        </div>
      )}
      {role === 'VET' && (
        <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2 sm:flex-row">
          <Link
            href="/nvetcareapp/dashboard/veterinario"
            className="inline-flex items-center gap-2 rounded-full border border-[#0D1B2A]/10 bg-white px-4 py-3 text-sm font-semibold text-[#0D1B2A] shadow-lg transition hover:border-[#34B27A]/30 hover:text-[#289463] focus:outline-none focus:ring-2 focus:ring-[#34B27A] focus:ring-offset-2"
          >
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
            Workspace
          </Link>
          <Link
            href="/nvetcareapp/dashboard/servicios"
            className="inline-flex items-center gap-2 rounded-full bg-[#34B27A] px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#289463] focus:outline-none focus:ring-2 focus:ring-[#34B27A] focus:ring-offset-2"
          >
            <Stethoscope className="h-4 w-4" aria-hidden="true" />
            Operar servicios
          </Link>
        </div>
      )}
    </>
  );
}
