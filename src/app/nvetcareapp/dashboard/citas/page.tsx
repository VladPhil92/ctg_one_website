import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { fetchNvetCurrentUser } from '@/lib/nvetcareapp/user';
import { fetchNvetAppointments } from '@/lib/nvetcareapp/appointments';
import { fetchNvetClientReviews, fetchNvetClientTransactions } from '@/lib/nvetcareapp/client-fulfillment';
import { ClientFulfillmentFlow } from './client-fulfillment-flow';

export default async function NvetClientFulfillmentPage() {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  if (!accessToken) redirect('/nvetcareapp/iniciar-sesion?next=/nvetcareapp/dashboard/citas');

  const userResult = await fetchNvetCurrentUser(accessToken);
  if (!userResult.ok && userResult.status === 401) {
    redirect('/nvetcareapp/iniciar-sesion?next=/nvetcareapp/dashboard/citas');
  }
  if (!userResult.ok || userResult.user.role !== 'CLIENT') {
    redirect('/nvetcareapp/dashboard');
  }

  const [appointmentsResult, transactionsResult, reviewsResult] = await Promise.all([
    fetchNvetAppointments(accessToken),
    fetchNvetClientTransactions(accessToken),
    fetchNvetClientReviews(accessToken),
  ]);

  if (!appointmentsResult.ok) {
    if (appointmentsResult.status === 401) redirect('/nvetcareapp/iniciar-sesion?next=/nvetcareapp/dashboard/citas');
    return (
      <main className="min-h-screen bg-[#F2F4F7] px-4 py-10 sm:px-8">
        <div className="mx-auto max-w-5xl rounded-2xl border border-[#0D1B2A]/10 bg-white p-8 text-center text-sm text-[#0D1B2A]">
          No se pudieron cargar tus citas en este momento.
        </div>
      </main>
    );
  }

  return (
    <ClientFulfillmentFlow
      initialAppointments={appointmentsResult.appointments}
      initialTransactions={transactionsResult.ok ? transactionsResult.transactions : []}
      initialReviews={reviewsResult.ok ? reviewsResult.reviews : []}
      paymentsAvailable={transactionsResult.ok}
      reviewsAvailable={reviewsResult.ok}
    />
  );
}
