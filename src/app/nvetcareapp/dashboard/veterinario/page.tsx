import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { fetchNvetCurrentUser } from '@/lib/nvetcareapp/user';
import { fetchNvetAppointments } from '@/lib/nvetcareapp/appointments';
import {
  fetchNvetScheduleExceptions,
  fetchNvetVetEarnings,
  fetchNvetVetPrices,
  fetchNvetVetProfile,
} from '@/lib/nvetcareapp/vet-dashboard';
import { VetWorkspace } from '../vet-workspace';

function isoDateOffset(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export default async function NvetVeterinarianWorkspacePage() {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) redirect('/nvetcareapp/iniciar-sesion');

  const userResult = await fetchNvetCurrentUser(accessToken);
  if (!userResult.ok && userResult.status === 401) {
    redirect('/nvetcareapp/iniciar-sesion');
  }
  if (!userResult.ok || userResult.user.role !== 'VET') {
    redirect('/nvetcareapp/dashboard');
  }

  const [appointmentsResult, profileResult, earningsResult, pricesResult, exceptionsResult] = await Promise.all([
    fetchNvetAppointments(accessToken),
    fetchNvetVetProfile(accessToken),
    fetchNvetVetEarnings(accessToken),
    fetchNvetVetPrices(accessToken),
    fetchNvetScheduleExceptions(accessToken, isoDateOffset(0), isoDateOffset(90)),
  ]);

  const authenticationExpired = [appointmentsResult, profileResult, earningsResult, pricesResult, exceptionsResult]
    .some((result) => !result.ok && result.status === 401);
  if (authenticationExpired) redirect('/nvetcareapp/iniciar-sesion');

  return (
    <VetWorkspace
      currentUserId={userResult.user.id}
      firstName={userResult.user.firstName || 'Veterinario'}
      appointments={appointmentsResult.ok ? appointmentsResult.appointments : []}
      profile={profileResult.ok ? profileResult.data : null}
      earnings={earningsResult.ok ? earningsResult.data : null}
      prices={pricesResult.ok ? pricesResult.data : []}
      scheduleExceptions={exceptionsResult.ok ? exceptionsResult.data : []}
      profileAvailable={profileResult.ok}
      earningsAvailable={earningsResult.ok}
    />
  );
}
