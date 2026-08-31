import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NVET_ACCESS_COOKIE } from './session';
import { fetchNvetCurrentUser, type NvetCurrentUser } from './user';

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

  return { accessToken, user: userResult.user };
}
