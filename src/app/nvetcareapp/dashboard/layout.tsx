import Link from 'next/link';
import { cookies } from 'next/headers';
import { CalendarPlus } from 'lucide-react';
import { NVET_ACCESS_COOKIE } from '@/lib/nvetcareapp/session';
import { fetchNvetCurrentUser } from '@/lib/nvetcareapp/user';

export default async function NvetDashboardLayout({ children }: { children: React.ReactNode }) {
  const accessToken = (await cookies()).get(NVET_ACCESS_COOKIE)?.value;
  let showClientBooking = false;

  if (accessToken) {
    const userResult = await fetchNvetCurrentUser(accessToken);
    showClientBooking = userResult.ok && userResult.user.role === 'CLIENT';
  }

  return (
    <>
      {children}
      {showClientBooking && (
        <Link
          href="/nvetcareapp/dashboard/reservar"
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-[#34B27A] px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#289463] focus:outline-none focus:ring-2 focus:ring-[#34B27A] focus:ring-offset-2"
        >
          <CalendarPlus className="h-4 w-4" />
          Agendar cita
        </Link>
      )}
    </>
  );
}
