import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { fetchNvetCurrentUser } from '@/lib/nvetcareapp/user';

/**
 * Dedicated no-data landing for the canonical SUPERADMIN Vet Tester mode.
 * The dashboard template owns the sandbox UI. This page intentionally does
 * not load admin, client or veterinarian domain data, so the tester surface
 * remains isolated even at the server-read boundary.
 */
export default async function NvetVetTesterPage() {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) redirect('/nvetcareapp/iniciar-sesion');

  const userResult = await fetchNvetCurrentUser(accessToken);
  if (!userResult.ok && userResult.status === 401) {
    redirect('/nvetcareapp/iniciar-sesion');
  }
  if (!userResult.ok || !userResult.user.isSuperadmin || !userResult.user.isVetTesterMode) {
    redirect('/nvetcareapp/dashboard');
  }

  return null;
}
