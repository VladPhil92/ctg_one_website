import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { CalendarDays, MessageCircle, PawPrint, ShieldCheck } from 'lucide-react';
import { fetchNvetActiveChats } from '@/lib/nvetcareapp/chat';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { fetchNvetCurrentUser } from '@/lib/nvetcareapp/user';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

function displayName(firstName?: string | null, lastName?: string | null) {
  return [firstName, lastName].filter(Boolean).join(' ').trim() || 'Veterinario Nvet Care';
}

export default async function NvetMessagesPage() {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) redirect('/nvetcareapp/iniciar-sesion?next=/nvetcareapp/dashboard/mensajes');

  const userResult = await fetchNvetCurrentUser(accessToken);
  if (!userResult.ok && userResult.status === 401) {
    redirect('/nvetcareapp/iniciar-sesion?next=/nvetcareapp/dashboard/mensajes');
  }
  if (!userResult.ok || userResult.user.role !== 'CLIENT') redirect('/nvetcareapp/dashboard');

  const chatsResult = await fetchNvetActiveChats(accessToken);
  if (!chatsResult.ok && chatsResult.status === 401) {
    redirect('/nvetcareapp/iniciar-sesion?next=/nvetcareapp/dashboard/mensajes');
  }

  const chats = chatsResult.ok ? chatsResult.data : [];

  return (
    <main className="min-h-screen bg-[#F2F4F7] px-4 py-8 pb-28 sm:px-6 sm:py-10 lg:px-8 lg:pb-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#34B27A]">Nvet Care · Mensajería de cita</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#0D1B2A] sm:text-3xl">Mensajes</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5B6670]">
              Conversa con el profesional únicamente dentro de citas confirmadas o en curso. La conversación permanece vinculada a la cita real.
            </p>
          </div>
          <Link href="/nvetcareapp/dashboard/citas" className="rounded-xl border border-[#0D1B2A]/10 bg-white px-4 py-2.5 text-xs font-bold text-[#0D1B2A] hover:border-[#34B27A]/30 hover:text-[#237754]">
            Ver mis citas
          </Link>
        </div>

        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[#34B27A]/20 bg-[#34B27A]/[0.06] p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#237754]" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-[#0D1B2A]">Conversaciones asociadas a atención verificable</p>
            <p className="mt-1 text-xs leading-5 text-[#5B6670]">
              Nvet Care no crea chats ficticios ni conversaciones fuera del ciclo de una cita. Los mensajes quedan asociados a la cita para soporte y arbitraje.
            </p>
          </div>
        </div>

        {!chatsResult.ok ? (
          <section className="rounded-3xl border border-[#0D1B2A]/10 bg-white p-8 text-center">
            <MessageCircle className="mx-auto h-7 w-7 text-[#5B6670]" aria-hidden="true" />
            <h2 className="mt-3 text-base font-bold text-[#0D1B2A]">No pudimos sincronizar tus conversaciones</h2>
            <p className="mt-2 text-sm text-[#5B6670]">Tus citas siguen disponibles. Intenta nuevamente desde esta sección cuando el servicio se restablezca.</p>
          </section>
        ) : chats.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-[#34B27A]/30 bg-white p-10 text-center">
            <MessageCircle className="mx-auto h-7 w-7 text-[#34B27A]" aria-hidden="true" />
            <h2 className="mt-3 text-base font-bold text-[#0D1B2A]">No tienes conversaciones activas</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#5B6670]">
              El chat se habilita cuando una cita real pasa a confirmada y permanece disponible mientras está en curso.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link href="/nvetcareapp/dashboard/citas" className="rounded-xl bg-[#0D1B2A] px-4 py-2.5 text-xs font-bold text-white">Revisar mis citas</Link>
              <Link href="/nvetcareapp/dashboard/servicios" className="rounded-xl border border-[#0D1B2A]/10 px-4 py-2.5 text-xs font-bold text-[#0D1B2A]">Explorar servicios</Link>
            </div>
          </section>
        ) : (
          <section className="space-y-3" aria-label="Conversaciones activas de Nvet Care">
            {chats.map((chat) => {
              const vet = chat.participants.find((participant) => participant.role === 'VET');
              return (
                <Link
                  key={chat.appointmentId}
                  href={`/nvetcareapp/dashboard/mensajes/${encodeURIComponent(chat.appointmentId)}`}
                  className="block rounded-2xl border border-[#0D1B2A]/10 bg-white p-5 shadow-[0_1px_3px_rgba(13,27,42,0.04)] transition hover:border-[#34B27A]/30"
                >
                  <div className="flex items-start gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#34B27A]/10 text-[#237754]">
                      <MessageCircle className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="text-sm font-bold text-[#0D1B2A]">{displayName(vet?.firstName, vet?.lastName)}</h2>
                          <p className="mt-1 text-xs text-[#5B6670]">{chat.appointment.serviceType}</p>
                        </div>
                        {chat.unreadCount > 0 && (
                          <span className="rounded-full bg-[#34B27A] px-2.5 py-1 text-[10px] font-bold text-white">
                            {chat.unreadCount > 99 ? '99+' : chat.unreadCount} sin leer
                          </span>
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-[#5B6670]">
                        <span className="inline-flex items-center gap-1.5"><PawPrint className="h-3.5 w-3.5" aria-hidden="true" />{chat.appointment.pet.name}</span>
                        <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />{formatDate(chat.appointment.date)} · {chat.appointment.time}</span>
                      </div>
                      <p className="mt-3 truncate text-sm text-[#44505B]">
                        {chat.lastMessage?.content || 'Conversación disponible. Puedes enviar el primer mensaje.'}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
