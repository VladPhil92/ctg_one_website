import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { CalendarDays, MessageCircle, PawPrint } from 'lucide-react';
import { fetchNvetChatMessages, fetchNvetChatMetadata } from '@/lib/nvetcareapp/chat';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { fetchNvetCurrentUser } from '@/lib/nvetcareapp/user';
import { ClientChatConversation } from './client-chat-conversation';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value));
}

export default async function NvetAppointmentConversationPage({ params }: { params: Promise<{ appointmentId: string }> }) {
  const { appointmentId } = await params;
  if (!UUID.test(appointmentId)) notFound();

  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) redirect(`/nvetcareapp/iniciar-sesion?next=/nvetcareapp/dashboard/mensajes/${appointmentId}`);

  const userResult = await fetchNvetCurrentUser(accessToken);
  if (!userResult.ok && userResult.status === 401) {
    redirect(`/nvetcareapp/iniciar-sesion?next=/nvetcareapp/dashboard/mensajes/${appointmentId}`);
  }
  if (!userResult.ok || userResult.user.role !== 'CLIENT') redirect('/nvetcareapp/dashboard');

  const [metadataResult, messagesResult] = await Promise.all([
    fetchNvetChatMetadata(accessToken, appointmentId),
    fetchNvetChatMessages(accessToken, appointmentId),
  ]);

  if ((!metadataResult.ok && metadataResult.status === 404) || (!messagesResult.ok && messagesResult.status === 404)) notFound();
  if (!metadataResult.ok || !messagesResult.ok) {
    return (
      <main className="min-h-screen bg-[#F2F4F7] px-4 py-10 sm:px-8">
        <div className="mx-auto max-w-4xl rounded-3xl border border-[#0D1B2A]/10 bg-white p-8 text-center">
          <MessageCircle className="mx-auto h-7 w-7 text-[#5B6670]" aria-hidden="true" />
          <h1 className="mt-3 text-lg font-bold text-[#0D1B2A]">No pudimos abrir esta conversación</h1>
          <p className="mt-2 text-sm text-[#5B6670]">La conversación solo está disponible para participantes autorizados de la cita.</p>
          <Link href="/nvetcareapp/dashboard/mensajes" className="mt-5 inline-flex rounded-xl bg-[#0D1B2A] px-4 py-2.5 text-xs font-bold text-white">Volver a mensajes</Link>
        </div>
      </main>
    );
  }

  const metadata = metadataResult.data;
  const vet = metadata.participants.find((participant) => participant.role === 'VET');
  const vetName = [vet?.firstName, vet?.lastName].filter(Boolean).join(' ').trim() || 'Veterinario Nvet Care';

  return (
    <main className="min-h-screen bg-[#F2F4F7] px-4 py-8 pb-28 sm:px-6 sm:py-10 lg:px-8 lg:pb-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link href="/nvetcareapp/dashboard/mensajes" className="text-xs font-bold text-[#237754] hover:underline">← Todas las conversaciones</Link>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#34B27A]">Nvet Care · Cita {metadata.appointment.status === 'IN_PROGRESS' ? 'en curso' : 'confirmada'}</p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#0D1B2A]">{vetName}</h1>
              <p className="mt-1 text-sm text-[#5B6670]">{metadata.appointment.serviceType}</p>
            </div>
            <span className="rounded-full border border-[#34B27A]/25 bg-[#34B27A]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#237754]">
              {metadata.appointment.status === 'IN_PROGRESS' ? 'En curso' : 'Confirmada'}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#5B6670]">
            <span className="inline-flex items-center gap-2"><PawPrint className="h-4 w-4 text-[#237754]" aria-hidden="true" />{metadata.appointment.pet.name}</span>
            <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#237754]" aria-hidden="true" />{formatDate(metadata.appointment.date)} · {metadata.appointment.time}</span>
          </div>
        </div>

        <ClientChatConversation
          appointmentId={appointmentId}
          currentUserId={userResult.user.id}
          initialMessages={messagesResult.data}
          initialWritable={metadata.appointment.chatWritable}
        />
      </div>
    </main>
  );
}
