import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Bell, CalendarDays, CheckCheck, PawPrint, ShieldCheck, WalletCards } from 'lucide-react';
import { fetchNvetNotifications } from '@/lib/nvetcareapp/notifications';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { fetchNvetCurrentUser } from '@/lib/nvetcareapp/user';
import { NotificationInbox } from './notification-inbox';

export default async function NvetNotificationsPage() {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) {
    redirect('/nvetcareapp/iniciar-sesion?next=/nvetcareapp/dashboard/notificaciones');
  }

  const userResult = await fetchNvetCurrentUser(accessToken);
  if (!userResult.ok && userResult.status === 401) {
    redirect('/nvetcareapp/iniciar-sesion?next=/nvetcareapp/dashboard/notificaciones');
  }
  if (!userResult.ok) redirect('/nvetcareapp/dashboard');
  if (userResult.user.isVetTesterMode) redirect('/nvetcareapp/dashboard/vet-tester');
  if (userResult.user.role !== 'CLIENT' && userResult.user.role !== 'VET') {
    redirect('/nvetcareapp/dashboard');
  }

  const role = userResult.user.role;
  const inboxResult = await fetchNvetNotifications(accessToken, role, 50);
  if (!inboxResult.ok && inboxResult.status === 401) {
    redirect('/nvetcareapp/iniciar-sesion?next=/nvetcareapp/dashboard/notificaciones');
  }

  const items = inboxResult.ok ? inboxResult.data.items : [];
  const preventive = items.filter((item) => item.category === 'PREVENTIVE').length;
  const appointments = items.filter((item) => item.category === 'APPOINTMENT').length;
  const payments = items.filter((item) => item.category === 'PAYMENT').length;
  const isVet = role === 'VET';

  return (
    <main className="min-h-screen bg-[#F2F4F7] px-4 py-8 pb-28 sm:px-6 sm:py-10 lg:px-8 lg:pb-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-7">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#34B27A]">
            Nvet Care · Notification OS
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#0D1B2A] sm:text-3xl">
            Notificaciones
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5B6670]">
            {isVet
              ? 'Centraliza solicitudes asignadas, cambios operativos de citas y eventos verificables de pagos asociados a tu actividad profesional.'
              : 'Centraliza cambios reales de tus citas, pagos y alertas preventivas derivadas de las fechas registradas para tus mascotas.'}
          </p>
        </div>

        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <article className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-5">
            <Bell className="h-5 w-5 text-[#237754]" aria-hidden="true" />
            <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-[#5B6670]">Sin leer</p>
            <p className="mt-1 text-2xl font-bold text-[#0D1B2A]">{inboxResult.ok ? inboxResult.data.summary.unread : '—'}</p>
          </article>
          <article className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-5">
            <CheckCheck className="h-5 w-5 text-[#237754]" aria-hidden="true" />
            <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-[#5B6670]">Total</p>
            <p className="mt-1 text-2xl font-bold text-[#0D1B2A]">{inboxResult.ok ? inboxResult.data.summary.total : '—'}</p>
          </article>
          <article className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-5">
            <CalendarDays className="h-5 w-5 text-[#237754]" aria-hidden="true" />
            <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-[#5B6670]">Citas</p>
            <p className="mt-1 text-2xl font-bold text-[#0D1B2A]">{inboxResult.ok ? appointments : '—'}</p>
          </article>
          <article className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-5">
            <WalletCards className="h-5 w-5 text-[#237754]" aria-hidden="true" />
            <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-[#5B6670]">Pagos</p>
            <p className="mt-1 text-2xl font-bold text-[#0D1B2A]">{inboxResult.ok ? payments : '—'}</p>
          </article>
          <article className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-5">
            <PawPrint className="h-5 w-5 text-[#237754]" aria-hidden="true" />
            <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-[#5B6670]">Prevención</p>
            <p className="mt-1 text-2xl font-bold text-[#0D1B2A]">{inboxResult.ok ? preventive : '—'}</p>
          </article>
        </section>

        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[#34B27A]/20 bg-[#34B27A]/[0.06] p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#237754]" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-[#0D1B2A]">Eventos persistentes y vinculados a tu identidad</p>
            <p className="mt-1 text-xs leading-5 text-[#5B6670]">
              El inbox se deriva del ciclo operativo real y conserva el estado de lectura. Los enlaces se filtran por tu rol efectivo antes de renderizarse; Vet Tester no consume este canal productivo.
            </p>
          </div>
        </div>

        {!inboxResult.ok ? (
          <section className="rounded-3xl border border-[#0D1B2A]/10 bg-white p-8 text-center">
            <Bell className="mx-auto h-7 w-7 text-[#5B6670]" aria-hidden="true" />
            <h2 className="mt-3 text-base font-bold text-[#0D1B2A]">No pudimos sincronizar tus notificaciones</h2>
            <p className="mt-2 text-sm leading-6 text-[#5B6670]">
              El servicio está temporalmente no disponible. No sustituimos eventos reales por avisos simulados.
            </p>
          </section>
        ) : (
          <NotificationInbox initialItems={items} />
        )}
      </div>
    </main>
  );
}
