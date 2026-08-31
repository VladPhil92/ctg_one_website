import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { fetchNvetAppointments } from '@/lib/nvetcareapp/appointments';
import { searchNvetVets } from '@/lib/nvetcareapp/client-booking';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { fetchNvetCurrentUser } from '@/lib/nvetcareapp/user';
import { fetchNvetVetTransactions } from '@/lib/nvetcareapp/vet-operations';
import { ClientServicesMarketplace } from './client-services-marketplace';
import { VetServiceOperations } from './vet-service-operations';

export default async function NvetServicesPage() {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) redirect('/nvetcareapp/iniciar-sesion?next=/nvetcareapp/dashboard/servicios');

  const userResult = await fetchNvetCurrentUser(accessToken);
  if (!userResult.ok && userResult.status === 401) {
    redirect('/nvetcareapp/iniciar-sesion?next=/nvetcareapp/dashboard/servicios');
  }
  if (!userResult.ok) redirect('/nvetcareapp/dashboard');

  if (userResult.user.role === 'CLIENT') {
    const marketplaceResult = await searchNvetVets(
      new URLSearchParams({ limit: '20', offset: '0', sortBy: 'rating' }),
    );

    return (
      <ClientServicesMarketplace
        initialVets={marketplaceResult.ok ? marketplaceResult.data.results : []}
        marketplaceAvailable={marketplaceResult.ok}
      />
    );
  }

  if (userResult.user.role !== 'VET') redirect('/nvetcareapp/dashboard');

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
