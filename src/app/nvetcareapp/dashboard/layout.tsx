import Link from 'next/link';
import { cookies } from 'next/headers';
import { CalendarPlus, ReceiptText } from 'lucide-react';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { fetchNvetCurrentUser } from '@/lib/nvetcareapp/user';

export default async function NvetDashboardLayout({ children }: { children: React.ReactNode }) {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  let showClientActions = false;

  if (accessToken) {
    const userResult = await fetchNvetCurrentUser(accessToken);
    showClientActions = userResult.ok && userResult.user.role === 'CLIENT';
  }

  return (
    <>
      {children}
      {showClientActions && (
        <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2 sm:flex-row">
          <Link
            href="/nvetcareapp/dashboard/citas"
            className="inline-flex items-center gap-2 rounded-full border border-[#0D1B2A]/10 bg-white px-5 py-3 text-sm font-semibold text-[#0D1B2A] shadow-lg transition hover:border-[#34B27A]/30 hover:text-[#289463] focus:outline-none focus:ring-2 focus:ring-[#34B27A] focus:ring-offset-2"
          >
            <ReceiptText className="h-4 w-4" />
            Pagos y citas
          </Link>
          <Link
            href="/nvetcareapp/dashboard/reservar"
            className="inline-flex items-center gap-2 rounded-full bg-[#34B27A] px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#289463] focus:outline-none focus:ring-2 focus:ring-[#34B27A] focus:ring-offset-2"
          >
            <CalendarPlus className="h-4 w-4" />
            Agendar cita
          </Link>
        </div>
      )}
    </>
  );
}
