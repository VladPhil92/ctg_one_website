import Link from 'next/link';
import { cookies } from 'next/headers';
import { ShieldCheck, UserRound } from 'lucide-react';
import { fetchNvetUnreadNotificationCount } from '@/lib/nvetcareapp/notifications';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { fetchNvetCurrentUser } from '@/lib/nvetcareapp/user';
import { ClientDashboardShell } from './client-dashboard-shell';
import { SuperadminRoleSwitch } from './superadmin-role-switch';

const ROOT_NAV = [
  ['/nvetcareapp/dashboard/gobernanza', 'Gobernanza'],
  ['/nvetcareapp/dashboard/usuarios', 'Usuarios'],
  ['/nvetcareapp/dashboard/veterinarios', 'Veterinarios'],
  ['/nvetcareapp/dashboard/citas-admin', 'Citas'],
  ['/nvetcareapp/dashboard/transacciones', 'Transacciones'],
  ['/nvetcareapp/dashboard/contabilidad', 'Excepciones'],
  ['/nvetcareapp/dashboard/auditoria', 'Auditoría'],
] as const;

export default async function NvetDashboardTemplate({ children }: { children: React.ReactNode }) {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  const userResult = accessToken ? await fetchNvetCurrentUser(accessToken) : null;

  if (!userResult?.ok) return children;

  const isSuperadmin = userResult.user.isSuperadmin;
  const isClientView = userResult.user.role === 'CLIENT';
  const userName = `${userResult.user.firstName} ${userResult.user.lastName}`.trim();
  const unreadResult = isClientView && accessToken
    ? await fetchNvetUnreadNotificationCount(accessToken)
    : null;
  const unreadNotifications = unreadResult?.ok ? unreadResult.data.unread : 0;
  const content = isClientView ? (
    <ClientDashboardShell
      userName={userName}
      userEmail={userResult.user.email}
      unreadNotifications={unreadNotifications}
    >
      {children}
    </ClientDashboardShell>
  ) : (
    children
  );

  if (!isSuperadmin) return content;

  const isClientMode = userResult.user.isClientMode;

  return (
    <>
      <section className="border-b border-white/10 bg-[#0D1B2A] px-4 py-4 text-white sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10">
                {isClientMode ? <UserRound className="h-5 w-5" aria-hidden="true" /> : <ShieldCheck className="h-5 w-5" aria-hidden="true" />}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">Superadmin Nvet Care</p>
                  <span className="rounded-full border border-[#34B27A]/50 bg-[#34B27A]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#8BE0B5]">Identidad raíz única</span>
                  <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/75">
                    {isClientMode ? 'Modo usuario' : 'Modo SUPERADMIN'}
                  </span>
                </div>
                <p className="mt-1 max-w-3xl text-xs leading-5 text-white/60">
                  {isClientMode
                    ? 'Operas con el alcance efectivo de un usuario normal. La identidad raíz no cambia y puedes restaurar SUPERADMIN con un clic.'
                    : 'Plano de gobierno operativo, clínico, financiero y de seguridad: gobernanza, usuarios, veterinarios, citas, transacciones, excepciones, auditoría y cambio seguro a modo usuario.'}
                </p>
              </div>
            </div>

            <SuperadminRoleSwitch currentMode={isClientMode ? 'CLIENT' : 'SUPERADMIN'} />
          </div>

          {!isClientMode && (
            <nav className="mt-4 flex gap-2 overflow-x-auto border-t border-white/10 pt-4 pb-1 text-[11px] font-semibold">
              {ROOT_NAV.map(([href, label]) => (
                <Link key={href} href={href} className="shrink-0 rounded-lg border border-white/15 px-3 py-2 text-white/80 transition hover:border-[#34B27A]/50 hover:bg-white/10 hover:text-white">{label}</Link>
              ))}
            </nav>
          )}
        </div>
      </section>
      {content}
    </>
  );
}
