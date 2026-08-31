import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { fetchNvetCurrentUser } from '@/lib/nvetcareapp/user';
import { fetchNvetAppointments } from '@/lib/nvetcareapp/appointments';
import { fetchNvetVetTransactions } from '@/lib/nvetcareapp/vet-operations';
import { VetServiceOperations } from './vet-service-operations';

export default async function NvetVetServicesPage() {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) redirect('/nvetcareapp/iniciar-sesion?next=/nvetcareapp/dashboard/servicios');

  const userResult = await fetchNvetCurrentUser(accessToken);
  if (!userResult.ok && userResult.status === 401) {
    redirect('/nvetcareapp/iniciar-sesion?next=/nvetcareapp/dashboard/servicios');
  }
  if (!userResult.ok || userResult.user.role !== 'VET') {
    redirect('/nvetcareapp/dashboard');
  }

  const [appointmentsResult, transactionsResult] = await Promise.all([
    fetchNvetAppointments(accessToken),
    fetchNvetVetTransactions(accessToken),
  ]);

  if (!appointmentsResult.ok && appointmentsResult.status === 401) {
    redirect('/nvetcareapp/iniciar-sesion?next=/nvetcareapp/dashboard/servicios');
  }
  if (!transactionsResult.ok && transactionsResult.status === 401) {
    redirect('/nvetcareapp/iniciar-sesion?next=/nvetcareapp/dashboard/servicios');
  }

  return (
    <VetServiceOperations
      firstName={userResult.user.firstName}
      initialAppointments={appointmentsResult.ok ? appointmentsResult.appointments : []}
      initialTransactions={transactionsResult.ok ? transactionsResult.data : []}
      appointmentsAvailable={appointmentsResult.ok}
      paymentsAvailable={transactionsResult.ok}
    />
  );
}
