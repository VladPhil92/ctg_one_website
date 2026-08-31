import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { fetchNvetCurrentUser } from '@/lib/nvetcareapp/user';
import { ClientBookingFlow } from './client-booking-flow';

export default async function NvetClientBookingPage() {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) redirect('/nvetcareapp/iniciar-sesion?next=/nvetcareapp/dashboard/reservar');

  const userResult = await fetchNvetCurrentUser(accessToken);
  if (!userResult.ok && userResult.status === 401) {
    redirect('/nvetcareapp/iniciar-sesion?next=/nvetcareapp/dashboard/reservar');
  }
  if (!userResult.ok || userResult.user.role !== 'CLIENT') {
    redirect('/nvetcareapp/dashboard');
  }

  return <ClientBookingFlow firstName={userResult.user.firstName} />;
}
