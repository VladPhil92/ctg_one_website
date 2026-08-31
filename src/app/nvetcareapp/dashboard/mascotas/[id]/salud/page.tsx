import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, FileClock, ShieldCheck } from 'lucide-react';
import { fetchNvetPets } from '@/lib/nvetcareapp/client-booking';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { fetchNvetCurrentUser } from '@/lib/nvetcareapp/user';
import { PetHealthRecordManager } from './pet-health-record-manager';

export default async function NvetPetHealthPage({ params }: { params: Promise<{ id: string }> }) {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  const { id } = await params;
  const next = `/nvetcareapp/dashboard/mascotas/${encodeURIComponent(id)}/salud`;
  if (!accessToken) redirect(`/nvetcareapp/iniciar-sesion?next=${encodeURIComponent(next)}`);

  const userResult = await fetchNvetCurrentUser(accessToken);
  if (!userResult.ok && userResult.status === 401) {
    redirect(`/nvetcareapp/iniciar-sesion?next=${encodeURIComponent(next)}`);
  }
  if (!userResult.ok || userResult.user.role !== 'CLIENT') redirect('/nvetcareapp/dashboard');

  const petsResult = await fetchNvetPets(accessToken);
  if (!petsResult.ok && petsResult.status === 401) {
    redirect(`/nvetcareapp/iniciar-sesion?next=${encodeURIComponent(next)}`);
  }
  if (!petsResult.ok) {
    return (
      <main className="min-h-screen bg-[#F2F4F7] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl rounded-3xl border border-[#0D1B2A]/10 bg-white p-8 text-center">
          <h1 className="text-lg font-bold text-[#0D1B2A]">No pudimos sincronizar el expediente de salud</h1>
          <p className="mt-2 text-sm text-[#5B6670]">Nvet Care no sustituirá los datos reales por información simulada.</p>
        </div>
      </main>
    );
  }

  const pet = petsResult.data.find((candidate) => candidate.id === id);
  if (!pet) notFound();

  return (
    <main className="min-h-screen bg-[#F2F4F7] px-4 py-8 pb-28 sm:px-6 sm:py-10 lg:px-8 lg:pb-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/nvetcareapp/dashboard/mascotas" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#237754] hover:text-[#1B6144]">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Mis mascotas
            </Link>
            <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#34B27A]">Nvet Care · Salud longitudinal</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#0D1B2A] sm:text-3xl">Salud preventiva · {pet.name}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5B6670]">
              Mantén un registro estructurado de prevención y antecedentes conocidos para que futuras atenciones comiencen con mejor contexto.
            </p>
          </div>
          <Link
            href="/nvetcareapp/dashboard/historial"
            className="inline-flex items-center gap-2 rounded-xl border border-[#0D1B2A]/10 bg-white px-4 py-2.5 text-sm font-semibold text-[#0D1B2A] transition hover:border-[#34B27A]/30 hover:text-[#237754]"
          >
            <FileClock className="h-4 w-4" aria-hidden="true" /> Historial clínico
          </Link>
        </div>

        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[#34B27A]/20 bg-[#34B27A]/[0.06] p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#237754]" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-[#0D1B2A]">Dos fuentes, una sola historia de salud</p>
            <p className="mt-1 text-xs leading-5 text-[#5B6670]">
              Esta ficha preventiva contiene información reportada por ti. El módulo Historial clínico conserva por separado diagnósticos y tratamientos documentados durante servicios veterinarios completados.
            </p>
          </div>
        </div>

        <PetHealthRecordManager pet={pet} />
      </div>
    </main>
  );
}
