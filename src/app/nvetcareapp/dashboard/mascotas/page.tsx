import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { fetchNvetPets } from '@/lib/nvetcareapp/client-booking';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { fetchNvetCurrentUser } from '@/lib/nvetcareapp/user';
import { PetManager } from './pet-manager';

export default async function NvetPetsPage() {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) redirect('/nvetcareapp/iniciar-sesion');

  const userResult = await fetchNvetCurrentUser(accessToken);
  if (!userResult.ok && userResult.status === 401) redirect('/nvetcareapp/iniciar-sesion');
  if (!userResult.ok || userResult.user.role !== 'CLIENT') redirect('/nvetcareapp/dashboard');

  const petsResult = await fetchNvetPets(accessToken);
  if (!petsResult.ok && petsResult.status === 401) redirect('/nvetcareapp/iniciar-sesion');

  return (
    <main className="min-h-screen bg-[#F2F4F7] px-4 py-8 pb-28 sm:px-6 sm:py-10 lg:px-8 lg:pb-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#34B27A]">Nvet Care · Salud conectada</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#0D1B2A] sm:text-3xl">Mis mascotas</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5B6670]">
              Construye el expediente base de tus mascotas desde ahora. Esta información queda lista para citas y seguimiento cuando haya profesionales verificados disponibles.
            </p>
          </div>
          <Link
            href="/nvetcareapp/dashboard/reservar"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0D1B2A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#16293D]"
          >
            Solicitar atención <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[#34B27A]/20 bg-[#34B27A]/[0.06] p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#237754]" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-[#0D1B2A]">Datos reales, sin profesionales ficticios</p>
            <p className="mt-1 text-xs leading-5 text-[#5B6670]">
              El registro de mascotas está disponible aunque todavía no exista oferta veterinaria activa. La plataforma solo mostrará profesionales cuando hayan sido incorporados y verificados.
            </p>
          </div>
        </div>

        {petsResult.ok ? (
          <PetManager initialPets={petsResult.data} />
        ) : (
          <div className="rounded-2xl border border-[#0D1B2A]/10 bg-white p-8 text-center">
            <h2 className="text-base font-bold text-[#0D1B2A]">No pudimos sincronizar tus mascotas</h2>
            <p className="mt-2 text-sm text-[#5B6670]">El servicio está temporalmente no disponible. Intenta nuevamente en unos minutos.</p>
          </div>
        )}
      </div>
    </main>
  );
}
