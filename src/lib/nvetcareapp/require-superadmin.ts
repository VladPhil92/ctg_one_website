import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NVET_ACCESS_COOKIE } from './session';
import { fetchNvetCurrentUser, type NvetCurrentUser } from './user';

/**
 * Requires the canonical root to be operating in its real SUPERADMIN mode.
 * The root identity marker intentionally remains true while Modo usuario or
 * Vet Tester is active so the switch-back control can render; privileged
 * pages therefore reject both test modes before loading governance data.
 */
export async function requireNvetSuperadmin(): Promise<{
  accessToken: string;
  user: NvetCurrentUser;
}> {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) redirect('/nvetcareapp/iniciar-sesion');

  const userResult = await fetchNvetCurrentUser(accessToken);
  if (!userResult.ok && userResult.status === 401) {
    redirect('/nvetcareapp/iniciar-sesion');
  }

  if (!userResult.ok || !userResult.user.isSuperadmin) {
    redirect('/nvetcareapp/dashboard');
  }

  if (userResult.user.isClientMode) {
    redirect('/nvetcareapp/dashboard/citas');
  }

  if (userResult.user.isVetTesterMode) {
    redirect('/nvetcareapp/dashboard/vet-tester');
  }

  return { accessToken, user: userResult.user };
}
