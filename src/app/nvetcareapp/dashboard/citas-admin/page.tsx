import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import { fetchNvetGovernanceAppointments } from '@/lib/nvetcareapp/governance';
import { requireNvetSuperadmin } from '@/lib/nvetcareapp/require-superadmin';
import { LogoutButton } from '../logout-button';

const STATUSES = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DISPUTED'] as const;
const LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  IN_PROGRESS: 'En curso',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  DISPUTED: 'En disputa',
};
const TONES: Record<string, string> = {
  PENDING: 'border-[#0D1B2A]/10 bg-[#0D1B2A]/[0.03] text-[#5B6670]',
  CONFIRMED: 'border-[#34B27A]/30 bg-[#34B27A]/[0.06] text-[#289463]',
  IN_PROGRESS: 'border-[#34B27A]/30 bg-[#34B27A]/[0.06] text-[#289463]',
  COMPLETED: 'border-[#0D1B2A]/10 bg-[#0D1B2A]/[0.03] text-[#0D1B2A]',
  CANCELLED: 'border-[#0D1B2A]/10 bg-[#0D1B2A]/[0.03] text-[#5B6670]',
  DISPUTED: 'border-[#FF8A3D]/30 bg-[#FF8A3D]/[0.06] text-[#B75B1C]',
};

function person(firstName: string | null, lastName: string | null, fallback = 'Sin nombre') {
  return [firstName, lastName].filter(Boolean).join(' ').trim() || fallback;
}

export default async function AdminAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ offset?: string; status?: string }>;
}) {
  const { accessToken } = await requireNvetSuperadmin();
  const params = await searchParams;
  const rawOffset = Number(params.offset ?? 0);
  const offset = Number.isInteger(rawOffset) && rawOffset > 0 ? rawOffset : 0;
  const status = STATUSES.includes(params.status as (typeof STATUSES)[number]) ? params.status : undefined;
  const result = await fetchNvetGovernanceAppointments(accessToken, offset, status);

  return (
    <main className="min-h-screen bg-[#F2F4F7] px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/nvetcareapp/dashboard/gobernanza" className="text-xs font-semibold text-[#5B6670] hover:text-[#0D1B2A]">← Gobernanza</Link>
            <div className="mt-2 flex items-center gap-2"><CalendarDays className="h-5 w-5 text-[#34B27A]" /><h1 className="text-2xl font-bold text-[#0D1B2A]">Operación global de citas</h1></div>
            <p className="mt-1 text-sm text-[#5B6670]">Supervisión transversal de servicios, clientes, veterinarios y estado financiero asociado.</p>
          </div>
          <LogoutButton />
        </header>

        <div className="mb-5 flex flex-wrap gap-2">
          <Link href="/nvetcareapp/dashboard/citas-admin" className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${!status ? 'border-[#0D1B2A] bg-[#0D1B2A] text-white' : 'border-[#0D1B2A]/10 bg-white text-[#5B6670]'}`}>Todas</Link>
          {STATUSES.map((item) => <Link key={item} href={`/nvetcareapp/dashboard/citas-admin?status=${item}`} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${status === item ? 'border-[#0D1B2A] bg-[#0D1B2A] text-white' : 'border-[#0D1B2A]/10 bg-white text-[#5B6670]'}`}>{LABELS[item]}</Link>)}
        </div>

        {!result.ok ? (
          <div className="rounded-2xl border border-[#FF8A3D]/30 bg-white p-8 text-center text-sm text-[#0D1B2A]">No se pudo cargar el registro global de citas.</div>
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-[#0D1B2A]/10 bg-white shadow-sm">
              <div className="hidden grid-cols-[160px_minmax(180px,1fr)_minmax(180px,1fr)_140px_150px] gap-3 border-b border-[#0D1B2A]/8 bg-[#F8F9FA] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.1em] text-[#5B6670] xl:grid">
                <span>Servicio</span><span>Cliente / mascota</span><span>Veterinario</span><span>Estado</span><span>Transacción</span>
              </div>
              <div className="divide-y divide-[#0D1B2A]/7">
                {result.data.results.map((appointment) => (
                  <div key={appointment.id} className="grid grid-cols-1 gap-3 px-5 py-5 text-xs xl:grid-cols-[160px_minmax(180px,1fr)_minmax(180px,1fr)_140px_150px] xl:items-center xl:gap-3">
                    <div>
                      <p className="font-semibold text-[#0D1B2A]">{appointment.serviceType}</p>
                      <p className="mt-1 text-[#5B6670]">{new Date(appointment.date).toLocaleDateString('es-CO')} · {appointment.time}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-[#0D1B2A]">{person(appointment.client.firstName, appointment.client.lastName, appointment.client.email)}</p>
                      <p className="mt-1 text-[#5B6670]">{appointment.pet.name} · {appointment.pet.species}</p>
                    </div>
                    <div><p className="font-semibold text-[#0D1B2A]">{person(appointment.vet.user.firstName, appointment.vet.user.lastName)}</p></div>
                    <span><span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] ${TONES[appointment.status]}`}>{LABELS[appointment.status]}</span></span>
                    <div className="text-[#5B6670]">
                      {appointment.transaction ? <><p className="font-semibold text-[#0D1B2A]">{appointment.transaction.status}</p><p className="mt-1">{appointment.transaction.paymentMethod}</p></> : <span>Sin transacción</span>}
                    </div>
                  </div>
                ))}
                {result.data.results.length === 0 && <div className="p-8 text-center text-sm text-[#5B6670]">No hay citas para este filtro.</div>}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between text-xs text-[#5B6670]">
              <span>{result.data.total ? `Mostrando ${offset + 1}–${offset + result.data.results.length} de ${result.data.total}` : 'Sin citas'}</span>
              <div className="flex gap-3 font-bold uppercase tracking-[0.08em] text-[#34B27A]">
                {offset > 0 && <Link href={`/nvetcareapp/dashboard/citas-admin?offset=${Math.max(0, offset - result.data.limit)}${status ? `&status=${status}` : ''}`}>← Anteriores</Link>}
                {result.data.hasMore && <Link href={`/nvetcareapp/dashboard/citas-admin?offset=${offset + result.data.limit}${status ? `&status=${status}` : ''}`}>Siguientes →</Link>}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
