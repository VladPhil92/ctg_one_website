import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { fetchNvetCurrentUser } from '@/lib/nvetcareapp/user';
import { ClientBookingFlow } from './client-booking-flow';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function NvetClientBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ vetId?: string }>;
}) {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) redirect('/nvetcareapp/iniciar-sesion?next=/nvetcareapp/dashboard/reservar');

  const userResult = await fetchNvetCurrentUser(accessToken);
  if (!userResult.ok && userResult.status === 401) {
    redirect('/nvetcareapp/iniciar-sesion?next=/nvetcareapp/dashboard/reservar');
  }
  if (!userResult.ok || userResult.user.role !== 'CLIENT') {
    redirect('/nvetcareapp/dashboard');
  }

  const { vetId } = await searchParams;
  const initialVetId = vetId && UUID.test(vetId) ? vetId : undefined;

  return <ClientBookingFlow firstName={userResult.user.firstName} initialVetId={initialVetId} />;
}
