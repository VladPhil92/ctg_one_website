import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ShieldCheck, UserRound } from 'lucide-react';
import { fetchNvetClientProfile, fetchNvetUserSessions } from '@/lib/nvetcareapp/profile';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { fetchNvetCurrentUser } from '@/lib/nvetcareapp/user';
import { ProfileAccountCenter } from './profile-account-center';

const PROFILE_PATH = '/nvetcareapp/dashboard/perfil';

export default async function NvetClientProfilePage() {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) {
    redirect(`/nvetcareapp/iniciar-sesion?next=${PROFILE_PATH}`);
  }

  const userResult = await fetchNvetCurrentUser(accessToken);
  if (!userResult.ok && userResult.status === 401) {
    redirect(`/nvetcareapp/iniciar-sesion?next=${PROFILE_PATH}`);
  }
  if (!userResult.ok || userResult.user.role !== 'CLIENT') {
    redirect('/nvetcareapp/dashboard');
  }

  const [profileResult, sessionsResult] = await Promise.all([
    fetchNvetClientProfile(accessToken),
    fetchNvetUserSessions(accessToken),
  ]);

  if (!profileResult.ok && profileResult.status === 401) {
    redirect(`/nvetcareapp/iniciar-sesion?next=${PROFILE_PATH}`);
  }

  return (
    <main className="min-h-screen bg-[#F2F4F7] px-4 py-8 pb-28 sm:px-6 sm:py-10 lg:px-8 lg:pb-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-7">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#34B27A]">
            Nvet Care · Account Center
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#0D1B2A] sm:text-3xl">
            Perfil y cuenta
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5B6670]">
            Administra tus datos de contacto Nvet y revisa el estado de seguridad de tu cuenta sin crear una identidad paralela a CTG One.
          </p>
        </div>

        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[#34B27A]/20 bg-[#34B27A]/[0.06] p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#237754]" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-[#0D1B2A]">Una identidad, un alcance claro</p>
            <p className="mt-1 text-xs leading-5 text-[#5B6670]">
              Tu correo e identidad de acceso son de solo lectura en esta superficie. Aquí solo se modifican nombre, apellido y teléfono del perfil Nvet. Las notificaciones in-app están activas; correo y push no se presentan como canales desplegados todavía.
            </p>
          </div>
        </div>

        {!profileResult.ok ? (
          <section className="rounded-3xl border border-[#0D1B2A]/10 bg-white p-8 text-center">
            <UserRound className="mx-auto h-7 w-7 text-[#5B6670]" aria-hidden="true" />
            <h2 className="mt-3 text-base font-bold text-[#0D1B2A]">No pudimos sincronizar tu perfil</h2>
            <p className="mt-2 text-sm leading-6 text-[#5B6670]">
              El servicio de cuenta está temporalmente no disponible. No sustituimos tu identidad real por datos locales o simulados.
            </p>
          </section>
        ) : (
          <>
            {!sessionsResult.ok && (
              <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
                Tu perfil está disponible, pero no pudimos sincronizar la lista de sesiones activas en este momento.
              </div>
            )}
            <ProfileAccountCenter
              initialProfile={profileResult.data}
              initialSessions={sessionsResult.ok ? sessionsResult.data : []}
            />
          </>
        )}
      </div>
    </main>
  );
}
